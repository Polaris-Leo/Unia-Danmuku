import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { organizeHistory, validateHistoryOrganizeRequest } from '../src/utils/historyStorage.js';
import historyRouter from '../src/routes/history.js';

const makeSession = async (root, roomId, sessionId, timestamp = sessionId) => {
  const dir = path.join(root, String(roomId), String(sessionId));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'danmaku.jsonl'), `${JSON.stringify({ timestamp })}\n`);
};

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'history-organize-'));
try {
  for (const sessionId of [100, 200, 300, 400, 500, 600]) {
    await makeSession(root, 'room-1', sessionId);
  }

  const first = await organizeHistory({ historyDir: root, recentLimit: 5, force: false });
  assert.equal(first.roomsProcessed, 1);
  assert.equal(first.sessionsConsidered, 5);
  assert.equal(first.sessionsSkippedUnchanged, 0);
  assert.equal(first.sessionsProcessed, 5);

  const second = await organizeHistory({ historyDir: root, recentLimit: 5, force: false });
  assert.equal(second.roomsProcessed, 1);
  assert.equal(second.sessionsConsidered, 5);
  assert.equal(second.sessionsSkippedUnchanged >= 1, true);
  assert.equal(second.sessionsProcessed, 0);

  const changedFile = path.join(root, 'room-1', '600', 'danmaku.jsonl');
  const changedAt = new Date(Date.now() + 2000);
  await fs.utimes(changedFile, changedAt, changedAt);
  const changed = await organizeHistory({ historyDir: root, recentLimit: 5, force: false });
  assert.equal(changed.sessionsProcessed, 1);
  assert.equal(changed.sessionsSkippedUnchanged, 4);

  const outsideMtime = new Date(Date.now() + 40000);
  await fs.utimes(path.join(root, 'room-1', '100', 'danmaku.jsonl'), outsideMtime, outsideMtime);
  const targetMtime = new Date(Date.now() + 30000);
  await fs.utimes(changedFile, targetMtime, targetMtime);
  const scoped = await organizeHistory({ historyDir: root, recentLimit: 5, force: false });
  assert.equal(scoped.sessionsProcessed, 1);

  const outsideBeforeForce = (await fs.stat(path.join(root, 'room-1', '100', 'danmaku.jsonl'))).mtimeMs;
  const forcedRange = await organizeHistory({ historyDir: root, recentLimit: 5, startTime: 200, endTime: 400, force: true });
  assert.equal(forcedRange.sessionsConsidered, 3);
  assert.equal(forcedRange.sessionsProcessed, 3);
  assert.equal((await fs.stat(path.join(root, 'room-1', '100', 'danmaku.jsonl'))).mtimeMs, outsideBeforeForce);

  const overlapRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'history-overlap-'));
  try {
    await makeSession(overlapRoot, 'room-2', 100, 100);
    await makeSession(overlapRoot, 'room-2', 200, 250);
    const unchangedPath = path.join(overlapRoot, 'room-2', '100', 'danmaku.jsonl');
    await organizeHistory({ historyDir: overlapRoot, recentLimit: 2, force: true });
    const unchangedMtime = (await fs.stat(unchangedPath)).mtimeMs;
    const unchangedContent = await fs.readFile(unchangedPath, 'utf8');
    await fs.appendFile(path.join(overlapRoot, 'room-2', '200', 'danmaku.jsonl'), `${JSON.stringify({ timestamp: 260 })}\n`);
    const targetChanged = await organizeHistory({ historyDir: overlapRoot, recentLimit: 2, force: false });
    assert.equal(targetChanged.sessionsProcessed, 1);
    assert.equal((await fs.stat(unchangedPath)).mtimeMs, unchangedMtime);
    assert.equal(await fs.readFile(unchangedPath, 'utf8'), unchangedContent);

    const migrationRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'history-migration-'));
    try {
      await makeSession(migrationRoot, 'room-3', 100, 200);
      await makeSession(migrationRoot, 'room-3', 200, 250);
      await organizeHistory({ historyDir: migrationRoot, recentLimit: 2, startTime: 200, endTime: 200, force: true });
      const sourceBeforeMigration = (await fs.stat(path.join(migrationRoot, 'room-3', '100', 'danmaku.jsonl'))).mtimeMs;
      await fs.appendFile(path.join(migrationRoot, 'room-3', '200', 'danmaku.jsonl'), `${JSON.stringify({ timestamp: 260 })}\n`);
      const overlap = await organizeHistory({ historyDir: migrationRoot, recentLimit: 2, force: false });
      assert.equal(overlap.sessionsProcessed, 2);
      assert.equal(overlap.sessionsMigrated, 1);
      assert.equal((await fs.stat(path.join(migrationRoot, 'room-3', '100', 'danmaku.jsonl'))).mtimeMs > sourceBeforeMigration, true);
      assert.equal((await fs.readFile(path.join(migrationRoot, 'room-3', '100', 'danmaku.jsonl'), 'utf8')).trim(), '');
      assert.equal((await fs.readFile(path.join(migrationRoot, 'room-3', '200', 'danmaku.jsonl'), 'utf8')).split('\n').filter(Boolean).length, 3);
    } finally {
      await fs.rm(migrationRoot, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(overlapRoot, { recursive: true, force: true });
  }
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

const validRange = validateHistoryOrganizeRequest({ roomId: 123, startTime: 100, endTime: 200 });
assert.deepEqual(validRange, { valid: true, roomId: 123, startTime: 100, endTime: 200 });

for (const body of [
  { roomId: 123, startTime: 200, endTime: 100 },
  { roomId: 123, startTime: 100 },
  { roomId: 123, endTime: 200 },
  { startTime: 100, endTime: 200 },
  { roomId: -1, startTime: 100, endTime: 200 },
  { roomId: 123, startTime: 1.5, endTime: 200 },
  { roomId: 123, startTime: Number.NaN, endTime: 200 },
  { roomId: 123, startTime: 100, endTime: Number.POSITIVE_INFINITY },
  { roomId: true, startTime: 100, endTime: 200 },
  { roomId: [], startTime: 100, endTime: 200 },
  { roomId: ' ', startTime: 100, endTime: 200 },
  { roomId: 123, startTime: ' 100', endTime: 200 },
  { roomId: 123, startTime: '1e2', endTime: 200 },
  null
]) {
  assert.equal(validateHistoryOrganizeRequest(body).valid, false);
}

const routeStack = historyRouter.stack.find((layer) => layer.route?.path === '/organize' && layer.route.methods.post);
assert.ok(routeStack, 'POST /organize route should exist');

const invokeOrganizeRoute = async (body) => {
  let statusCode = 200;
  let payload;
  const response = {
    status(code) {
      statusCode = code;
      return response;
    },
    json(value) {
      payload = value;
      return response;
    }
  };
  await routeStack.route.stack[0].handle({ body }, response);
  return { statusCode, payload };
};

const apiResult = await invokeOrganizeRoute({ roomId: 123, startTime: 100, endTime: 200 });
assert.equal(apiResult.statusCode, 200);
assert.deepEqual(apiResult.payload.range, { roomId: 123, startTime: 100, endTime: 200 });
assert.equal(apiResult.payload.success, true);

const missingRangeResult = await invokeOrganizeRoute({ roomId: 123 });
assert.equal(missingRangeResult.statusCode, 400);
assert.equal(missingRangeResult.payload.success, false);

const nullBodyResult = await invokeOrganizeRoute(null);
assert.equal(nullBodyResult.statusCode, 400);
assert.equal(nullBodyResult.payload.success, false);

const rangeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'history-organize-range-'));
try {
  await makeSession(rangeRoot, 'room-9', 100);
  await makeSession(rangeRoot, 'room-9', 200);
  const rangeStats = await organizeHistory({
    historyDir: rangeRoot,
    roomId: 'room-9',
    startTime: 100,
    endTime: 200,
    recentLimit: null,
    force: true
  });
  assert.equal(rangeStats.sessionsConsidered, 2);
  assert.equal(rangeStats.sessionsProcessed, 2);
} finally {
  await fs.rm(rangeRoot, { recursive: true, force: true });
}

console.log('history organize tests passed');
