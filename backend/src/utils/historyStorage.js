import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DATA_DIR = path.join(process.cwd(), 'data', 'history');
const fileLocks = new Map();

function withFileLock(filePath, operation) {
  const previous = fileLocks.get(filePath) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  const pending = current.then(
    () => {
      if (fileLocks.get(filePath) === pending) fileLocks.delete(filePath);
    },
    () => {
      if (fileLocks.get(filePath) === pending) fileLocks.delete(filePath);
    }
  );
  fileLocks.set(filePath, pending);
  return current;
}

async function withFileLocks(filePaths, operation) {
  const paths = [...new Set(filePaths)].sort();
  const acquire = async (index) => {
    if (index === paths.length) return operation();
    return withFileLock(paths[index], () => acquire(index + 1));
  };
  return acquire(0);
}

async function atomicWriteFile(filePath, content) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    await fs.promises.writeFile(tempPath, content, 'utf8');
    await fs.promises.rename(tempPath, filePath);
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}


/**
 * 选择最近的 N 场会话，按会话时间戳降序排列。
 */
export function selectRecentSessions(sessionIds, limit) {
  return [...sessionIds]
    .sort((a, b) => Number(b) - Number(a))
    .slice(0, limit);
}

/**
 * 判断历史数据文件是否晚于整理标记。
 */
export function shouldOrganizeSession({ fileMtimeMs, markerMtimeMs }) {
  return Number(fileMtimeMs) > Number(markerMtimeMs);
}

/**
 * 按闭区间筛选时间戳场次。
 */
export function selectSessionsInRange(sessionIds, start, end) {
  return sessionIds.filter((sessionId) => sessionId >= start && sessionId <= end);
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 获取会话目录
 */
function getSessionDir(roomId, sessionId) {
  return path.join(DATA_DIR, String(roomId), String(sessionId));
}

/**
 * 获取指定房间的所有历史会话列表
 * @param {string|number} roomId 
 * @returns {Promise<Array>} 会话ID(时间戳)列表，按时间倒序排列
 */
export async function getSessions(roomId) {
  const roomDir = path.join(DATA_DIR, String(roomId));
  if (!fs.existsSync(roomDir)) {
    return [];
  }

  try {
    const files = await fs.promises.readdir(roomDir);
    // 过滤出数字命名的文件夹（时间戳）
    const sessions = files
      .filter(file => /^\d+$/.test(file) && fs.statSync(path.join(roomDir, file)).isDirectory())
      .map(file => parseInt(file, 10))
      .sort((a, b) => b - a); // 倒序排列

    return sessions;
  } catch (error) {
    console.error(`[History] Failed to get sessions for room ${roomId}:`, error);
    return [];
  }
}

/**
 * 保存消息到历史记录 (追加模式)
 * @param {string|number} roomId 直播间ID
 * @param {string|number} sessionId 会话ID (通常是开播时间戳)
 * @param {string} type 消息类型 (danmaku, superchat, gift, guard)
 * @param {object} data 消息数据
 */
export function saveMessage(roomId, sessionId, type, data, historyDir = DATA_DIR) {
  if (!roomId || !sessionId) return Promise.resolve();

  const sessionDir = path.join(historyDir, String(roomId), String(sessionId));
  ensureDir(sessionDir);

  const filePath = path.join(sessionDir, `${type}.jsonl`);
  const line = JSON.stringify(data) + '\n';

  return withFileLock(filePath, () => fs.promises.appendFile(filePath, line)).catch((err) => {
    console.error(`[History] Failed to save ${type} message:`, err);
  });
}

/**
 * 保存直播场次指标快照
 */
export function saveMetricSnapshot(roomId, sessionId, snapshot) {
  saveMessage(roomId, sessionId, 'metrics', snapshot);
}

/**
 * 加载直播场次指标快照
 */
export async function loadMetricSnapshots(roomId, sessionId) {
  if (!roomId || !sessionId) return [];

  const filePath = path.join(getSessionDir(roomId, sessionId), 'metrics.jsonl');
  if (!fs.existsSync(filePath)) return [];

  const snapshots = [];
  const seen = new Set();

  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const item = JSON.parse(line);
        const fingerprint = [
          item.ts,
          item.liveStatus,
          item.guardCount,
          item.fansClubCount,
          item.followerCount,
          item.rankCount,
          item.watchedCount,
          item.durationSec
        ].join('-');

        if (!seen.has(fingerprint)) {
          seen.add(fingerprint);
          snapshots.push(item);
        }
      } catch (error) {
        // Ignore malformed JSONL lines
      }
    }
  } catch (error) {
    console.error(`[History] Failed to load metric snapshots:`, error);
  }

  return snapshots.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
}

