# Unia-Danmuku 开发文档

本文档面向维护者和二次开发者，说明 Unia-Danmuku 的项目结构、模块边界、主要数据流、运行方式和扩展建议。README 只保留项目简介和快速入口；更具体的功能实现说明请阅读 `docs/features/` 下的专题文档。

## 1. 项目定位

Unia-Danmuku 是一个面向 B 站直播场景的 OBS 弹幕与直播辅助系统。它负责接入 B 站直播间实时消息，将弹幕、礼物、醒目留言、上舰等事件展示到控制台或 OBS 浏览器源，并提供后台监控、历史记录、舰长数据、答谢页、时钟和字体/素材管理等配套能力。

项目采用前后端分离开发方式：

- 前端负责控制台、配置页面和 OBS 展示页面。
- 后端负责 B 站认证、直播 WebSocket 连接、业务 API、数据持久化和静态资源托管。
- 生产环境下，后端也可以托管前端构建产物。

## 2. 技术栈

### 前端

- React 18
- React Router
- Vite
- Axios
- 原生 WebSocket
- file-saver / xlsx-js-style：用于文件导出和表格处理相关能力
- @number-flow/react：用于数字展示动画相关能力

### 后端

- Node.js ESM
- Express
- ws
- bilibili-live-ws
- axios
- qrcode
- multer
- pako
- dotenv / cors / cookie-parser

### 运行与部署

- 本地开发：前端 Vite dev server + 后端 Express server
- 生产运行：后端 Express 托管 `frontend/dist`
- 容器运行：`Dockerfile` 和 `docker-compose.yml`
- 数据存储：以 `backend/data/` 下的 JSON、JSONL、字体文件和上传资源为主

## 3. 总体架构

```text
浏览器控制台 / OBS 浏览器源
        |
        | HTTP API / WebSocket
        v
Express 后端服务
        |
        | B 站登录、直播间连接、消息解析、数据持久化
        v
Bilibili API / Bilibili 直播 WebSocket
```

后端入口是 `backend/src/server.js`。它创建 Express 应用和 HTTP server，挂载 API 路由，托管前端静态文件、上传资源和字体文件，然后通过 `createDanmakuWSS(server)` 创建面向前端/OBS 的 `/ws/danmaku` WebSocket 服务。

前端入口是 `frontend/src/App.jsx`。它使用 React Router 将控制台、认证中心、OBS 弹幕页、监控页、答谢页、时钟页和舰长页组合成单页应用。

## 4. 后端模块总览

### `backend/src/server.js`

后端启动入口，负责：

- 加载环境变量。
- 创建 Express 与 HTTP server。
- 配置 CORS、JSON body、URL encoded body、cookie-parser。
- 挂载 `/api/*` 路由。
- 提供 `GET /api/health` 健康检查。
- 托管 `frontend/dist`。
- 托管 `backend/public`。
- 通过 `/fonts` 托管 `backend/data/fonts`。
- 通过 `/daxie` 托管 `backend/data/daxie`。
- 创建 `/ws/danmaku` WebSocket 服务。
- 初始化 `roomManager`。
- 启动后异步执行历史数据检查、修复和排序。

### 路由层 `backend/src/routes/`

- `auth.js`：B 站扫码登录、轮询登录结果、认证状态、重连和退出登录。
- `danmaku.js`：前台直播间连接/断开、测试消息、WebSocket 广播、房间列表。
- `monitor.js`：后台监控房间的查询、添加、暂停、恢复和删除。
- `history.js`：按房间和场次读取历史记录。
- `thankyou.js`：答谢页资源上传和房间配置读写。
- `fonts.js`：字体文件列表和上传。
- `obs.js`：OBS 弹幕样式配置读写。
- `clock.js`：OBS 时钟配置读写。
- `captain.js`：舰长数据查询、保存、导入和统计。

### 服务层 `backend/src/services/`

- `bilibiliAuth.js`：封装 B 站登录、二维码、Cookie、用户状态等认证逻辑。
- `bilibiliLiveWS.js`：封装 B 站直播 WebSocket 连接和消息解析。
- `biliLiveService.js`：直播服务封装或备用实现。
- `roomManager.js`：管理后台监控房间、直播连接生命周期、消息广播和持久化配置。
- `captainManager.js`：管理舰长数据、导入和统计。

### 工具层 `backend/src/utils/`

- `cookieStorage.js`：Cookie 读写、状态和来源信息管理。
- `historyStorage.js`：历史场次、JSONL 数据写入、读取、排序和修复。
- `thankYouStorage.js`：答谢页配置存储。
- `repairSessions.js`：历史数据修复辅助逻辑。

