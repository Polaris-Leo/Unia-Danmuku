import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { organizeHistory } from '../src/utils/historyStorage.js';

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
      const overlap = await organizeHistory({ historyDir: migrationRoot, recentLimit: 2, force: true });
      assert.equal(overlap.sessionsProcessed, 2);
      assert.equal((await fs.readFile(path.join(migrationRoot, 'room-3', '100', 'danmaku.jsonl'), 'utf8')).trim(), '');
      assert.equal((await fs.readFile(path.join(migrationRoot, 'room-3', '200', 'danmaku.jsonl'), 'utf8')).split('\n').filter(Boolean).length, 2);
    } finally {
      await fs.rm(migrationRoot, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(overlapRoot, { recursive: true, force: true });
  }
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log('history organize tests passed');
