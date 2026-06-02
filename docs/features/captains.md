# 舰长模块

## 模块职责

舰长模块负责管理直播间舰长/大航海相关数据，包括数据保存、导入、统计和在弹幕展示中的等级信息使用。

它既可以记录直播过程中收到的上舰事件，也可以从历史记录中导入舰长数据，方便后续统计和展示。

## 相关文件

### 后端

- `backend/src/routes/captain.js`：舰长 API 路由。
- `backend/src/services/captainManager.js`：舰长数据管理服务。
- `backend/src/services/roomManager.js`：直播事件中上舰消息与舰长记录联动。

### 前端

- `frontend/src/pages/CaptainPage.jsx`：舰长数据页面。
- `frontend/src/pages/CaptainPage.css`：舰长页面样式。
- `frontend/src/pages/ObsDanmakuPage.jsx`：弹幕展示时可能使用舰长等级信息。

## 后端 API

舰长路由挂载在 `/api/captains`：

- `GET /api/captains`：读取舰长列表。
- `POST /api/captains`：保存舰长数据。
- `POST /api/captains/import`：导入舰长数据。
- `GET /api/captains/stats`：读取舰长统计信息。

## 数据流

```text
CaptainPage 管理舰长数据
        |
        | /api/captains
        v
captain.js 路由
        |
        v
captainManager 读写本地舰长数据
        |
        v
其他展示模块按需使用舰长等级信息
```

## 数据存储

舰长数据属于运行时数据，通常保存在 `backend/data/captains/` 下，并按房间和月份组织。例如：

```text
backend/data/captains/<roomId>/YYYY-MM.jsonl
```

按月份分片可以避免单个文件无限增长，也方便按时间范围统计。

## 导入功能

导入接口通常用于从历史记录中补齐舰长数据。例如后台监控已经把上舰事件写入历史 `guard.jsonl` 后，可以通过导入功能把这些历史事件整理进舰长数据存储。

导入流程：

```text
历史记录 guard.jsonl
        |
        | POST /api/captains/import
        v
captain.js
        |
        v
captainManager 解析、去重、保存
```

## 与弹幕展示的关系

OBS 弹幕展示和普通弹幕页面可以根据舰长等级显示不同颜色或标识。样式配置中通常会包含总督、提督、舰长等等级对应的颜色设置。

如果修改舰长等级字段或等级命名，需要同步检查：

- `captainManager.js`
- `CaptainPage.jsx`
- `ObsDanmakuPage.jsx`
- OBS 样式配置

## 开发注意事项

- 舰长等级字段需要与前端展示逻辑保持一致。
- 导入功能应考虑重复数据、字段缺失和已有数据合并。
- 如果舰长数据参与实时弹幕渲染，修改数据结构时需要同步检查 OBS 页面。
- 舰长数据属于运行时数据，部署时需要持久化 `backend/data/`。
