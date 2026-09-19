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

console.log('history organize tests passed');