/**
 * 汇总直播场次指标
 */
export function summarizeMetricSnapshots(snapshots) {
  const buildMetricSummary = (key) => {
    const values = snapshots
      .map((item) => Number(item[key]))
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return { start: null, end: null, min: null, max: null, delta: null };
    }

    return {
      start: values[0],
      end: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      delta: values[values.length - 1] - values[0]
    };
  };

  const firstPoint = snapshots[0] || null;
  const lastPoint = snapshots[snapshots.length - 1] || null;

  return {
    startedAt: firstPoint?.ts || null,
    endedAt: lastPoint?.ts || null,
    durationSecMax: buildMetricSummary('durationSec').max,
    guardCount: buildMetricSummary('guardCount'),
    fansClubCount: buildMetricSummary('fansClubCount'),
    followerCount: buildMetricSummary('followerCount'),
    rankCount: buildMetricSummary('rankCount'),
    watchedCount: buildMetricSummary('watchedCount'),
    durationSec: buildMetricSummary('durationSec')
  };
}

/**
 * 加载会话历史记录
 * @param {string|number} roomId 直播间ID
 * @param {string|number} sessionId 会话ID
 * @returns {Promise<object>} 包含各类消息数组的对象
 */
export async function loadHistory(roomId, sessionId) {
  if (!roomId || !sessionId) return null;

  const sessionDir = getSessionDir(roomId, sessionId);
  if (!fs.existsSync(sessionDir)) return null;

  const history = {
    danmaku: [],
    superchat: [],
    gift: [],
    guard: []
  };

  const types = ['danmaku', 'superchat', 'gift', 'guard'];

  await Promise.all(types.map(async (type) => {
    const filePath = path.join(sessionDir, `${type}.jsonl`);
    if (fs.existsSync(filePath)) {
      try {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });

        const seen = new Set();

        for await (const line of rl) {
          if (line.trim()) {
            try {
              const item = JSON.parse(line);
              
              // 生成唯一指纹用于去重
              let fingerprint = '';
              if (type === 'danmaku') {
                // 弹幕：时间戳 + 用户UID + 内容
                fingerprint = `${item.timestamp}-${item.user?.uid}-${item.content}`;
              } else if (type === 'gift') {
                // 礼物：时间戳 + 用户UID + 礼物ID + 数量 + 价格
                fingerprint = `${item.timestamp}-${item.user?.uid}-${item.giftId}-${item.num}-${item.price}`;
              } else if (type === 'superchat') {
                // SC：时间 + 用户UID + 价格
                fingerprint = `${item.time}-${item.user?.uid}-${item.price}`;
              } else if (type === 'guard') {
                // 上舰：时间戳 + 用户UID + 等级
                fingerprint = `${item.timestamp}-${item.user?.uid}-${item.guardLevel}`;
              } else {
                // 其他：直接序列化
                fingerprint = JSON.stringify(item);
              }

              if (!seen.has(fingerprint)) {
                seen.add(fingerprint);
                history[type].push(item);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      } catch (err) {
        console.error(`[History] Failed to load ${type} history:`, err);
      }
    }
  }));

  return history;
}

/**
 * 获取最新的会话ID
 */
export async function getLastSessionId(roomId) {
  const sessions = await getSessions(roomId);
  return sessions.length > 0 ? sessions[0] : null;
}

/**
 * 移动误入上一场会话的数据到当前会话
 * @param {string|number} roomId 房间号
 * @param {string|number} oldSessionId 上一场会话ID
 * @param {string|number} newSessionId 当前会话ID (作为时间戳阈值)
 */
export async function moveStrayData(roomId, oldSessionId, newSessionId, historyDir = DATA_DIR, requestedFiles = null) {
  if (!oldSessionId || !newSessionId || oldSessionId === newSessionId) return;

  const oldDir = path.join(historyDir, String(roomId), String(oldSessionId));
  const newDir = path.join(historyDir, String(roomId), String(newSessionId));
  
  if (!fs.existsSync(oldDir)) return;
  ensureDir(newDir);

  const files = requestedFiles || ['danmaku.jsonl', 'gift.jsonl', 'guard.jsonl', 'superchat.jsonl', 'metrics.jsonl'];
  let movedCount = 0;
  for (const file of files) {
    const oldFilePath = path.join(oldDir, file);
    const newFilePath = path.join(newDir, file);
    
    if (!fs.existsSync(oldFilePath)) continue;

    try {
      await withFileLocks([oldFilePath, newFilePath], async () => {
        const content = await fs.promises.readFile(oldFilePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      const keepLines = [];
      const moveLines = [];
      const moveItems = [];

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          // 兼容不同类型的 timestamp 字段
          const ts = Number(item.ts || item.timestamp || item.time || 0);
          // 归一化为秒 (如果是毫秒则转换)
          const normalizedTs = ts > 10000000000 ? Math.floor(ts / 1000) : ts;
          const threshold = Number(newSessionId);
          const normalizedThreshold = threshold > 10000000000 ? Math.floor(threshold / 1000) : threshold;

          if (normalizedTs >= normalizedThreshold) {
            moveLines.push(line);
            moveItems.push(item);
          } else {
            keepLines.push(line);
          }
        } catch (e) {
          keepLines.push(line); // 解析失败的保留
        }
      }

      if (moveLines.length > 0) {
        // 1. 重写旧文件
        await atomicWriteFile(oldFilePath, keepLines.join('\n') + (keepLines.length > 0 ? '\n' : ''));
        
        // 2. 读取新文件现有内容 (如果存在)
        let existingItems = [];
        if (fs.existsSync(newFilePath)) {
          const newContent = await fs.promises.readFile(newFilePath, 'utf-8');
          const newLines = newContent.split('\n').filter(l => l.trim());
          existingItems = newLines.map(l => {
             try { return JSON.parse(l); } catch(e) { return null; }
          }).filter(Boolean);
        }

        // 3. 合并并排序
        const allItems = [...existingItems, ...moveItems].sort((a, b) => {
           const tsA = Number(a.ts || a.timestamp || a.time || 0);
           const tsB = Number(b.ts || b.timestamp || b.time || 0);
           return tsA - tsB;
        });

        // 4. 写入新文件
        const newContent = allItems.map(item => JSON.stringify(item)).join('\n') + '\n';
        await atomicWriteFile(newFilePath, newContent);
        
        movedCount += moveLines.length;
        console.log(`[History] Moved ${moveLines.length} items from ${oldSessionId} to ${newSessionId} in ${file}`);
      }
      });
    } catch (error) {
      console.error(`[History] Failed to move data for ${file}:`, error);
    }
  }
  
  if (movedCount > 0) {
    console.log(`✅ 成功从 ${oldSessionId} 迁移了 ${movedCount} 条数据到 ${newSessionId}`);
  }
}

/**
 * 对指定会话的所有数据文件进行按时间戳排序
 */
export async function sortSessionFiles(roomId, sessionId) {
  await sortSessionFilesIn(DATA_DIR, roomId, sessionId);
}

/**
 * 修复所有重叠的会话数据
 * 遍历所有场次，将属于下一场（或更晚）的数据移动到正确的文件夹
 */
export async function repairOverlappingSessions() {
    console.log('🔧 开始检查并修复重叠的直播场次...');
    if (!fs.existsSync(DATA_DIR)) return;

    try {
        const rooms = await fs.promises.readdir(DATA_DIR);
        for (const roomId of rooms) {
            const roomDir = path.join(DATA_DIR, roomId);
            const stats = await fs.promises.stat(roomDir);
            if (!stats.isDirectory()) continue;

            // 获取所有场次ID，按时间正序排列
            const sessions = (await fs.promises.readdir(roomDir))
                .filter(f => /^\d+$/.test(f))
                .map(Number)
                .sort((a, b) => a - b);

            // 遍历每一对相邻的场次
            for (let i = 0; i < sessions.length - 1; i++) {
                const currentSession = sessions[i];
                const nextSession = sessions[i + 1];
                
                // 将 currentSession 中所有时间戳 >= nextSession 的数据移动到 nextSession
                await moveStrayData(roomId, currentSession, nextSession);
            }
        }
        console.log('✅ 重叠场次修复完成');
    } catch (error) {
        console.error('修复重叠场次失败:', error);
    }
}

export function validateHistoryOrganizeRequest(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, message: 'request body must be an object' };
  }

  const required = ['roomId', 'startTime', 'endTime'];
  if (required.some((field) => body[field] === undefined || body[field] === null || body[field] === '')) {
    return { valid: false, message: 'roomId, startTime and endTime are required' };
  }

  const parseInteger = (value) => {
    if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
    if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)) {
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) ? parsed : null;
    }
    return null;
  };
  const values = Object.fromEntries(required.map((field) => [field, parseInteger(body[field])]));
  if (Object.values(values).some((value) => value === null)) {
    return { valid: false, message: 'roomId, startTime and endTime must be non-negative integers' };
  }
  if (values.startTime > values.endTime) {
    return { valid: false, message: 'startTime must not be greater than endTime' };
  }

  return { valid: true, ...values };
}

