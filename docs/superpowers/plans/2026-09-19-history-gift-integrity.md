# 历史检查与礼物字段完整性实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将启动时历史整理限制为每个房间最近 5 场且仅处理有变化的文件，提供按房间和时间范围手动整理的后端 API，同时完整透传新版 protobuf 礼物信息。

**架构：** 把历史整理拆成可复用的范围过滤层：启动任务只选最近 5 场，并通过文件 mtime/检查标记跳过未变化会话；手动 API 显式传入房间和 Unix 秒时间范围，只整理范围内场次。礼物解析器继续负责 protobuf 解码和字段归一化，WebSocket 事件组装完整保留新版元数据，前端保持现有扁平事件协议。

**技术栈：** Node.js ES modules、Express、JSONL 文件存储、原生 `fs/promises`、Node `assert` 回归测试、React/Vite 现有 WebSocket 客户端。

---

## 文件结构

- 修改：`backend/src/server.js` — 启动后台整理调用改为最近 5 场增量模式。
- 修改：`backend/src/utils/historyStorage.js` — 增加按范围筛选场次、mtime 检查标记和范围整理函数；保留现有全量函数供手动维护兼容。
- 修改：`backend/src/routes/history.js` — 增加 `POST /api/history/organize`，校验房间和时间范围并返回统计。
- 修改：`backend/src/services/bilibiliLiveWS.js` — 礼物事件补齐标准化后的元数据字段。
- 修改：`backend/src/services/giftParser.js` — 标准化 `giftType`、`tid`、`rnd`、`giftInfo`、`medalInfo` 和盲盒兼容字段。
- 修改：`backend/test/gift-parser.test.js` — 覆盖新版礼物完整字段和旧版兼容。
- 创建：`backend/test/history-organize.test.js` — 覆盖最近 5 场、mtime 跳过和时间范围筛选。
- 修改：`backend/package.json` — 如测试脚本尚不存在，增加 `test` 脚本运行后端回归测试。

---

### 任务 1：为历史整理范围和增量判断建立失败测试

**文件：**
- 创建：`backend/test/history-organize.test.js`
- 修改：`backend/src/utils/historyStorage.js`（仅为导出可测试的纯筛选/判断函数预留接口，不先实现行为）

- [ ] **步骤 1：编写失败测试**

测试以下行为：

```js
import assert from 'node:assert/strict';
import {
  selectRecentSessions,
  shouldOrganizeSession,
  selectSessionsInRange
} from '../src/utils/historyStorage.js';

assert.deepEqual(
  selectRecentSessions([100, 300, 200, 500, 400, 600], 5),
  [600, 500, 400, 300, 200]
);
assert.equal(
  shouldOrganizeSession({ fileMtimeMs: 200, markerMtimeMs: 200 }),
  false
);
assert.equal(
  shouldOrganizeSession({ fileMtimeMs: 201, markerMtimeMs: 200 }),
  true
);
assert.deepEqual(
  selectSessionsInRange([100, 200, 300, 400], 180, 350),
  [200, 300]
);
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node backend/test/history-organize.test.js`

预期：FAIL，提示对应导出函数不存在或结果不匹配。

- [ ] **步骤 3：实现最少的纯函数**

在 `historyStorage.js` 导出三个纯函数：按数字降序截取最近 N 场、比较最新数据 mtime 与 marker mtime、按闭区间筛选时间戳场次。不得在这些纯函数中读取文件或修改数据。

- [ ] **步骤 4：运行测试确认通过**

