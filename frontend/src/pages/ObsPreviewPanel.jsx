import { useId, useState } from 'react';
import ObsPreview from './ObsPreview';
import ObsNumberInput from '../components/ObsNumberInput';
import ObsIcon from '../components/ObsIcon';
import { getDoubleResolution, getPreviewGeometry } from '../utils/obsRendering';

const modeLabels = { shadow: '经典阴影', smooth: '圆润描边', native: '原生描边' };

export default function ObsPreviewPanel({ settings, onChange, templateId }) {
  const id = useId();
  const [pixelExact, setPixelExact] = useState(false);
  const [background, setBackground] = useState('dark');
  const [compare, setCompare] = useState(false);
  const geometry = getPreviewGeometry(settings, templateId);
  const doubleResolution = getDoubleResolution(geometry);
  const mode = settings.strokeMode || 'shadow';
  const modes = compare ? ['shadow', mode === 'native' ? 'native' : 'smooth'] : [mode];
  return (
    <section className="render-preview-panel" aria-label="OBS 清晰度预览">
      <header className="preview-panel-header"><div><span className="eyebrow">LIVE CANVAS</span><h2><span className="status-dot" />实时预览</h2></div><span className="preview-sample-badge">示例弹幕</span></header>
      <div className="preview-toolbar">
        <label>轮廓样式<select aria-label="描边方式" value={mode} onChange={event => onChange({ strokeMode: event.target.value })}>
          <option value="shadow">经典阴影</option><option value="smooth">圆润描边</option><option value="native">原生描边</option>
        </select></label>
        <label>查看比例<select aria-label="查看比例" value={pixelExact ? 'exact' : 'fit'} onChange={event => setPixelExact(event.target.value === 'exact')}>
          <option value="fit">适应画布</option><option value="exact">最终像素 1:1</option>
        </select></label>
        <label>画布背景<select aria-label="预览背景" value={background} onChange={event => setBackground(event.target.value)}>
          <option value="dark">深色</option><option value="light">浅色</option><option value="checker">透明棋盘格</option>
        </select></label>
      </div>
      <div className="canvas-heading"><div><span className="canvas-label">{templateId === '1' ? '缩小版' : '主样式'}</span><span className="canvas-source">{geometry.sourceWidth} × {geometry.sourceHeight}</span></div><label className={`compare-toggle ${compare ? 'checked' : ''}`}><input type="checkbox" checked={compare} onChange={event => setCompare(event.target.checked)} /><ObsIcon name="layout" size={14} />并排对比描边</label></div>
      <div className={`preview-comparison${compare ? ' comparing' : ''}`}>
        {modes.map(renderMode => <div key={renderMode} className="preview-column">
          {compare && <div className="preview-mode-label"><span className={renderMode === 'shadow' ? '' : 'mode-accent'} />{modeLabels[renderMode]}</div>}
          <div className="preview-container"><ObsPreview settings={compare ? { ...settings, strokeMode: renderMode } : settings} geometry={geometry} pixelExact={pixelExact} background={background} /></div>
        </div>)}
      </div>
      <div className="canvas-footer"><span><span className="canvas-live-dot" />修改即时呈现</span><span>{pixelExact ? 'CSS 像素 1:1 · 可滚动查看' : '等比缩放 · 适应画布'}</span></div>
      <details className="preview-resolution"><summary><span><ObsIcon name="screen" size={17} />OBS 尺寸与精度</span><span className="resolution-mini">{geometry.displayWidth} × {Number(geometry.displayHeight.toFixed(2))} px<ObsIcon name="chevron" size={15} /></span></summary>
        <div className="resolution-content"><div className="preview-dimensions">
          {[
            ['源宽度', 'obsSourceWidth', geometry.sourceWidth],
            ['源高度', 'obsSourceHeight', geometry.sourceHeight],
            ['显示宽度', 'obsDisplayWidth', geometry.displayWidth],
          ].map(([label, key, value]) => <label key={key} htmlFor={`${id}-${key}`}>{label}<div className="dimension-input"><ObsNumberInput id={`${id}-${key}`} aria-label={label} min={16} max={8192} step={1} value={value} onChange={number => onChange({ [key]: Math.round(number) })} /><span aria-hidden="true">px</span></div></label>)}
        </div>
        <div className="preview-summary"><span>等比显示：{geometry.displayWidth} × {Number(geometry.displayHeight.toFixed(2))} px</span><span>OBS 缩放约 {(geometry.scale * 100).toFixed(2)}%</span></div>
        <button className="resolution-suggestion" type="button" disabled={!doubleResolution} onClick={() => doubleResolution && onChange(doubleResolution)}><ObsIcon name="effects" size={15} />使用 2 倍渲染参考尺寸{doubleResolution && <span>{doubleResolution.obsSourceWidth} × {doubleResolution.obsSourceHeight}</span>}</button>
        <p className="preview-help">在 OBS 浏览器源填写相同源尺寸，再等比缩放到显示尺寸。1:1 为网页 CSS 像素；实际清晰度请结合录制画面，对比 Bicubic / Lanczos 滤镜。</p></div>
      </details>
      <p className="preview-footnote">背景与并排对比仅用于预览，不会改变 OBS 画面。</p>
    </section>
  );
}
