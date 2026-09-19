import express from 'express';
import { getSessions, loadHistory, loadMetricSnapshots, organizeHistory, summarizeMetricSnapshots, validateHistoryOrganizeRequest } from '../utils/historyStorage.js';

const router = express.Router();

router.post('/organize', async (req, res) => {
  const validation = validateHistoryOrganizeRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  try {
    const stats = await organizeHistory({
      roomId: validation.roomId,
      startTime: validation.startTime,
      endTime: validation.endTime,
      recentLimit: Number.POSITIVE_INFINITY,
      force: true
    });
    return res.json({
      success: true,
      range: {
        roomId: validation.roomId,
        startTime: validation.startTime,
        endTime: validation.endTime
      },
      stats
    });
  } catch (error) {
    console.error('[History] Failed to organize requested range:', error);
    return res.status(500).json({ success: false, message: 'Failed to organize history' });
  }
});

// 获取房间的历史会话列表
router.get('/:roomId/sessions', async (req, res) => {
  const { roomId } = req.params;
  const sessions = await getSessions(roomId);
  res.json({ success: true, sessions });
});

// 获取指定会话的指标时间序列
router.get('/:roomId/:sessionId/metrics', async (req, res) => {
  const { roomId, sessionId } = req.params;
  const points = await loadMetricSnapshots(roomId, sessionId);
  const hasFansClubData = points.some((point) => Number.isFinite(Number(point.fansClubCount)) && Number(point.fansClubCount) > 0);

  res.json({
    success: true,
    data: {
      roomId: String(roomId),
      sessionId: String(sessionId),
      startedAt: points[0]?.ts || null,
      endedAt: points[points.length - 1]?.ts || null,
      fansMetric: hasFansClubData ? 'fansClubCount' : 'followerCount',
      points
    }
  });
});

// 获取指定会话的指标汇总
router.get('/:roomId/:sessionId/analytics-summary', async (req, res) => {
  const { roomId, sessionId } = req.params;
  const points = await loadMetricSnapshots(roomId, sessionId);

  res.json({
    success: true,
    data: {
      roomId: String(roomId),
      sessionId: String(sessionId),
      ...summarizeMetricSnapshots(points)
    }
  });
});

// 获取指定会话的历史数据
router.get('/:roomId/:sessionId', async (req, res) => {
  const { roomId, sessionId } = req.params;
  const history = await loadHistory(roomId, sessionId);
  
  if (history) {
    res.json({ success: true, data: history });
  } else {
    res.status(404).json({ success: false, message: 'History not found' });
  }
});

export default router;