运行：`node backend/test/history-organize.test.js`

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add backend/test/history-organize.test.js backend/src/utils/historyStorage.js
git commit -m "test: cover incremental history selection"
```

### 任务 2：实现最近 5 场和 mtime 增量历史整理

**文件：**
- 修改：`backend/src/utils/historyStorage.js`
- 修改：`backend/src/server.js`
- 修改：`backend/package.json`
- 测试：`backend/test/history-organize.test.js`

- [ ] **步骤 1：扩展失败测试为临时目录场景**

测试整理函数接收 `{ roomLimit: 5, startTime, endTime, force }`：

```js
const result = await organizeHistory({ roomLimit: 5, force: false });
assert.equal(result.roomsProcessed, 1);
assert.equal(result.sessionsConsidered, 5);
assert.equal(result.sessionsSkippedUnchanged >= 1, true);
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node backend/test/history-organize.test.js`

预期：FAIL，因为范围整理函数尚未实现。

- [ ] **步骤 3：实现增量整理**

实现 `organizeHistory(options = {})`：

- 默认 `recentLimit` 每个房间只选最近 5 场。
- 有时间范围时只处理 `sessionId >= startTime && sessionId <= endTime` 的场次。
- 每个房间在 `data/history/<roomId>/.organize-state.json` 保存已处理场次的最大数据文件 mtime；当前所有目标 JSONL 文件 mtime 不超过 marker 时跳过。
- 变化场次先执行相邻场次重叠修复，再执行文件排序；未变化场次不得调用重写逻辑。
- 返回整理统计。
- 手动调用传 `force: true` 时忽略 marker，但仍遵守时间范围。
- 不删除原有全量函数；新启动流程只使用增量入口。

`server.js` 启动回调改为调用：

```js
await organizeHistory({ recentLimit: 5, force: false });
```

启动日志输出统计，不再执行全量 `sortAllHistory()`。

- [ ] **步骤 4：运行测试确认通过**

运行：`node backend/test/history-organize.test.js`

预期：PASS，并确认未变化场次不会重写文件。

- [ ] **步骤 5：运行后端语法和现有回归测试**

运行：

```bash
node --check backend/src/server.js
node --check backend/src/utils/historyStorage.js
node backend/test/gift-parser.test.js
```

预期：全部退出码为 0。

- [ ] **步骤 6：Commit**

```bash
git add backend/src/server.js backend/src/utils/historyStorage.js backend/package.json backend/test/history-organize.test.js
git commit -m "perf: limit startup history maintenance"
```

### 任务 3：增加按房间和时间范围手动整理 API

**文件：**
- 修改：`backend/src/routes/history.js`
- 修改：`backend/src/utils/historyStorage.js`
- 测试：`backend/test/history-organize.test.js`

- [ ] **步骤 1：编写失败测试**

覆盖合法范围、反向范围和缺少范围三种情况，并验证 `roomId`、`startTime`、`endTime` 的有限整数校验。

- [ ] **步骤 2：运行测试确认失败**

运行：`node backend/test/history-organize.test.js`

预期：FAIL，因为验证函数和路由尚未实现。

- [ ] **步骤 3：实现 API**

在 `history.js` 增加 `POST /organize`：必须要求 `roomId`、`startTime`、`endTime`，拒绝反向范围、负数和无效数字；调用 `organizeHistory` 并返回 `{ success: true, range, stats }`。参数错误返回 400，整理异常返回 500。不允许省略时间范围。

- [ ] **步骤 4：运行 API 验证测试**

运行：`node backend/test/history-organize.test.js`

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add backend/src/routes/history.js backend/src/utils/historyStorage.js backend/test/history-organize.test.js
git commit -m "feat: add ranged history organize API"
```

### 任务 4：完整透传新版礼物元数据

**文件：**
- 修改：`backend/src/services/giftParser.js`
- 修改：`backend/src/services/bilibiliLiveWS.js`
- 修改：`backend/test/gift-parser.test.js`

- [ ] **步骤 1：编写失败测试**

扩展新版 protobuf 测试并断言最终事件包含 `giftType`、`tid`、`rnd`、`giftInfo`、`medalInfo` 和盲盒兼容字段。

- [ ] **步骤 2：运行测试确认失败**

运行：`node backend/test/gift-parser.test.js`

预期：FAIL，指出元数据缺失。

- [ ] **步骤 3：实现字段归一化和事件透传**

`normalizeGiftData` 返回完整元数据，`bilibiliLiveWS.js` 的新版礼物事件增加 `giftType`、`tid`、`rnd`、`giftInfo`、`medalInfo`、`medal`，保留现有扁平字段和盲盒兼容字段。

- [ ] **步骤 4：运行解析和集成测试确认通过**

运行：

```bash
node backend/test/gift-parser.test.js
node --check backend/src/services/giftParser.js
node --check backend/src/services/bilibiliLiveWS.js
```

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add backend/src/services/giftParser.js backend/src/services/bilibiliLiveWS.js backend/test/gift-parser.test.js
git commit -m "fix: preserve complete gift metadata"
```

### 任务 5：最终验证和集成检查

**文件：** 无新增文件；验证任务 2、3、4 的改动。

- [ ] **步骤 1：运行后端所有回归测试**

```bash
node backend/test/gift-parser.test.js
node backend/test/history-organize.test.js
node --check backend/src/server.js
node --check backend/src/routes/history.js
node --check backend/src/utils/historyStorage.js
```

- [ ] **步骤 2：进行真实直播间验证**

连接有礼物活动的直播间，确认事件包含 `giftName`、`giftId`、`giftType`、`tid`、`giftInfo`、`coinType`、`totalCoin`，并确认盲盒使用 `blindGift.gift_name`。

- [ ] **步骤 3：验证历史整理 API**

```bash
curl -X POST http://localhost:3000/api/history/organize -H "Content-Type: application/json" -d '{"roomId":"11966910","startTime":1710000000,"endTime":1720000000,"repairOverlap":true,"sort":true,"force":true}'
```

- [ ] **步骤 4：检查构建和工作区**

```bash
npm --prefix frontend run build
git diff --check
git status --short
```

- [ ] **步骤 5：最终 Commit/Push**

所有测试通过后，确认提交历史和远端状态，再推送到 `origin/main`。
