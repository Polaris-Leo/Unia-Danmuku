import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'history');
const GAP_THRESHOLD = 15 * 60; // 15 minutes in seconds

/**
 * 修复所有历史会话
 * 扫描所有场次，如果发现消息之间间隔超过15分钟，则将其拆分为新的场次
 */
export async function repairAllSessions() {
    console.log('🔧 开始检查并修复历史直播场次...');
    if (!fs.existsSync(DATA_DIR)) return;

    const rooms = fs.readdirSync(DATA_DIR);
    for (const roomId of rooms) {
        const roomDir = path.join(DATA_DIR, roomId);
        if (!fs.statSync(roomDir).isDirectory()) continue;

        // 获取所有场次，按时间正序排列
        let sessions = fs.readdirSync(roomDir)
            .filter(f => /^\d+$/.test(f) && fs.statSync(path.join(roomDir, f)).isDirectory())
            .map(Number)
            .sort((a, b) => a - b);

        for (let i = 0; i < sessions.length; i++) {
            const sessionId = sessions[i];
            const newSessionId = await checkAndSplitSession(roomId, sessionId);
            
            if (newSessionId) {
                console.log(`   ✂️  [${roomId}] 场次 ${sessionId} 已拆分出新场次 ${newSessionId}`);
                
                // 将新场次插入到待检查列表中，以防新场次中还有断层
                // 找到插入位置
                let insertIdx = i + 1;
                while(insertIdx < sessions.length && sessions[insertIdx] < newSessionId) {
                    insertIdx++;
                }
                // 如果新场次ID已经存在于列表中（合并情况），则不需要插入，但需要确保它被处理
                if (!sessions.includes(newSessionId)) {
                    sessions.splice(insertIdx, 0, newSessionId);
                }
            }
        }
    }
    console.log('✅ 历史场次修复完成');
}

/**
 * 检查并拆分单个会话
 */
async function checkAndSplitSession(roomId, sessionId) {
    const sessionDir = path.join(DATA_DIR, String(roomId), String(sessionId));
    const files = ['danmaku.jsonl', 'gift.jsonl', 'guard.jsonl', 'superchat.jsonl'];
    
    let allData = [];
    
    // 1. 加载所有数据
    for (const file of files) {
        const filePath = path.join(sessionDir, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim());
            lines.forEach(line => {
                try {
                    const item = JSON.parse(line);
                    // 归一化时间戳
                    let ts = item.timestamp || item.time;
                    if (!ts) return;
                    ts = Number(ts);
                    // 如果是毫秒，转换为秒
                    if (ts > 10000000000) ts = Math.floor(ts / 1000);
                    
                    allData.push({
                        ...item,
                        _ts: ts,
                        _file: file,
                        _raw: line
                    });
                } catch (e) {}
            });
        }
    }

    if (allData.length === 0) return null;

    // 2. 按时间排序
    allData.sort((a, b) => a._ts - b._ts);

    // 3. 寻找断层
    let splitIndex = -1;
    for (let i = 0; i < allData.length - 1; i++) {
        const curr = allData[i];
        const next = allData[i+1];
        
        if (next._ts - curr._ts > GAP_THRESHOLD) {
            splitIndex = i + 1;
            break; // 只处理第一个断层，后续的通过递归/循环处理
        }
    }

    if (splitIndex === -1) return null;

    // 4. 执行拆分
    const keepData = allData.slice(0, splitIndex);
    const moveData = allData.slice(splitIndex);
    
    const newSessionId = moveData[0]._ts; // 使用第一条移动消息的时间戳作为新场次ID
    const newSessionDir = path.join(DATA_DIR, String(roomId), String(newSessionId));

    if (!fs.existsSync(newSessionDir)) {
        fs.mkdirSync(newSessionDir, { recursive: true });
    }

    // 5. 写入移动的数据
    // 按文件类型分组
    const moveGroups = {};
    moveData.forEach(item => {
        if (!moveGroups[item._file]) moveGroups[item._file] = [];
        moveGroups[item._file].push(item._raw);
    });

    for (const [file, lines] of Object.entries(moveGroups)) {
        const filePath = path.join(newSessionDir, file);
        // 追加模式，以防目标文件夹已存在且有数据
        fs.appendFileSync(filePath, lines.join('\n') + '\n');
    }

    // 6. 重写原始文件
    const keepGroups = {};
    keepData.forEach(item => {
        if (!keepGroups[item._file]) keepGroups[item._file] = [];
        keepGroups[item._file].push(item._raw);
    });

    // 清空并重写
    for (const file of files) {
        const filePath = path.join(sessionDir, file);
        if (fs.existsSync(filePath)) {
            if (keepGroups[file]) {
                fs.writeFileSync(filePath, keepGroups[file].join('\n') + '\n');
            } else {
                // 如果该文件没有保留数据，则删除
                fs.unlinkSync(filePath);
            }
        }
    }
    
    return newSessionId;
}