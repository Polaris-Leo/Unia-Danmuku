import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTextEffectVariables, getPreviewGeometry, getDoubleResolution, toDisplayPixels, getStrokePresetPatch } from '../src/utils/obsRendering.js';

test('zero effects remain off in both rendering units and outline modes', () => {
  for (const unit of ['vh', 'cqh']) {
    for (const strokeMode of ['shadow', 'smooth', 'native']) {
      const styles = createTextEffectVariables({
        strokeMode,
        usernameStrokeWidth: 0, usernameGlowIntensity: 0, usernameShadowIntensity: 0,
        danmakuStrokeWidth: 0, danmakuGlowIntensity: 0, danmakuShadowIntensity: 0,
      }, unit);
      assert.equal(styles['--username-text-shadow'], 'none');
      assert.equal(styles['--danmaku-text-shadow'], 'none');
      assert.equal(styles['--danmaku-native-stroke-width'], `0${unit}`);
    }
  }
});

test('missing effects use vh defaults rather than old pixel-sized values', () => {
  const styles = createTextEffectVariables({});
  assert.match(styles['--username-text-shadow'], /0 0 0\.7vh #ffffff/);
  assert.match(styles['--username-text-shadow'], /0 0\.25vh 0\.5vh rgba/);
  assert.match(styles['--username-text-shadow'], /0\.2vh 0vh 0 #ffffff/);
});

test('native outline preserves outer width and does not also draw offset outlines', () => {
  const styles = createTextEffectVariables({
    strokeMode: 'native', danmakuStrokeWidth: 0.28,
    danmakuGlowIntensity: 0, danmakuShadowIntensity: 0,
  });
  assert.equal(styles['--danmaku-native-stroke-width'], '0.56vh');
  assert.equal(styles['--danmaku-text-shadow'], 'none');
});

test('legacy simple outline keeps four directions and respects zero shadow', () => {
  const styles = createTextEffectVariables({
    danmakuEnhancedStroke: false, danmakuStrokeWidth: 0.2,
    danmakuGlowIntensity: 0.7, danmakuShadowIntensity: 0,
  });
  assert.equal(styles['--danmaku-text-shadow'],
    '0.2vh 0vh 0 #ffffff, -0.2vh 0vh 0 #ffffff, 0vh 0.2vh 0 #ffffff, 0vh -0.2vh 0 #ffffff');
});

test('preview and source use identical numeric effects with different units', () => {
  const config = { usernameGlowIntensity: 0, danmakuStrokeWidth: 0.27 };
  const source = createTextEffectVariables(config, 'vh');
  const preview = createTextEffectVariables(config, 'cqh');
  for (const key of Object.keys(source)) {
    assert.equal(preview[key], source[key].replaceAll('vh', 'cqh'));
  }
});

test('pixel estimates and double rendering follow the final display size', () => {
  const geometry = getPreviewGeometry({}, '1');
  assert.equal(geometry.sourceWidth, 2400);
  assert.equal(geometry.sourceHeight, 3000);
  assert.equal(geometry.displayWidth, 420);
  assert.equal(geometry.displayHeight, 525);
  assert.equal(geometry.scale, 0.175);
  assert.equal(toDisplayPixels(5, geometry.displayHeight), 26.25);
  assert.equal(toDisplayPixels(0.28, geometry.displayHeight), 1.47);
  assert.deepEqual(getDoubleResolution(geometry), { obsSourceWidth: 840, obsSourceHeight: 1050 });
});

test('dimensions preserve aspect and isolate defaults for the two templates', () => {
  assert.equal(getPreviewGeometry({}).displayHeight, 1025);
  const geometry = getPreviewGeometry({ obsSourceWidth: 1600, obsSourceHeight: 900, obsDisplayWidth: 800 });
  assert.equal(geometry.displayHeight, 450);
  assert.equal(toDisplayPixels(2.5, geometry.displayHeight), 11.25);
});

test('smooth outlines fill inner radii so narrow glyphs keep continuous coverage', () => {
  for (const enhanced of [true, false]) {
    const effect = createTextEffectVariables({ strokeMode: 'smooth', danmakuEnhancedStroke: enhanced, danmakuStrokeWidth: 0.6, danmakuGlowIntensity: 0, danmakuShadowIntensity: 0 });
    const points = effect['--danmaku-text-shadow'].split(', ').map(shadow => shadow.split(' ').map(parseFloat));
    // A 26px Arial period needs overlapping coverage throughout a 6px outline.
    // Using outer samples alone leaves its dot disconnected from the outline.
    for (let radius = 0; radius <= 0.6; radius += 0.01) {
      for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 32) {
        const x = radius * Math.cos(angle), y = radius * Math.sin(angle);
        const gap = Math.min(Math.hypot(x, y), ...points.map(([px, py]) => Math.hypot(x - px, y - py)));
        assert.ok(gap < 0.17, `Uncovered outline at radius ${radius}, angle ${angle}`);
      }
    }
    assert.equal(effect['--danmaku-native-stroke-width'], '0vh');
  }
});

test('smooth edge feathering is bounded by outline width and keeps zero explicit', () => {
  for (const unit of ['vh', 'cqh']) {
    const config = { strokeMode: 'smooth', danmakuStrokeWidth: 0.24, danmakuStrokeSoftness: 0.025, danmakuGlowIntensity: 0, danmakuShadowIntensity: 0 };
    const shadows = createTextEffectVariables(config, unit)['--danmaku-text-shadow'].split(', ');
    assert.equal(shadows.length, 84);
    assert.ok(shadows.every(shadow => shadow.split(' ')[2] === `0.025${unit}`));
    const hard = createTextEffectVariables({ ...config, danmakuStrokeSoftness: 0 }, unit)['--danmaku-text-shadow'].split(', ');
    assert.ok(hard.every(shadow => shadow.split(' ')[2] === '0'));
    const limited = createTextEffectVariables({ ...config, danmakuStrokeSoftness: 99 }, unit)['--danmaku-text-shadow'].split(', ');
    assert.ok(limited.every(shadow => parseFloat(shadow.split(' ')[2]) <= 0.24 * 0.15));
    const off = createTextEffectVariables({ ...config, danmakuStrokeWidth: 0 }, unit);
    assert.equal(off['--danmaku-text-shadow'], 'none');
    for (const strokeMode of ['native', 'shadow']) {
      assert.deepEqual(createTextEffectVariables({ ...config, strokeMode, danmakuStrokeSoftness: 0 }, unit), createTextEffectVariables({ ...config, strokeMode }, unit));
    }
  }
});

test('round presets include independent edge softness without changing legacy defaults', () => {
  assert.equal(getStrokePresetPatch('soft').danmakuStrokeSoftness, 0.025);
  assert.equal(getStrokePresetPatch('contrast').usernameStrokeSoftness, 0.01);
  assert.equal(getStrokePresetPatch('crisp').danmakuStrokeSoftness, 0);
  const missing = createTextEffectVariables({ strokeMode: 'smooth', danmakuGlowIntensity: 0, danmakuShadowIntensity: 0 });
  assert.ok(missing['--danmaku-text-shadow'].split(', ').every(shadow => shadow.split(' ')[2] === '0'));
});

test('outline presets keep typography, spacing and dimensions intact', () => {
  const existing = { usernameFontSize: 4.5, danmakuLineHeight: 1.05, obsSourceWidth: 2400 };
  const patch = getStrokePresetPatch('crisp');
  const result = { ...existing, ...patch };
  for (const [key, value] of Object.entries(existing)) assert.equal(result[key], value);
  assert.equal(result.strokeMode, 'native');
  assert.equal(result.danmakuGlowIntensity, 0);
  assert.equal(result.usernameStrokeWidth, result.danmakuStrokeWidth);
  assert.equal(getStrokePresetPatch('unknown'), null);
});

test('invalid dimensions recover and oversized double rendering is unavailable', () => {
  const geometry = getPreviewGeometry({ obsSourceWidth: 'bad', obsSourceHeight: 0, obsDisplayWidth: null });
  assert.equal(geometry.sourceWidth, 2400);
  assert.equal(geometry.sourceHeight, 3000);
  assert.equal(geometry.displayWidth, 820);
  const large = getPreviewGeometry({ obsSourceWidth: 99999, obsDisplayWidth: 9000 });
  assert.equal(large.sourceWidth, 8192);
  assert.equal(large.displayWidth, 8192);
  assert.equal(getDoubleResolution(large), null);
  const wide = getPreviewGeometry({ obsSourceWidth: 8192, obsSourceHeight: 16, obsDisplayWidth: 16 });
  assert.equal(getDoubleResolution(wide), null);
});
