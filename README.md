# Unia-Danmuku

<div align="center">

一个面向 B 站直播场景的 OBS 弹幕与直播辅助系统。

![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

## 项目简介

Unia-Danmuku 用于连接 B 站直播间，接收实时弹幕、礼物、醒目留言和舰长事件，并将内容展示到控制台或 OBS 浏览器源中。项目还提供后台多房间监控、历史记录、认证中心、答谢页、OBS 时钟、字体与素材管理等直播辅助能力。

项目采用 React + Vite 前端和 Node.js + Express 后端。开发环境前后端分离运行，生产环境可由后端托管前端构建产物，也可通过 Docker 部署。

## 核心功能

- B 站扫码登录与 Cookie 状态管理
- 实时弹幕、SC、礼物、上舰事件接收
- OBS 浏览器源弹幕展示与样式配置
- OBS 弹幕预览和测试消息
- 多房间后台监控
- 按房间和场次保存历史记录
- 舰长数据管理与统计
- 礼物答谢展示和素材上传
- OBS 时钟显示与配置
- 字体上传和本地静态资源托管

## 技术栈

### 前端

- React 18
- React Router
- Vite
- Axios
- WebSocket

### 后端

- Node.js
- Express
- ws
- bilibili-live-ws
- axios
- qrcode
- multer

### 数据与部署

- 本地 JSON / JSONL 文件存储
- Docker / Docker Compose
- Windows 服务脚本
- Linux systemd 服务文件

## 快速启动

### 环境要求

- Node.js 16+
- npm

### 后端

```bash
cd backend
npm install
npm run dev
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

默认访问：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

后端端口和跨域地址可通过 `backend/.env` 配置，参考 `backend/.env.example`。

## Docker 启动

```bash
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f unia-danmuku
```

停止服务：

```bash
docker compose down
```

部署时建议持久化：

- `backend/data/`
- `logs/`

## 文档导航

- [开发文档总览](docs/DEVELOPMENT.md)
- [认证模块](docs/features/authentication.md)
- [实时弹幕模块](docs/features/live-danmaku.md)
- [OBS 弹幕模块](docs/features/obs-danmaku.md)
- [后台监控与历史记录](docs/features/monitor-history.md)
- [舰长模块](docs/features/captains.md)
- [答谢模块](docs/features/thank-you.md)
- [OBS 时钟模块](docs/features/clock.md)
- [字体与素材模块](docs/features/fonts-and-assets.md)

## 项目结构

```text
Unia-Danmuku/
├── backend/                 # Express 后端服务
│   ├── src/
│   │   ├── routes/          # API 路由
│   │   ├── services/        # B 站认证、直播连接、房间和舰长管理
│   │   ├── utils/           # Cookie、历史记录、答谢配置等工具
│   │   └── server.js        # 后端入口
│   └── data/                # 运行时数据、历史记录、字体和上传素材
├── frontend/                # React + Vite 前端
│   └── src/
│       ├── pages/           # 控制台、OBS、监控、答谢、时钟等页面
│       ├── components/      # 复用组件
│       └── services/        # API 请求封装
├── docs/                    # 开发文档和功能实现说明
├── docker-compose.yml       # Docker Compose 配置
└── README.md
```

## 常用入口

- 控制台：`/dashboard`
- 认证中心：`/auth-center`
- 弹幕控制台：`/danmaku`
- OBS 弹幕页：`/obs`
- OBS 设置页：`/obs-settings`
- 后台监控：`/monitor`
- 答谢页：`/thankyou`
- 时钟页：`/clock`

## License

本项目采用 MIT 协议。

## 致谢

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)
- [bilibili-live-ws](https://github.com/simon300000/bilibili-live-ws)
