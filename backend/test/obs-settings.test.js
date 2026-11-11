import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import express from 'express';

const originalCwd = process.cwd();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-settings-test-'));
process.chdir(directory);
const { default: router } = await import('../src/routes/obs.js');
process.chdir(originalCwd);

const app = express();
app.use(express.json());
app.use('/api/obs', router);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(directory, { recursive: true, force: true });
});

const read = async (template) => {
  const response = await fetch(`${origin}/api/obs/settings?template=${template}`);
  assert.equal(response.status, 200);
  return (await response.json()).settings;
};

const save = async (template, settings) => {
  const response = await fetch(`${origin}/api/obs/settings?template=${template}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
};

test('an unsaved secondary template does not inherit main settings', async () => {
  await save('default', { danmakuLineHeight: 1.8, itemSpacing: 2 });
  assert.deepEqual(await read('1'), {});
});

test('each template keeps its own line height and spacing after either is saved', async () => {
  await save('default', { danmakuLineHeight: 1.8, itemSpacing: 2 });
  await save('1', { danmakuLineHeight: 0.9, itemSpacing: 0.2 });
  assert.deepEqual(await read('default'), { danmakuLineHeight: 1.8, itemSpacing: 2 });
  await save('default', { danmakuLineHeight: 1.6, itemSpacing: 1 });
  assert.deepEqual(await read('1'), { danmakuLineHeight: 0.9, itemSpacing: 0.2 });
  const response = await fetch(`${origin}/api/obs/settings/all`);
  const { templates } = await response.json();
  assert.deepEqual(templates.default, { danmakuLineHeight: 1.6, itemSpacing: 1 });
  assert.deepEqual(templates['1'], { danmakuLineHeight: 0.9, itemSpacing: 0.2 });
});
