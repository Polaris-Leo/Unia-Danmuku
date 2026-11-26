export const defaultObsSettings = Object.freeze({
  obsSettingsUnit: 'vh',
  style: 'default',
  strokeMode: 'shadow',
  usernameFontFamily: 'Microsoft YaHei',
  usernameFontSize: 2.2, // vh
  usernameFontWeight: 'bold',
  usernameColor: '#333333',
  usernameColorGuard1: '#ff1a75', // 总督
  usernameColorGuard2: '#9b39f4', // 提督
  usernameColorGuard3: '#1fa3f1', // 舰长
  usernameColorAnchorStart: '#ff0000', // 主播渐变起始
  usernameColorAnchorEnd: '#ff0000', // 主播渐变结束
  usernameStrokeWidth: 0.2, // vh
  usernameStrokeSoftness: 0,
  usernameStrokeColor: '#ffffff',
  usernameEnhancedStroke: true, // 启用增强描边
  usernameGlowIntensity: 0.7, // vh
  usernameShadowIntensity: 0.5, // vh
  usernameFontFamilyFallback: '', // 用户名备用字体
  usernameFontFamilyFallback2: '', // 用户名备用字体2
  usernameFontWeightFallback: 'normal', // 用户名备用字体粗细
  usernameLang: 'zh-CN', // 用户名语言变体
  danmakuFontFamily: 'Microsoft YaHei',
  danmakuFontSize: 2.6, // vh
  danmakuFontWeight: 'normal',
  danmakuColor: '#333333',
  danmakuColorAnchorStart: '#ff0000', // 主播弹幕渐变起始
  danmakuColorAnchorEnd: '#ff0000', // 主播弹幕渐变结束
  danmakuStrokeWidth: 0.2, // vh
  danmakuStrokeSoftness: 0,
  danmakuStrokeColor: '#ffffff',
  danmakuEnhancedStroke: true, // 启用增强描边
  danmakuGlowIntensity: 0.7, // vh
  danmakuShadowIntensity: 0.5, // vh
  danmakuFontFamilyFallback: '', // 弹幕备用字体
  danmakuFontFamilyFallback2: '', // 弹幕备用字体2
  danmakuFontWeightFallback: 'normal', // 弹幕备用字体粗细
  danmakuLang: 'zh-CN', // 弹幕语言变体
  danmakuLineHeight: 1.5, // 弹幕行间距
  usernameContentSpacing: 0.37, // 用户名和弹幕内容间距 vh
  avatarSize: 6.0, // vh
  itemSpacing: 1.1, // vh
  emotSize: 3.3, // vh
  bubblePaddingX: 3.7, // vh, 气泡左右内边距
  // 气泡渐变色设置
  danmakuBubbleBgStart: '#ffa8d7',
  danmakuBubbleBgEnd: '#ffa8d7',
  danmakuBubbleBgStartTransparent: true,
  scBubbleBgStart: '#c3a4f5',
  scBubbleBgEnd: '#c3a4f5',
  scBubbleBgStartTransparent: true,
});

const lengthFields = [
  'usernameFontSize', 'usernameStrokeWidth', 'usernameStrokeSoftness', 'usernameGlowIntensity', 'usernameShadowIntensity',
  'danmakuFontSize', 'danmakuStrokeWidth', 'danmakuStrokeSoftness', 'danmakuGlowIntensity', 'danmakuShadowIntensity',
  'avatarSize', 'itemSpacing', 'emotSize', 'usernameContentSpacing', 'bubblePaddingX',
];

// Use one read path for API settings, legacy browser caches, and the OBS source.
// This returns a new object; loading never rewrites the stored configuration.
export const normalizeObsSettings = (saved) => {
  const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  const result = { ...defaultObsSettings, ...source };
  for (const [key, value] of Object.entries(defaultObsSettings)) {
    if (result[key] === null || result[key] === undefined) result[key] = value;
  }

  // Unmarked saved settings already use vh, including values from BLC
  // imports. Font size cannot reliably distinguish vh from pixels.
  const pixels = source.obsSettingsUnit === 'px';
  if (pixels) {
    for (const key of lengthFields) {
      if (source[key] === null || source[key] === undefined || source[key] === '') continue;
      const number = Number.parseFloat(source[key]);
      if (Number.isFinite(number)) result[key] = Number((number / 10.8).toFixed(4));
    }
  }
  result.obsSettingsUnit = 'vh';
  if (!['shadow', 'native', 'smooth'].includes(result.strokeMode)) result.strokeMode = 'shadow';
  return result;
};
