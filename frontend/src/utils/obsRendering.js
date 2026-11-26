const finite = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const length = (value, unit) => `${Number(value.toFixed(6))}${unit}`;

// Cache unit-circle coordinates; editing effects should not repeat trigonometry.
const smoothSamples = [
  [[1 / 3, 8], [2 / 3, 16], [1, 24]],
  [[1 / 3, 12], [2 / 3, 24], [1, 48]],
].map(rings => rings.flatMap(([radius, count]) => Array.from({ length: count }, (_, index) => {
  const angle = index * 2 * Math.PI / count;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
})));

export const getStrokeSoftness = (settings, type) => {
  const width = Math.max(0, finite(settings[`${type}StrokeWidth`], 0.2));
  // A small cap keeps this an edge treatment, rather than a second glow.
  return Number(Math.min(width * 0.15, 0.08, Math.max(0, finite(settings[`${type}StrokeSoftness`], 0))).toFixed(6));
};

const dimension = (value, fallback) => {
  const number = finite(value, fallback);
  return number > 0 ? Math.max(16, Math.min(8192, Math.round(number))) : fallback;
};

export const getPreviewGeometry = (settings, templateId = 'default') => {
  const sourceWidth = dimension(settings.obsSourceWidth, 2400);
  const sourceHeight = dimension(settings.obsSourceHeight, 3000);
  const displayWidth = dimension(settings.obsDisplayWidth, templateId === '1' ? 420 : 820);
  const scale = displayWidth / sourceWidth;
  return { sourceWidth, sourceHeight, displayWidth, displayHeight: sourceHeight * scale, scale };
};

export const toDisplayPixels = (value, displayHeight) =>
  Number((finite(value, 0) * displayHeight / 100).toFixed(4));

export const getDoubleResolution = ({ displayWidth, displayHeight }) => {
  const width = Math.round(displayWidth * 2);
  const height = Math.round(displayHeight * 2);
  return width >= 16 && height >= 16 && width <= 8192 && height <= 8192
    ? { obsSourceWidth: width, obsSourceHeight: height }
    : null;
};

export const strokePresets = [
  { id: 'crisp', label: '清晰细描边', description: '利落轮廓 · 轻投影', mode: 'native', width: 0.18, glow: 0, shadow: 0.12, softness: 0 },
  { id: 'soft', label: '圆润柔光', description: '圆角轮廓 · 柔和光晕', mode: 'smooth', width: 0.24, glow: 0.22, shadow: 0.14, softness: 0.025 },
  { id: 'contrast', label: '高对比', description: '醒目轮廓 · 复杂背景', mode: 'smooth', width: 0.32, glow: 0, shadow: 0.22, softness: 0.01 },
];

export const getStrokePresetPatch = (id) => {
  const preset = strokePresets.find(item => item.id === id);
  if (!preset) return null;
  const patch = { strokeMode: preset.mode };
  for (const type of ['username', 'danmaku']) {
    patch[`${type}StrokeWidth`] = preset.width;
    patch[`${type}StrokeSoftness`] = preset.softness;
    patch[`${type}GlowIntensity`] = preset.glow;
    patch[`${type}ShadowIntensity`] = preset.shadow;
    patch[`${type}EnhancedStroke`] = true;
  }
  return patch;
};

// The same effects are used with vh in OBS and cqh in the preview.
export const createTextEffectVariables = (settings, unit = 'vh') => {
  const result = {};
  for (const type of ['username', 'danmaku']) {
    const width = Math.max(0, finite(settings[`${type}StrokeWidth`], 0.2));
    const glow = Math.max(0, finite(settings[`${type}GlowIntensity`], 0.7));
    const shadow = Math.max(0, finite(settings[`${type}ShadowIntensity`], 0.5));
    const color = settings[`${type}StrokeColor`] || '#ffffff';
    const enhanced = settings[`${type}EnhancedStroke`] !== false;
    const native = settings.strokeMode === 'native';
    const shadows = [];
    if (settings.strokeMode === 'smooth' && width > 0) {
      // Fill the disk, not just its perimeter: a single ring disconnects dots
      // and narrow strokes when the outline is wider than the glyph itself.
      const softness = getStrokeSoftness(settings, type);
      const blur = softness > 0 ? length(softness, unit) : '0';
      for (const [x, y] of smoothSamples[enhanced ? 1 : 0]) {
        shadows.push(`${length(width * x, unit)} ${length(width * y, unit)} ${blur} ${color}`);
      }
    } else if (!native && width > 0) {
      const layers = enhanced ? [0.33, 0.66, 1] : [1];
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      if (enhanced) directions.push([0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]);
      for (const layer of layers) {
        for (const [x, y] of directions) {
          shadows.push(`${length(width * layer * x, unit)} ${length(width * layer * y, unit)} 0 ${color}`);
        }
      }
    }
    if (enhanced && glow > 0) shadows.push(`0 0 ${length(glow, unit)} ${color}`);
    if (shadow > 0) {
      shadows.push(`0 ${length(shadow * (enhanced ? 0.5 : 1), unit)} ${length(shadow, unit)} rgba(0,0,0,${enhanced ? '0.6' : '0.5'})`);
    }
    result[`--${type}-text-shadow`] = shadows.join(', ') || 'none';
    // Native strokes are centered; doubling their width preserves the outer radius.
    result[`--${type}-native-stroke-width`] = length(native ? width * 2 : 0, unit);
    result[`--${type}-stroke-color`] = color;
  }
  return result;
};
