# 后台监控与历史记录模块

## 模块职责

后台监控模块负责在不打开前端弹幕页的情况下持续监听多个直播间。历史记录模块负责将直播间事件和指标快照按房间和场次保存，供后续查看、回放或分析。

这两个能力通常一起工作：监控负责“持续接收”，历史记录负责“可靠落盘”，直播分析页负责将场次指标转化为可回看的摘要和趋势图。

## 相关文件

### 后端

- `backend/src/routes/monitor.js`：后台监控房间 API。
- `backend/src/routes/history.js`：历史记录和场次指标分析读取 API。
- `backend/src/services/roomManager.js`：监控房间生命周期管理。
- `backend/src/services/bilibiliLiveWS.js`：直播连接、事件解析和场次指标采集。
- `backend/src/utils/historyStorage.js`：历史场次和 JSONL 数据存储。
- `backend/src/utils/repairSessions.js`：历史数据修复辅助逻辑。
- `backend/src/server.js`：启动时初始化 `roomManager` 并运行历史数据修复/排序。

### 前端

- `frontend/src/pages/MonitorPage.jsx`：后台监控管理页。
- `frontend/src/pages/DashboardPage.jsx`：控制台入口和状态展示。
- `frontend/src/pages/DanmakuPage.jsx`：弹幕控制台和实时信息展示。
- `frontend/src/pages/AnalyticsPage.jsx`：按直播场次展示指标摘要、趋势图和实时刷新状态。

## 后端 API

监控路由挂载在 `/api/monitor`：

- `GET /api/monitor/rooms`：读取监控房间列表、连接/直播状态和当前场次 ID。
- `POST /api/monitor/rooms`：添加监控房间。
- `POST /api/monitor/rooms/:roomId/pause`：暂停指定房间监控。
- `POST /api/monitor/rooms/:roomId/resume`：恢复指定房间监控。
- `DELETE /api/monitor/rooms/:roomId`：删除指定监控房间。

历史路由挂载在 `/api/history`：

- `GET /api/history/:roomId/sessions`：读取指定房间的历史场次列表。
- `GET /api/history/:roomId/:sessionId`：读取指定场次的历史消息。
- `GET /api/history/:roomId/:sessionId/metrics`：读取指定场次的指标时间序列。
- `GET /api/history/:roomId/:sessionId/analytics-summary`：读取指定场次的指标汇总。

## 监控流程

```text
MonitorPage 添加房间
        |
        | POST /api/monitor/rooms
        v
monitor.js
        |
        v
roomManager 保存房间配置
        |
        v
为房间建立后台直播连接
        |
        | 收到直播事件或指标采样时机
        v
historyStorage 写入对应场次文件（消息 JSONL / metrics.jsonl）
```

## 房间生命周期

`roomManager` 负责：

- 加载持久化的监控房间配置。
- 添加、删除、暂停、恢复监控房间。
- 管理每个房间的直播连接。
- 将收到的消息广播给前端 WebSocket 客户端。
- 将收到的消息写入历史记录。
- 在连接建立、开播/下播、高能榜或看过人数变化时写入指标快照，并在直播中每 60 秒采样一次。
- 在认证状态变化或连接异常时处理重连。

监控房间配置通常保存在 `backend/data/monitored_rooms.json`。

## 历史记录

历史数据主要存储在 `backend/data/history/`。消息通常以 JSONL 形式追加保存，便于持续写入和后续逐行处理。

常见事件文件包括：

- `danmaku.jsonl`：普通弹幕。
- `gift.jsonl`：礼物。
- `guard.jsonl`：上舰/舰长相关事件。
- `superchat.jsonl`：醒目留言。
- `metrics.jsonl`：直播场次指标快照，包含大航海、粉丝团/粉丝、高能榜、看过人数和已直播时长。

按房间和场次组织后，历史目录通常类似：

```text
backend/data/history/<roomId>/<sessionId>/
├── danmaku.jsonl
├── gift.jsonl
├── guard.jsonl
├── superchat.jsonl
└── metrics.jsonl
```

## 直播场次分析

`/analytics?roomId=<roomId>` 用于按场次查看大航海、粉丝团（缺失时回退粉丝数）、高能榜、看过人数和直播时长的摘要与趋势图。

- 选择历史场次时，页面只读取一次已保存的指标数据。
- 选择当前直播场次时，页面按 60 秒采样频率轮询房间状态和 metrics/summary 接口，曲线会反映新增快照。
- 当前直播场次在选择器中会置顶并显示“进行中”；用户手动切换到历史场次后，页面不会自动跳回当前场次。
- 历史场次若早于指标采集功能上线时间，接口返回空点，页面会显示无指标采样提示。

## 启动时修复与排序

服务启动时，`server.js` 会在后台异步执行历史数据检查与修复：

1. 修复可能重叠的场次数据。
2. 对历史数据进行排序。
3. 不阻塞服务器启动。

因此开发时不能假设“服务启动完成”就代表“历史修复已经完成”。如果历史页面刚启动时数据短暂不完整，应结合后台日志判断。

## 与其他模块的关系

- 认证模块提供监控房间连接所需 Cookie。
- 实时弹幕模块提供直播连接和消息解析能力。
- 舰长模块可能从历史 `guard.jsonl` 中导入数据。
- 直播分析页读取 `metrics.jsonl`，并通过监控房间状态识别当前未结束场次。
- 答谢模块可能关注礼物消息和配置更新。

## 开发注意事项

- 修改历史文件结构会影响历史读取、修复脚本和已有数据兼容性。
- 后台监控应避免因单个房间失败影响其他房间。
- 删除监控房间通常不应删除历史记录，除非明确设计了数据清理功能。
- 启动修复逻辑是后台异步执行，不能把它写成阻塞启动的重任务。
- 如果新增直播事件类型，应同步设计其历史落盘策略。
- 指标快照属于运行时数据，`backend/data/` 已整体忽略；不得将真实直播 JSONL、Cookie 或监控运行数据提交到 Git。
- 修改 `metrics.jsonl` 字段或采样频率时，应同时检查历史读取、场次修复、分析汇总接口和前端图表兼容性。
