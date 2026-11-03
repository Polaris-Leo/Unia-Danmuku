import test from 'node:test';
import assert from 'node:assert/strict';
import { createThankYouAudioPlayer } from '../src/services/thankYouAudio.js';

// Only the browser media boundary is faked; playback/retry state uses production code.
function media(play) {
  return { currentTime: 10, play, pause() {} };
}

test('blocked autoplay is reported, suppressed for later gifts, and retried on user action', async () => {
  const statuses = [];
  let allowed = false;
  const audio = media(() => allowed
    ? Promise.resolve()
    : Promise.reject(new DOMException('User interaction required', 'NotAllowedError')));
  const player = createThankYouAudioPlayer(audio, status => statuses.push(status));
  await player.play();
  assert.deepEqual(statuses, ['blocked']);
  allowed = true;
  await player.play();
  assert.deepEqual(statuses, ['blocked']);
  // A button click must invoke play synchronously, before yielding user activation.
  let started = false;
  audio.play = () => { started = true; return Promise.resolve(); };
  const retry = player.play(true);
  assert.equal(started, true);
  await retry;
  assert.deepEqual(statuses, ['blocked', 'ready']);
  assert.equal(audio.currentTime, 0);
  await player.play();
  assert.equal(statuses.at(-1), 'ready');
});

test('a bad audio source is reported as an error rather than an autoplay block', async () => {
  const statuses = [];
  const audio = media(() => Promise.reject(new DOMException('Bad source', 'NotSupportedError')));
  const player = createThankYouAudioPlayer(audio, (status, error) => statuses.push([status, error?.name]));
  await player.play();
  await player.play();
  assert.deepEqual(statuses, [['error', 'NotSupportedError']]);
  audio.play = () => Promise.resolve();
  await player.play(true);
  assert.deepEqual(statuses.at(-1), ['ready', undefined]);
});

test('synchronous playback failures also expose a retryable error', async () => {
  const statuses = [];
  const player = createThankYouAudioPlayer(media(() => { throw new Error('Playback failed'); }),
    status => statuses.push(status));
  await player.play();
  assert.deepEqual(statuses, ['error']);
});

test('interrupted playback does not show a false audio error', async () => {
  const statuses = [];
  const player = createThankYouAudioPlayer(media(() => Promise.reject(new DOMException('Interrupted', 'AbortError'))),
    status => statuses.push(status));
  await player.play();
  assert.deepEqual(statuses, []);
});

test('changing the source or unmounting stops the old audio and ignores its late result', async () => {
  const statuses = [];
  let rejectPlayback;
  const audio = media(() => new Promise((resolve, reject) => { rejectPlayback = reject; }));
  let paused = false;
  audio.pause = () => { paused = true; };
  const player = createThankYouAudioPlayer(audio, status => statuses.push(status));
  const pending = player.play();
  player.dispose();
  assert.equal(paused, true);
  rejectPlayback(new DOMException('Blocked', 'NotAllowedError'));
  await pending;
  await player.play(true);
  assert.deepEqual(statuses, []);
});

test('an older playback attempt cannot overwrite the result of a newer attempt', async () => {
  const statuses = [];
  let rejectOld;
  const audio = media(() => new Promise((resolve, reject) => { rejectOld = reject; }));
  const player = createThankYouAudioPlayer(audio, status => statuses.push(status));
  const oldAttempt = player.play();
  audio.play = () => Promise.resolve();
  await player.play(true);
  rejectOld(new DOMException('Interrupted', 'NotAllowedError'));
  await oldAttempt;
  assert.deepEqual(statuses, ['ready']);
});
