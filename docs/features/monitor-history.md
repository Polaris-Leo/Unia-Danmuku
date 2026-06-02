# 后台监控与历史记录模块

## 模块职责

后台监控模块负责在不打开前端弹幕页的情况下持续监听多个直播间。历史记录模块负责将直播间事件按房间和场次保存，供后续查看、回放或分析。

这两个能力通常一起工作：监控负责“持续接收”，历史记录负责“可靠落盘”。

## 相关文件

### 后端

- `backend/src/routes/monitor.js`：后台监控房间 API。
- `backend/src/routes/history.js`：历史记录读取 API。
- `backend/src/services/roomManager.js`：监控房间生命周期管理。
- `backend/src/utils/historyStorage.js`：历史场次和 JSONL 数据存储。
- `backend/src/utils/repairSessions.js`：历史数据修复辅助逻辑。
- `backend/src/server.js`：启动时初始化 `roomManager` 并运行历史数据修复/排序。

### 前端

- `frontend/src/pages/MonitorPage.jsx`：后台监控管理页。
- `frontend/src/pages/DashboardPage.jsx`：控制台入口和状态展示。
- `frontend/src/pages/DanmakuPage.jsx`：弹幕控制台和实时信息展示。

## 后端 API

监控路由挂载在 `/api/monitor`：

- `GET /api/monitor/rooms`：读取监控房间列表。
- `POST /api/monitor/rooms`：添加监控房间。
- `POST /api/monitor/rooms/:roomId/pause`：暂停指定房间监控。
- `POST /api/monitor/rooms/:roomId/resume`：恢复指定房间监控。
- `DELETE /api/monitor/rooms/:roomId`：删除指定监控房间。

历史路由挂载在 `/api/history`：

- `GET /api/history/:roomId/sessions`：读取指定房间的历史场次列表。
- `GET /api/history/:roomId/:sessionId`：读取指定场次的历史消息。

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
        | 收到直播事件
        v
historyStorage 写入对应场次文件
```

## 房间生命周期

`roomManager` 负责：

- 加载持久化的监控房间配置。
- 添加、删除、暂停、恢复监控房间。
- 管理每个房间的直播连接。
- 将收到的消息广播给前端 WebSocket 客户端。
- 将收到的消息写入历史记录。
- 在认证状态变化或连接异常时处理重连。

监控房间配置通常保存在 `backend/data/monitored_rooms.json`。

## 历史记录

历史数据主要存储在 `backend/data/history/`。消息通常以 JSONL 形式追加保存，便于持续写入和后续逐行处理。

常见事件文件包括：

- `danmaku.jsonl`：普通弹幕。
- `gift.jsonl`：礼物。
- `guard.jsonl`：上舰/舰长相关事件。
- `superchat.jsonl`：醒目留言。

按房间和场次组织后，历史目录通常类似：

```text
backend/data/history/<roomId>/<sessionId>/
├── danmaku.jsonl
├── gift.jsonl
├── guard.jsonl
└── superchat.jsonl
```

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
- 答谢模块可能关注礼物消息和配置更新。

## 开发注意事项

- 修改历史文件结构会影响历史读取、修复脚本和已有数据兼容性。
- 后台监控应避免因单个房间失败影响其他房间。
- 删除监控房间通常不应删除历史记录，除非明确设计了数据清理功能。
- 启动修复逻辑是后台异步执行，不能把它写成阻塞启动的重任务。
- 如果新增直播事件类型，应同步设计其历史落盘策略。
