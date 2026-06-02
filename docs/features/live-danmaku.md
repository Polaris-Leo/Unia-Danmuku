# 实时弹幕模块

## 模块职责

实时弹幕模块负责连接 B 站直播间，接收直播间事件，解析为项目内部消息格式，并通过后端 WebSocket 推送给前端控制台和 OBS 浏览器源页面。

它处理的典型消息包括：

- 普通弹幕
- 醒目留言 SC
- 礼物
- 上舰/续费舰长
- 直播间状态相关事件
- 测试消息和测试消息流

## 相关文件

### 后端

- `backend/src/routes/danmaku.js`：前台连接控制、测试消息、房间列表和 WebSocket server 创建。
- `backend/src/services/bilibiliLiveWS.js`：B 站直播 WebSocket 连接和消息解析。
- `backend/src/services/biliLiveService.js`：直播服务封装或备用实现。
- `backend/src/services/roomManager.js`：后台监控场景下的直播连接管理、消息广播和历史联动。
- `backend/src/server.js`：调用 `createDanmakuWSS(server)` 创建 WebSocket 服务。

### 前端

- `frontend/src/pages/DanmakuPage.jsx`：普通弹幕控制台。
- `frontend/src/pages/ObsDanmakuPage.jsx`：OBS 弹幕展示页。
- `frontend/src/services/api.js`：弹幕相关 API 请求封装。

## 后端 API

弹幕路由挂载在 `/api/danmaku`：

- `POST /api/danmaku/start`：连接指定直播间。
- `POST /api/danmaku/stop`：断开当前直播间连接。
- `POST /api/danmaku/test`：发送测试消息。
- `POST /api/danmaku/test-flow`：发送一组测试消息流。
- `GET /api/danmaku/rooms`：读取当前房间连接信息。

后端 WebSocket 地址：

- `/ws/danmaku`

## 数据流

```text
前端页面请求连接直播间
        |
        | POST /api/danmaku/start
        v
danmaku.js / roomManager
        |
        v
创建或复用 BilibiliLiveWS 连接
        |
        | B 站直播 WebSocket 消息
        v
bilibiliLiveWS 解析消息
        |
        v
roomManager / danmaku.js 广播给 /ws/danmaku 客户端
        |
        v
DanmakuPage / ObsDanmakuPage 渲染消息
```

## WebSocket 广播

`createDanmakuWSS(server)` 会创建面向前端的 WebSocket 服务，路径为 `/ws/danmaku`。普通控制台页面、OBS 弹幕页面等前端页面都可以连接这个 WebSocket，接收后端解析后的直播消息。

这条 WebSocket 是“后端到前端”的事件通道。它不同于后端到 B 站的直播 WebSocket：

- 后端到 B 站：由 `bilibiliLiveWS.js` 负责。
- 后端到前端：由 `/ws/danmaku` 负责。

## 消息处理

`bilibiliLiveWS.js` 是直播消息解析的核心。它负责把 B 站直播 WebSocket 收到的原始事件转换成前端更容易消费的结构。

`roomManager.js` 负责运行期编排，包括房间连接生命周期、广播、后台监控和历史记录联动。

`danmaku.js` 提供前台手动连接和测试消息入口，并创建前端 WebSocket server。

## 测试消息

`/api/danmaku/test` 和 `/api/danmaku/test-flow` 用于在没有真实直播事件时验证前端展示效果。OBS 样式调试和弹幕布局调整时，应优先使用测试消息验证。

测试消息应尽量贴近真实消息结构，否则容易出现“测试正常但直播时展示异常”的问题。

## 与其他模块的关系

- 认证模块提供 B 站访问所需 Cookie。
- OBS 弹幕模块消费实时消息并负责展示。
- 后台监控模块复用直播连接能力并将消息写入历史记录。
- 答谢模块关注礼物类消息和配置更新。
- 舰长模块会记录和展示上舰相关数据。

## 开发注意事项

- 修改消息字段时，需要同步检查 `DanmakuPage.jsx`、`ObsDanmakuPage.jsx`、答谢页、舰长逻辑和历史记录逻辑。
- WebSocket 断线重连逻辑需要避免无限快速重连。
- 如果新增消息类型，应同时补充测试消息、OBS 展示逻辑和历史记录策略。
- 前端 WebSocket 地址在开发环境下通常通过 Vite 代理转发 `/ws` 到后端。
