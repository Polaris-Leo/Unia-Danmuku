# OBS 弹幕模块

## 模块职责

OBS 弹幕模块负责把直播间实时消息渲染成适合 OBS 浏览器源使用的画面。它包含 OBS 展示页、样式设置页、预览页和后端样式配置 API。

该模块的目标是让主播可以在 OBS 中通过浏览器源展示弹幕、SC、礼物、舰长等直播互动内容，并通过前端配置页面调整字体、颜色、模板和展示效果。

## 相关文件

### 后端

- `backend/src/routes/obs.js`：OBS 样式配置 API。
- `backend/src/routes/danmaku.js`：提供实时消息 WebSocket 和测试消息入口。
- `backend/src/server.js`：托管前端构建产物和 WebSocket 服务。

### 前端

- `frontend/src/pages/ObsDanmakuPage.jsx`：OBS 浏览器源弹幕展示页。
- `frontend/src/pages/ObsDanmakuPage.css`：OBS 弹幕基础样式。
- `frontend/src/pages/ObsDanmakuPageBubbles.css`：气泡模板样式。
- `frontend/src/pages/ObsSettingsPage.jsx`：OBS 样式设置页。
- `frontend/src/pages/ObsSettingsPage.css`：设置页样式。
- `frontend/src/pages/ObsPreview.jsx`：OBS 预览页。
- `frontend/src/pages/ObsPreview.css`：预览页样式。
- `frontend/src/pages/ObsPreviewBubbles.css`：气泡模板预览样式。
- `frontend/src/pages/styles/Bubbles.css`：气泡相关复用样式。

## 后端 API

OBS 路由挂载在 `/api/obs`：

- `GET /api/obs/settings`：读取当前 OBS 样式配置。
- `GET /api/obs/settings/all`：读取全部 OBS 样式配置。
- `POST /api/obs/settings`：保存 OBS 样式配置。

OBS 页面还会消费实时弹幕模块提供的 WebSocket：

- `/ws/danmaku`

## 使用方式

在 OBS Studio 中添加“浏览器”源，URL 指向前端页面：

```text
http://localhost:5173/obs
```

生产部署时，如果由后端托管前端构建产物，则地址通常是：

```text
http://localhost:<PORT>/obs
```

推荐浏览器源尺寸按直播画布设置，例如 1920x1080。

## 展示流程

```text
ObsDanmakuPage 打开
        |
        | 读取 OBS 样式配置
        v
连接 /ws/danmaku
        |
        | 接收实时消息
        v
根据消息类型和样式配置渲染弹幕 / SC / 礼物 / 舰长效果
```

## 样式配置

`ObsSettingsPage.jsx` 提供样式配置界面。配置通常包括：

- 显示模板。
- 字体。
- 字号。
- 颜色。
- 粗细。
- 舰长等级颜色。
- SC 展示时长。
- 其他与弹幕展示相关的参数。

配置由后端 `obs.js` 持久化。OBS 展示页读取配置后应用到实时消息渲染。

## 预览与测试

`ObsPreview.jsx` 用于预览样式效果。配合实时弹幕模块的测试接口：

- `POST /api/danmaku/test`
- `POST /api/danmaku/test-flow`

可以在没有真实直播消息时验证展示效果。

## 模板与样式文件

OBS 弹幕模块包含普通样式和气泡样式等不同展示形态。新增模板时，建议同时考虑：

1. 展示页样式。
2. 预览页样式。
3. 设置页配置项。
4. 后端默认配置和持久化字段。

## 与其他模块的关系

- 实时弹幕模块提供 `/ws/danmaku` 消息来源。
- 字体与素材模块提供字体文件访问能力。
- 舰长模块影响舰长等级显示。
- 答谢模块和 OBS 弹幕模块都属于 OBS 展示相关能力，但配置和展示页面独立。

## 开发注意事项

- OBS 页面应尽量保持轻量，避免依赖复杂交互，因为它运行在 OBS 的浏览器源环境中。
- 修改样式配置字段时，需要同步检查 `ObsSettingsPage.jsx`、`ObsPreview.jsx`、`ObsDanmakuPage.jsx` 和 `backend/src/routes/obs.js`。
- 新增展示模板时，应同时提供展示页样式和预览页样式。
- 修改 WebSocket 消息结构时，需要同步检查 OBS 展示页的消息分支处理。
