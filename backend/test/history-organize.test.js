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

  const ranged = await organizeHistory({ historyDir: root, recentLimit: 5, startTime: 200, endTime: 400, force: true });
  assert.equal(ranged.sessionsConsidered, 3);
  assert.equal(ranged.sessionsProcessed, 3);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log('history organize tests passed');
