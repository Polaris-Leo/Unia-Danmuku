import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultObsSettings, normalizeObsSettings } from '../src/utils/obsSettings.js';
import { createTextEffectVariables } from '../src/utils/obsRendering.js';

test('previous vh configuration keeps every saved field, including 12vh and zeros', () => {
  const previous = Object.freeze({
    style: 'bubbles', usernameFontSize: 12, danmakuFontSize: 4.5,
    usernameFontFamily: 'My Font', usernameFontFamilyFallback2: 'My CJK Font',
    usernameLang: 'ja', danmakuLineHeight: 1.05, usernameContentSpacing: -0.25,
    itemSpacing: 0, emotSize: 0, danmakuStrokeWidth: 0,
    danmakuGlowIntensity: 0, danmakuShadowIntensity: 0, usernameEnhancedStroke: false,
    danmakuBubbleBgStartTransparent: false, customExtension: { preserved: true },
  });
  const result = normalizeObsSettings(previous);
  for (const [key, value] of Object.entries(previous)) assert.deepEqual(result[key], value);
  assert.equal(result.strokeMode, 'shadow');
  assert.equal(result.usernameStrokeSoftness, 0);
  assert.equal(result.danmakuStrokeSoftness, 0);
  assert.equal(result.obsSettingsUnit, 'vh');
  assert.equal(createTextEffectVariables(result)['--danmaku-text-shadow'], 'none');
});

test('partial and empty old configurations receive shared defaults rather than invisible text', () => {
  assert.deepEqual(normalizeObsSettings({}), defaultObsSettings);
  for (const input of [undefined, null, [], 'invalid']) assert.deepEqual(normalizeObsSettings(input), defaultObsSettings);
  const partial = normalizeObsSettings({ danmakuLineHeight: 0.95, usernameFontSize: null });
  assert.equal(partial.usernameFontSize, 2.2);
  assert.equal(partial.danmakuFontSize, 2.6);
  assert.equal(partial.danmakuLineHeight, 0.95);
  assert.equal(partial.avatarSize, 6);
});

test('explicit old pixel configuration converts lengths once and preserves dimensionless values', () => {
  const previous = { obsSettingsUnit: 'px', usernameFontSize: 24, danmakuFontSize: 28,
    usernameStrokeWidth: 2, danmakuGlowIntensity: 0, avatarSize: 60, emotSize: 0,
    usernameContentSpacing: -2, bubblePaddingX: 40, danmakuLineHeight: 1.05,
    usernameFontWeight: 700, danmakuColor: '#aabbcc' };
  const result = normalizeObsSettings(previous);
  assert.equal(result.usernameFontSize, 2.2222);
  assert.equal(result.danmakuFontSize, 2.5926);
  assert.equal(result.usernameStrokeWidth, 0.1852);
  assert.equal(result.usernameContentSpacing, -0.1852);
  assert.equal(result.bubblePaddingX, 3.7037);
  assert.equal(result.avatarSize, 5.5556);
  assert.equal(result.danmakuGlowIntensity, 0);
  assert.equal(result.emotSize, 0);
  assert.equal(result.danmakuLineHeight, 1.05);
  assert.equal(result.usernameFontWeight, 700);
  assert.equal(result.danmakuColor, '#aabbcc');
  assert.equal(result.itemSpacing, defaultObsSettings.itemSpacing);
  assert.deepEqual(normalizeObsSettings(result), result);
  assert.equal(previous.usernameFontSize, 24);
});

test('unmarked legacy BLC imports keep vh values even with large font sizes', () => {
  // The previous importer converted a 200px CSS font into these vh values.
  const previous = { usernameFontSize: 15.7, danmakuFontSize: 18.5, avatarSize: 6, itemSpacing: 1.1 };
  const result = normalizeObsSettings(previous);
  for (const [key, value] of Object.entries(previous)) assert.equal(result[key], value);
  assert.deepEqual(normalizeObsSettings(JSON.parse(JSON.stringify(result))), result);
  assert.equal(normalizeObsSettings({ usernameFontSize: 12.8 }).usernameFontSize, 12.8);
});

test('explicit vh marker protects saved lengths even outside the editor range', () => {
  assert.equal(normalizeObsSettings({ obsSettingsUnit: 'vh', usernameFontSize: 24 }).usernameFontSize, 24);
});

test('new modes and settings survive normalization without enabling a preset', () => {
  for (const strokeMode of ['native', 'smooth', 'shadow']) {
    const result = normalizeObsSettings({ strokeMode, usernameStrokeWidth: 0.27,
      usernameStrokeSoftness: 0.02, danmakuStrokeSoftness: 0, obsSourceWidth: 1600, obsDisplayWidth: 420 });
    assert.equal(result.strokeMode, strokeMode);
    assert.equal(result.usernameStrokeWidth, 0.27);
    assert.equal(result.usernameStrokeSoftness, 0.02);
    assert.equal(result.danmakuStrokeSoftness, 0);
    assert.equal(result.obsSourceWidth, 1600);
    assert.equal(result.obsDisplayWidth, 420);
  }
  for (const strokeMode of [undefined, null, '', 'unknown']) assert.equal(normalizeObsSettings({ strokeMode }).strokeMode, 'shadow');
});
