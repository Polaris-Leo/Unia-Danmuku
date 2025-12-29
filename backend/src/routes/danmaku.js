import express from 'express';
import { WebSocketServer } from 'ws';
import { roomManager } from '../services/roomManager.js';
import { loadHistory } from '../utils/historyStorage.js';

const router = express.Router();

/**
 * 启动直播间弹幕监听
 * POST /api/danmaku/start
 */
router.post('/start', async (req, res) => {
  const { roomId } = req.body;
  
  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: '缺少roomId参数'
    });
  }
  
  // 检查是否已经在监听
  if (roomManager.connections.has(roomId)) {
    return res.json({
      success: true,
      message: '直播间已在监听中',
      roomId
    });
  }
  
  await roomManager.ensureConnection(roomId);

  res.json({
    success: true,
    message: '直播间弹幕监听已启动',
    roomId
  });
});

/**
 * 停止直播间弹幕监听
 * POST /api/danmaku/stop
 */
router.post('/stop', (req, res) => {
  const { roomId } = req.body;
  
  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: '缺少roomId参数'
    });
  }
  
  // 仅在未被监控时停止
  if (roomManager.monitoredRooms.has(roomId)) {
    return res.json({
      success: false,
      message: '该直播间处于持续监控列表中，无法手动停止',
      roomId
    });
  }

  const conn = roomManager.connections.get(roomId);
  if (conn) {
    conn.disconnect();
    roomManager.connections.delete(roomId);
  }
  
  res.json({
    success: true,
    message: '直播间弹幕监听已停止',
    roomId
  });
});

/**
 * 发送测试弹幕/礼物
 * POST /api/danmaku/test
 */
router.post('/test', (req, res) => {
  const { roomId, type, data } = req.body;
  
  if (!roomId || !data) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    });
  }
  
  // 广播扁平化的消息对象，以兼容 ObsDanmakuPage 和 ThankYouPage (已更新支持扁平结构)
  // 使用 spread operator 将 data 展开，确保 type 位于顶层
  roomManager.broadcastToRoom(roomId, { type: type || 'gift', ...data });
  
  res.json({
    success: true,
    message: '测试消息已发送'
  });
});

/**
 * 发送综合测试流
 * POST /api/danmaku/test-flow
 */
router.post('/test-flow', (req, res) => {
  const { roomId } = req.body;
  
  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: '缺少roomId参数'
    });
  }

  const events = [
    { type: 'danmaku', delay: 0, username: '萌新观众', content: '主播好！第一次来看直播' },
    { type: 'danmaku', delay: 200, username: '老粉', content: '前排围观' },
    { type: 'gift', delay: 500, username: '老板大气', giftName: '牛哇牛哇', num: 1, price: 100, totalCoin: 10000 }, // 10元
    { type: 'danmaku', delay: 800, username: '路人甲', content: '这也太帅了吧 [打call] [打call]' },
    { type: 'guard', delay: 1500, username: '新舰长', guardLevel: 3, giftName: '舰长' },
    { type: 'danmaku', delay: 1800, username: '欢迎团', content: '欢迎舰长！' },
    { type: 'danmaku', delay: 2000, username: '欢迎团', content: '欢迎欢迎！' },
    { type: 'gift', delay: 2500, username: '富哥', giftName: '告白气球', num: 1, price: 520, totalCoin: 52000 }, // 52元
    { type: 'superchat', delay: 3500, username: 'SC大佬', price: 30, message: '加油加油！支持一下' },
    { type: 'danmaku', delay: 4000, username: '刷屏怪', content: '2333333333333333333' },
    { type: 'guard', delay: 5000, username: '提督巨佬', guardLevel: 2, giftName: '提督' },
    { type: 'superchat', delay: 6000, username: '神秘人', price: 100, message: '测试一下金色SC的效果' },
  ];

  events.forEach(event => {
    setTimeout(() => {
      const baseUser = {
        uid: 10000 + Math.floor(Math.random() * 90000),
        username: event.username,
        face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg',
        guardLevel: event.guardLevel || 0
      };

      let msg = {
        timestamp: Date.now(),
        user: baseUser,
        type: event.type
      };

      if (event.type === 'danmaku') {
        msg.content = event.content;
      } else if (event.type === 'gift') {
        msg.giftName = event.giftName;
        msg.num = event.num;
        msg.price = event.price;
        msg.totalCoin = event.totalCoin;
        msg.coinType = 'gold';
        msg.giftId = Math.floor(Math.random() * 1000);
      } else if (event.type === 'guard') {
        msg.guardLevel = event.guardLevel;
        msg.giftName = event.giftName;
        msg.price = event.guardLevel === 3 ? 198000 : (event.guardLevel === 2 ? 1998000 : 19998000);
      } else if (event.type === 'superchat') {
        msg.price = event.price;
        msg.message = event.message;
        msg.time = Math.floor(Date.now() / 1000);
      }

      roomManager.broadcastToRoom(roomId, msg);
    }, event.delay);
  });

  res.json({
    success: true,
    message: '综合测试流已启动'
  });
});