export async function organizeHistory(options = {}) {
  const historyDir = options.historyDir || DATA_DIR;
  const roomFilter = options.roomId == null ? null : String(options.roomId);
  const hasExplicitRange = options.startTime != null || options.endTime != null;
  const recentLimit = options.recentLimit === null
    ? null
    : Number(options.recentLimit ?? options.roomLimit ?? (hasExplicitRange ? null : 5));
  const force = options.force === true;
  const startTime = options.startTime == null ? null : Number(options.startTime);
  const endTime = options.endTime == null ? null : Number(options.endTime);
  const stats = { roomsProcessed: 0, sessionsConsidered: 0, sessionsProcessed: 0, sessionsMigrated: 0, sessionsSkippedUnchanged: 0 };
  if ((recentLimit !== null && (!Number.isFinite(recentLimit) || recentLimit <= 0)) || !fs.existsSync(historyDir)) return stats;

  const roomEntries = await fs.promises.readdir(historyDir, { withFileTypes: true });
  for (const roomEntry of roomEntries) {
    if (!roomEntry.isDirectory() || (roomFilter != null && roomEntry.name !== roomFilter)) continue;
    const roomId = roomEntry.name;
    const roomDir = path.join(historyDir, roomId);
    let sessions = (await fs.promises.readdir(roomDir, { withFileTypes: true }))
      .filter(entry => entry.isDirectory() && /^\d+$/.test(entry.name))
      .map(entry => Number(entry.name)).sort((a, b) => b - a)
      .filter(sessionId => (startTime == null || sessionId >= startTime) && (endTime == null || sessionId <= endTime));
    if (recentLimit !== null) sessions = sessions.slice(0, recentLimit);
    if (sessions.length === 0) continue;

    stats.roomsProcessed += 1;
    stats.sessionsConsidered += sessions.length;
    const markerPath = path.join(roomDir, '.organize-state.json');
    let marker = 0;
    try { marker = Number(JSON.parse(await fs.promises.readFile(markerPath, 'utf8')).maxDataMtimeMs) || 0; } catch { /* reprocess without state */ }

    const changedFiles = new Map();
    for (const sessionId of sessions) {
      const sessionDir = path.join(roomDir, String(sessionId));
      const files = [];
      for (const entry of (fs.existsSync(sessionDir) ? await fs.promises.readdir(sessionDir, { withFileTypes: true }) : [])) {
        if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
        const mtime = (await fs.promises.stat(path.join(sessionDir, entry.name))).mtimeMs;
        if (force || mtime > marker) files.push(entry.name);
      }
      changedFiles.set(sessionId, files);
    }
    const changed = sessions.filter(sessionId => changedFiles.get(sessionId).length > 0);
    stats.sessionsSkippedUnchanged += sessions.length - changed.length;
    if (changed.length === 0) continue;

    const ordered = [...sessions].sort((a, b) => a - b);
    const migrationFiles = new Map();
    for (const sessionId of changed) {
      const index = ordered.indexOf(sessionId);
      if (index > 0) {
        const files = await hasStrayData(historyDir, roomId, ordered[index - 1], sessionId);
        if (files.size) migrationFiles.set(ordered[index - 1], files);
      }
    }
    for (const sessionId of changed) {
      const index = ordered.indexOf(sessionId);
      if (index > 0) {
        const files = migrationFiles.get(ordered[index - 1]);
        if (files) await moveStrayData(roomId, ordered[index - 1], sessionId, historyDir, [...files]);
      }
      if (index < ordered.length - 1) {
        const files = changedFiles.get(sessionId);
        if (files.length) await moveStrayData(roomId, sessionId, ordered[index + 1], historyDir, files);
      }
      const filesToSort = new Set(changedFiles.get(sessionId));
      for (const file of migrationFiles.get(sessionId) || []) filesToSort.add(file);
      await sortSessionFilesIn(historyDir, roomId, sessionId, [...filesToSort]);
    }
    stats.sessionsMigrated += migrationFiles.size;
    const processedSessions = new Set([...changed, ...migrationFiles.keys()]);
    stats.sessionsProcessed += processedSessions.size;

    let maxDataMtimeMs = 0;
    for (const sessionId of processedSessions) {
      const sessionDir = path.join(roomDir, String(sessionId));
      for (const entry of (fs.existsSync(sessionDir) ? await fs.promises.readdir(sessionDir, { withFileTypes: true }) : [])) {
        if (entry.isFile() && entry.name.endsWith('.jsonl')) maxDataMtimeMs = Math.max(maxDataMtimeMs, (await fs.promises.stat(path.join(sessionDir, entry.name))).mtimeMs);
      }
    }
    await fs.promises.writeFile(markerPath, JSON.stringify({ maxDataMtimeMs }) + '\n');
  }
  return stats;
}

