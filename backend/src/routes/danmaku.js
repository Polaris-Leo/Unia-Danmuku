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
  
  if (!roomId || !type || !data) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数'
    });
  }
  
  roomManager.broadcastToRoom(roomId, { type, data });
  
  res.json({
    success: true,
    message: '测试消息已发送'
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