/**
 * 获取当前监听的直播间列表
 * GET /api/danmaku/rooms
 */
router.get('/rooms', (req, res) => {
  const rooms = Array.from(roomManager.connections.keys());
  res.json({
    success: true,
    rooms,
    count: rooms.length
  });
});

/**
 * 创建WebSocket服务器用于转发弹幕
 */
export function createDanmakuWSS(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/danmaku'
  });
  
  // 将WSS传递给roomManager以便广播
  roomManager.setWSS(wss);
  
  console.log('🌐 弹幕WebSocket服务器已启动: /ws/danmaku');
  
  wss.on('connection', async (ws, req) => {
    // 从URL参数获取roomId
    const url = new URL(req.url, 'http://localhost');
    const roomId = url.searchParams.get('roomId');
    
    if (!roomId) {
      ws.close(1008, '缺少roomId参数');
      return;
    }
    
    console.log(`📺 客户端连接到直播间 ${roomId}`);
    
    // 检查是否已有连接，没有则创建
    let liveWS = await roomManager.ensureConnection(roomId);

    // 如果已有连接（或刚创建），立即发送当前的直播状态和高能榜
    if (liveWS) {
      liveWS.getLiveStatus().then(async (status) => {
        if (status) {
          ws.send(JSON.stringify({
            type: 'live_status',
            ...status
          }));

          // 如果正在直播，加载并发送历史记录
          if (status.liveStatus === 1 && liveWS.currentSessionId) {
            // 使用 liveWS.roomId (真实房间号) 而不是 URL 参数中的 roomId
            const history = await loadHistory(liveWS.roomId, liveWS.currentSessionId);
            if (history) {
              ws.send(JSON.stringify({
                type: 'history',
                data: history
              }));
            }
          }
        }
        // 获取高能榜 (依赖 getLiveStatus 获取的 anchorId)
        return liveWS.getRankCount();
      }).then(rankData => {
        if (rankData) {
          ws.send(JSON.stringify({
            type: 'rank',
            num: rankData.count
          }));
        }
        // 获取直播间综合信息（主播名、舰长数等）
        return liveWS.getRoomInfo();
      }).then(roomInfo => {
        if (roomInfo) {
          ws.send(JSON.stringify({
            type: 'room_info',
            data: roomInfo
          }));
        }
      });
    }
    
    // 保存客户端连接
    ws.roomId = roomId;
    
    // 客户端断开连接
    ws.on('close', () => {
      console.log(`📺 客户端断开直播间 ${roomId}`);
      
      // Check if we should disconnect the room connection
      roomManager.checkDisconnect(roomId);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket错误:', error);
    });
  });
  
  return wss;
}

export default router;
