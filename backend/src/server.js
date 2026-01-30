import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import danmakuRoutes, { createDanmakuWSS } from './routes/danmaku.js';
import monitorRoutes from './routes/monitor.js';
import historyRoutes from './routes/history.js';
import thankyouRoutes from './routes/thankyou.js';
import fontRoutes from './routes/fonts.js';
import obsRoutes from './routes/obs.js';
import clockRoutes from './routes/clock.js';
import { roomManager } from './services/roomManager.js';
import { sortAllHistory, repairOverlappingSessions } from './utils/historyStorage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/danmaku', danmakuRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/thankyou', thankyouRoutes);
app.use('/api/fonts', fontRoutes);
app.use('/api/obs', obsRoutes);
app.use('/api/clock', clockRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 静态文件托管
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// 托管上传的文件
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// 托管字体文件
const fontsDir = path.join(__dirname, '../data/fonts');
app.use('/fonts', express.static(fontsDir));

app.use(express.static(publicDir));

// Serve uploaded files from data/daxie
const daxieDir = path.join(__dirname, '../data/daxie');
// Explicitly serve /daxie to ensure accessibility with aggressive caching
app.use('/daxie', express.static(daxieDir, {
  maxAge: '1y',
  immutable: true
}));

// 
// SPA 路由回退
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// 创建WebSocket服务器
createDanmakuWSS(server);

// 初始化房间管理器（加载持久化配置并开始监控）
roomManager.init();

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

// 启动服务器
const startServer = async () => {
  // 1. 先修复重叠数据 (将误入旧场次的新数据移动到新场次)
  await repairOverlappingSessions();
  // 2. 再整理数据顺序 (确保文件内按时间戳排序)
  await sortAllHistory();

  server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`🌐 WebSocket URL: ws://localhost:${PORT}/ws/danmaku`);
  });
};

startServer();