async function hasStrayData(historyDir, roomId, sourceSessionId, targetSessionId) {
  const sessionDir = path.join(historyDir, String(roomId), String(sourceSessionId));
  const files = new Set();
  if (!fs.existsSync(sessionDir)) return files;
  const threshold = Number(targetSessionId);
  for (const entry of await fs.promises.readdir(sessionDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const filePath = path.join(sessionDir, entry.name);
    const content = await withFileLock(filePath, () => fs.promises.readFile(filePath, 'utf8'));
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        const ts = Number(item.ts || item.timestamp || item.time || 0);
        const normalizedTs = ts > 10000000000 ? Math.floor(ts / 1000) : ts;
        const normalizedThreshold = threshold > 10000000000 ? Math.floor(threshold / 1000) : threshold;
        if (normalizedTs >= normalizedThreshold) {
          files.add(entry.name);
          break;
        }
      } catch {
        // Ignore malformed lines; moveStrayData preserves them in place.
      }
    }
  }
  return files;
}

async function sortSessionFilesIn(historyDir, roomId, sessionId, requestedFiles = null) {
  const sessionDir = path.join(historyDir, String(roomId), String(sessionId));
  if (!fs.existsSync(sessionDir)) return;
  const entries = await fs.promises.readdir(sessionDir, { withFileTypes: true });
  const files = requestedFiles || entries.filter(entry => entry.isFile() && entry.name.endsWith('.jsonl')).map(entry => entry.name);
  for (const file of files) {
    const filePath = path.join(sessionDir, file);
    if (!fs.existsSync(filePath)) continue;
    await withFileLock(filePath, async () => {
      const items = (await fs.promises.readFile(filePath, 'utf8')).split('\n').filter(line => line.trim()).map(line => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);
      items.sort((a, b) => Number(a.ts || a.timestamp || a.time || 0) - Number(b.ts || b.timestamp || b.time || 0));
      await atomicWriteFile(filePath, items.length ? `${items.map(item => JSON.stringify(item)).join('\n')}\n` : '');
    });
  }
}

/**
 * 整理所有历史数据的顺序
 */
export async function sortAllHistory() {
    console.log('🧹 开始整理历史数据顺序...');
    if (!fs.existsSync(DATA_DIR)) return;
    
    try {
        const rooms = await fs.promises.readdir(DATA_DIR);
        for (const roomId of rooms) {
            const roomDir = path.join(DATA_DIR, roomId);
            const stats = await fs.promises.stat(roomDir);
            if (!stats.isDirectory()) continue;
            
            const sessions = await fs.promises.readdir(roomDir);
            for (const sessionId of sessions) {
                 if (/^\d+$/.test(sessionId)) {
                     await sortSessionFiles(roomId, sessionId);
                 }
            }
        }
        console.log('✨ 历史数据整理完成');
    } catch (error) {
        console.error('整理历史数据失败:', error);
    }
}