## 5. 前端模块总览

### 路由入口

`frontend/src/App.jsx` 定义页面路由：

- `/`、`/dashboard`：控制台首页。
- `/login`：B 站登录页。
- `/auth-center`：认证中心。
- `/danmaku`：弹幕控制台。
- `/obs`：OBS 弹幕浏览器源页面。
- `/obs-settings`：OBS 样式设置页。
- `/monitor`：后台监控管理页。
- `/thankyou`：答谢展示页。
- `/thankyou-settings`：答谢设置页。
- `/clock`：OBS 时钟展示页。
- `/clock-settings`：OBS 时钟设置页。
- `/captains`：舰长数据页。

### 页面层 `frontend/src/pages/`

页面组件按功能拆分，每个主要功能通常包含一个 `.jsx` 页面和对应 `.css` 样式文件。OBS 相关页面还包含专门用于展示模板的 CSS 文件，例如气泡样式。

### API 封装

`frontend/src/services/api.js` 创建 Axios 实例，默认 `baseURL` 为 `/api`，并启用 `withCredentials`。页面应优先通过该文件访问后端接口，而不是在页面内散落硬编码请求。

### 组件

`frontend/src/components/CustomSelect.jsx` 提供复用选择器组件，配套样式在 `CustomSelect.css`。

## 6. 数据存储目录

主要运行时数据位于 `backend/data/`。Docker Compose 也会将该目录挂载到容器外部，以保留运行时状态。

常见数据包括：

- `cookies.json`：本地 B 站登录 Cookie。
- `monitored_rooms.json`：后台监控房间配置。
- `history/`：直播历史记录，按房间和场次组织，通常使用 JSONL 保存消息。
- `captains/`：舰长数据，通常按房间和月份分片保存。
- `fonts/`：上传或内置字体文件。
- `daxie/`：答谢页上传素材。
- OBS、时钟、答谢等功能的 JSON 配置文件。

这些文件通常属于运行时数据。部署时应持久化挂载和备份 `backend/data/`，不应把用户运行时产生的大量数据直接提交到 Git。

## 7. 主要数据流

### B 站认证流

1. 前端请求 `/api/auth/qrcode` 获取二维码。
2. 用户用 B 站 App 扫码。
3. 前端轮询 `/api/auth/qrcode/poll`。
4. 后端登录成功后保存 Cookie。
5. 前端通过 `/api/auth/status` 展示认证状态和 Cookie 来源。
6. 认证状态变化后，后台监控连接可能需要重连。

详细说明见 [认证模块](features/authentication.md)。

### 实时弹幕流

1. 前端请求 `/api/danmaku/start`，传入直播间房间号。
2. 后端建立到 B 站直播 WebSocket 的连接。
3. 后端解析弹幕、SC、礼物、上舰等消息。
4. 后端通过 `/ws/danmaku` 广播给前端页面和 OBS 页面。
5. 前端页面根据消息类型渲染不同效果。

详细说明见 [实时弹幕模块](features/live-danmaku.md)。

### 后台监控与历史记录流

1. 用户在监控页添加房间。
2. `roomManager` 持久化房间配置并保持后台连接。
3. 收到消息后写入历史场次文件。
4. 启动时执行历史数据修复和排序。
5. 前端通过历史接口按房间和场次读取记录。

详细说明见 [后台监控与历史记录](features/monitor-history.md)。

### OBS 展示流

1. 用户在 OBS 中添加浏览器源，打开 `/obs`。
2. OBS 页面读取样式配置。
3. OBS 页面连接后端 WebSocket。
4. 用户可在 `/obs-settings` 调整样式。
5. OBS 页面根据配置和实时消息渲染弹幕、SC、舰长和礼物效果。

详细说明见 [OBS 弹幕模块](features/obs-danmaku.md)。

### 答谢展示流

1. 用户在 `/thankyou-settings` 上传素材并保存房间配置。
2. 后端将素材保存到 `backend/data/daxie`，并通过 `/daxie` 托管。
3. 答谢展示页 `/thankyou` 读取配置和素材。
4. 礼物消息可驱动答谢展示逻辑。

详细说明见 [答谢模块](features/thank-you.md)。

## 8. 功能文档导航

