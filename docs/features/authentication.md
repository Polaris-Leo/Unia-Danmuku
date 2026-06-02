# 认证模块

## 模块职责

认证模块负责让系统获得可用于访问 B 站直播相关能力的登录状态。它包含二维码登录、登录结果轮询、Cookie 持久化、认证状态展示、退出登录、重连以及可选的外部 Cookie Manager 接入。

认证状态会影响实时弹幕连接、后台监控和部分 B 站接口调用，因此它是系统运行前最重要的基础模块之一。

## 相关文件

### 后端

- `backend/src/routes/auth.js`：认证 API 路由。
- `backend/src/services/bilibiliAuth.js`：B 站认证服务封装。
- `backend/src/utils/cookieStorage.js`：Cookie 本地存储、远程 Cookie Manager 接入和来源信息管理。
- `backend/.env.example`：环境变量示例，包含可选 `COOKIE_MANAGER_URL`。

### 前端

- `frontend/src/pages/LoginPage.jsx`：扫码登录页面。
- `frontend/src/pages/AuthCenterPage.jsx`：认证中心与 Cookie 来源状态展示。
- `frontend/src/services/api.js`：认证 API 请求封装。

## 后端 API

认证路由挂载在 `/api/auth`：

- `GET /api/auth/qrcode`：创建 B 站扫码登录二维码。
- `GET /api/auth/qrcode/poll`：轮询二维码扫描和确认结果。
- `GET /api/auth/status`：读取当前认证状态、用户信息和 Cookie 来源。
- `POST /api/auth/reconnect`：触发认证相关服务或监控房间重连。
- `POST /api/auth/logout`：退出登录并清理本地认证信息。

## 登录流程

```text
LoginPage / AuthCenterPage
        |
        | GET /api/auth/qrcode
        v
auth.js
        |
        v
bilibiliAuth 创建二维码
        |
        | 用户使用 B 站 App 扫码确认
        v
前端轮询 /api/auth/qrcode/poll
        |
        v
登录成功后保存 Cookie
        |
        v
/api/auth/status 返回登录状态和来源
```

## Cookie 存储与来源

默认情况下，登录成功后的 Cookie 存储在 `backend/data/cookies.json`。`cookieStorage.js` 负责读写 Cookie、判断当前 Cookie 状态，并向前端提供来源信息。

认证状态可能来自多个来源：

1. 外部 Cookie Manager。
2. 当前请求携带的 Cookie。
3. 本地 `backend/data/cookies.json`。

运行时数据不适合作为代码提交内容。部署时应持久化 `backend/data/`，以保留登录状态、监控配置和其他运行时数据。

## Cookie Manager 集成

`docker-compose.yml` 中包含一个可选的 `bili-cookie-manager` 服务。启用 `COOKIE_MANAGER_URL` 后，系统可以从外部 Cookie 管理服务获取 Cookie，用于多账号管理或故障转移。

典型 Docker Compose 内部服务地址：

```env
COOKIE_MANAGER_URL=http://bili-cookie-manager:3100
```

默认不配置 `COOKIE_MANAGER_URL` 时，系统使用本地单账号 Cookie。

## 前端展示

- `LoginPage.jsx` 负责扫码登录入口。
- `AuthCenterPage.jsx` 负责展示当前认证状态、Cookie 来源、用户信息以及操作入口。
- 页面通过 `frontend/src/services/api.js` 调用 `/api/auth/*` 接口。

## 与其他模块的关系

- 实时弹幕模块依赖可用 Cookie 建立或维持直播间连接。
- 后台监控模块在认证状态变化后可能需要重连房间。
- Docker 部署时需要保证 `backend/data/` 持久化，否则容器重建后本地登录状态会丢失。

## 开发注意事项

- 修改 `/api/auth/status` 返回结构时，需要同步检查 `AuthCenterPage.jsx` 和 `LoginPage.jsx`。
- 修改 Cookie 存储位置时，需要同步检查 Docker volume、`.gitignore` 和部署文档。
- 认证失败会影响直播间连接、后台监控和 OBS 弹幕展示，应优先通过 `/api/auth/status` 排查。
- 启用 Cookie Manager 后，需要同时关注本地 Cookie 和远程 Cookie 的 fallback 逻辑。
