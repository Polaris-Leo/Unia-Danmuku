import { useState } from 'react';
import ObsIcon from './ObsIcon';
import ObsNumberSetting from './ObsNumberSetting';
import { getStrokePresetPatch, getStrokeSoftness, strokePresets } from '../utils/obsRendering';

export default function ObsStrokeSettings({ settings, onChange, displayHeight, templateId }) {
  const [type, setType] = useState('danmaku');
  const width = settings[`${type}StrokeWidth`] ?? 0.2;
  const softnessMax = Number(Math.min(0.08, Math.max(0, width) * 0.15).toFixed(6));
  const update = (suffix, value) => onChange({ [`${type}${suffix}`]: value });
  const matches = preset => Object.entries(getStrokePresetPatch(preset.id)).every(([key, value]) => settings[key] === value);
  return <div className="stroke-editor">
    <div className="editor-intro"><span className="eyebrow">TEXT EFFECTS</span><h2>让每一个字，都清楚一点</h2><p>选择喜欢的轮廓，再微调到刚刚好。</p></div>
    <div className="stroke-presets" aria-label="描边预设">
      {strokePresets.map(preset => <button key={preset.id} type="button" className={`stroke-preset ${matches(preset) ? 'selected' : ''}`} aria-pressed={matches(preset)} onClick={() => onChange(getStrokePresetPatch(preset.id))}>
        <span className={`preset-sample preset-${preset.id}`}>Aa<span>好</span></span>
        <strong>{preset.label}</strong><small>{preset.description}</small>
        {matches(preset) && <span className="preset-check"><ObsIcon name="check" size={12} /></span>}
      </button>)}
    </div>
    <p className="preset-note">预设同时调整用户名与弹幕的描边、柔边、发光和投影。</p>
    <div className="stroke-manual">
      <div className="control-heading"><h3>细节调节</h3><span className="subtle">自定义你的文字质感</span></div>
      <div className="stroke-target segmented" role="group" aria-label="调节对象">
        <button type="button" aria-pressed={type === 'danmaku'} onClick={() => setType('danmaku')}>弹幕内容</button>
        <button type="button" aria-pressed={type === 'username'} onClick={() => setType('username')}>用户名</button>
      </div>
      <div className="setting-item"><label htmlFor="stroke-render-mode">轮廓算法</label><select id="stroke-render-mode" value={settings.strokeMode || 'shadow'} onChange={event => onChange({ strokeMode: event.target.value })}>
        <option value="smooth">圆润描边 · 48 向精细轮廓</option><option value="native">原生描边 · 精细边缘</option><option value="shadow">经典阴影 · 兼容原样式</option>
      </select></div>
      <p className="algorithm-hint">{settings.strokeMode === 'smooth' ? '加密圆周采样，配合轻微柔边，让转角与细小字符更自然。' : settings.strokeMode === 'native' ? '先画轮廓、再填充文字，保留字形内部细节。' : '保留经典多层阴影效果，适合沿用原来的发光风格。'}</p>
      <ObsNumberSetting key={`${type}-width`} label="描边宽度" value={settings[`${type}StrokeWidth`] ?? 0.2} onChange={value => update('StrokeWidth', value)} max={0.6} displayHeight={displayHeight} resetKey={templateId} />
      {settings.strokeMode === 'smooth' && width > 0 && <>
        <ObsNumberSetting key={`${type}-softness`} label="边缘柔化" value={getStrokeSoftness(settings, type)} onChange={value => update('StrokeSoftness', value)} max={softnessMax} step={0.001} displayHeight={displayHeight} resetKey={templateId} />
        <p className="algorithm-hint">只柔化描边，文字填充保持清晰。设为 0 可保留硬边。</p>
      </>}
      <div className="setting-item stroke-color"><label htmlFor="stroke-color-value">描边颜色</label>
        <input aria-label="描边色板" type="color" value={settings[`${type}StrokeColor`] || '#ffffff'} onChange={event => update('StrokeColor', event.target.value)} />
        <input id="stroke-color-value" type="text" value={settings[`${type}StrokeColor`] || '#ffffff'} onChange={event => update('StrokeColor', event.target.value)} />
      </div>
      <div className="effect-divider" />
      <ObsNumberSetting key={`${type}-glow`} label="外发光强度" value={settings[`${type}GlowIntensity`] ?? 0.7} onChange={value => update('GlowIntensity', value)} max={1.5} displayHeight={displayHeight} resetKey={templateId} />
      <ObsNumberSetting key={`${type}-shadow`} label="阴影强度" value={settings[`${type}ShadowIntensity`] ?? 0.5} onChange={value => update('ShadowIntensity', value)} max={1.5} displayHeight={displayHeight} resetKey={templateId} />
      <label className="effect-switch"><span><strong>增强轮廓</strong><small>更密的轮廓采样，并启用外发光</small></span><input type="checkbox" checked={settings[`${type}EnhancedStroke`] !== false} onChange={event => update('EnhancedStroke', event.target.checked)} /></label>
    </div>
    <div className="editor-tip"><ObsIcon name="effects" /><p>小尺寸弹幕建议先选「清晰细描边」，再切换 1:1 观察。保存后应用到当前模板。</p></div>
  </div>;
}
