import express from 'express';
import { captainManager } from '../services/captainManager.js';

const router = express.Router();

// GET /api/captains
router.get('/', async (req, res) => {
    try {
        const { uid, username, levels, startDate, endDate, room_id, page = 1, limit = 20 } = req.query;

        // Add default room filtering if needed
        const filters = {
            uid,
            username,
            levels,
            startDate,
            endDate,
            roomId: room_id
        };

        const result = await captainManager.getCaptains(filters, { page: parseInt(page), limit: parseInt(limit) });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting captains:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve captain records' });
    }
});

/**
 * POST /api/captains
 * 手动添加舰长记录
 * Body: { uid, username, guard_level }
 */
router.post('/', async (req, res) => {
    try {
        const { uid, username, guard_level } = req.body;
        if (!uid || !username) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const newRecord = await captainManager.addCaptain({
            uid: parseInt(uid),
            username,
            guard_level: parseInt(guard_level || 3),
            timestamp: Date.now()
        });

        res.json({ success: true, data: newRecord });
    } catch (error) {
        console.error('Error adding captain:', error);
        res.status(500).json({ success: false, error: 'Failed to add captain' });
    }
});

// 托管字体文件
router.post('/import', async (req, res) => {
    try {
        const stats = await captainManager.importFromHistory();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error importing history:', error);
        res.status(500).json({ success: false, error: 'Failed to import history' });
    }
});

/**
 * GET /api/captains/stats
 * 获取统计信息
 */
router.get('/stats', async (req, res) => {
    try {
        const { room_id } = req.query;
        const stats = await captainManager.getStats(room_id);
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

export default router;