- [认证模块](features/authentication.md)
- [实时弹幕模块](features/live-danmaku.md)
- [OBS 弹幕模块](features/obs-danmaku.md)
- [后台监控与历史记录](features/monitor-history.md)
- [舰长模块](features/captains.md)
- [答谢模块](features/thank-you.md)
- [OBS 时钟模块](features/clock.md)
- [字体与素材模块](features/fonts-and-assets.md)

## 9. 本地开发流程

### 安装依赖

后端：

```bash
cd backend
npm install
```

前端：

```bash
cd frontend
npm install
```

### 配置环境变量

参考 `backend/.env.example` 创建 `backend/.env`。常用配置：

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
COOKIE_MANAGER_URL=
```

`COOKIE_MANAGER_URL` 是可选项。启用 Docker Compose 中的 `bili-cookie-manager` 服务时，可配置为类似 `http://bili-cookie-manager:3100` 的服务地址。

### 启动后端

```bash
cd backend
npm run dev
```

### 启动前端

```bash
cd frontend
npm run dev
```

默认访问地址：

- 前端开发服务：`http://localhost:5173`
- 后端 API：`http://localhost:3000` 或 `.env` 中配置的 `PORT`
- WebSocket：`ws://localhost:<PORT>/ws/danmaku`

## 10. 部署与运行入口

- 一键脚本：`start.bat`、`start.sh`、`stop.bat`、`stop.sh`
- Docker：`Dockerfile`、`docker-compose.yml`
- Windows 服务：`install-windows-service.ps1`、`uninstall-windows-service.ps1`
- Linux systemd：`unia-danmuku.service`

Docker Compose 中主服务 `unia-danmuku` 默认映射 `3000:3000`，并挂载：

- `./backend/data:/app/backend/data`
- `./logs:/app/logs`

可选服务 `bili-cookie-manager` 默认映射 `3100:3100`，用于多账号 Cookie 管理或故障转移。

部署时应持久化：

- `backend/data/`
- `logs/`

## 11. 二次开发建议

- 新功能优先按“路由层、服务层、工具层、前端页面/API 封装”的边界拆分。
- 前端页面调用后端接口时优先扩展 `frontend/src/services/api.js`。
- 后端需要长期保存的数据应集中放在 `backend/data/`，并明确是否需要加入 `.gitignore`。
- OBS 展示页应避免依赖复杂交互，优先通过配置和 WebSocket 数据驱动展示。
- 改动 WebSocket 消息结构时，需要同时检查后端广播逻辑、普通前端页面、OBS 页面、历史记录和答谢逻辑。
- 改动 Cookie 或认证逻辑时，需要同步检查前台连接、后台监控和 Docker 部署配置。

## 12. 快速源码定位

### 后端核心文件

- `backend/src/server.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/danmaku.js`
- `backend/src/routes/monitor.js`
- `backend/src/routes/history.js`
- `backend/src/routes/thankyou.js`
- `backend/src/routes/fonts.js`
- `backend/src/routes/obs.js`
- `backend/src/routes/clock.js`
- `backend/src/routes/captain.js`
- `backend/src/services/roomManager.js`
- `backend/src/services/bilibiliLiveWS.js`
- `backend/src/services/bilibiliAuth.js`
- `backend/src/services/captainManager.js`
- `backend/src/utils/cookieStorage.js`
- `backend/src/utils/historyStorage.js`
- `backend/src/utils/thankYouStorage.js`

### 前端核心文件

- `frontend/src/App.jsx`
- `frontend/src/services/api.js`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/AuthCenterPage.jsx`
- `frontend/src/pages/DanmakuPage.jsx`
- `frontend/src/pages/ObsDanmakuPage.jsx`
- `frontend/src/pages/ObsSettingsPage.jsx`
- `frontend/src/pages/MonitorPage.jsx`
- `frontend/src/pages/ThankYouPage.jsx`
- `frontend/src/pages/ThankYouSettingsPage.jsx`
- `frontend/src/pages/ClockPage.jsx`
- `frontend/src/pages/ClockSettingsPage.jsx`
- `frontend/src/pages/CaptainPage.jsx`

## 13. 总结

可以用一句话概括这套工程：

> Unia-Danmuku 是一个以 Node.js 后端为中心，通过 WebSocket 将 B 站直播互动事件分发到 React 控制台与 OBS 展示页，并将运行状态与历史数据落盘到本地 `backend/data` 的直播辅助系统。

理解这句话后，再看具体模块会更清晰：前端负责配置与展示，后端负责接入、广播和存储，`roomManager` 负责运行期编排，`backend/data` 负责状态留存，Docker 和脚本负责交付部署。
