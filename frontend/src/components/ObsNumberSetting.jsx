import { useId } from 'react';
import ObsNumberInput from './ObsNumberInput';
import { toDisplayPixels } from '../utils/obsRendering';

export default function ObsNumberSetting({ label, value, onChange, min = 0, max, step = 0.01, displayHeight, unit = 'vh', resetKey }) {
  const id = useId();
  const update = (event) => {
    if (event.target.value === '') return;
    const number = Number(event.target.value);
    if (Number.isFinite(number)) onChange(Number(Math.min(max, Math.max(min, number)).toFixed(4)));
  };
  return (
    <div className="setting-item precision-setting">
      <label htmlFor={id}>{label}{unit ? ` (${unit})` : ''}：</label>
      <div className="precision-controls">
        <div className="precision-inputs">
          <input type="range" aria-label={`${label}滑块`} value={value} min={min} max={max} step={step} onChange={update} style={{ '--range-progress': `${Math.min(100, Math.max(0, (value - min) / (max - min) * 100))}%` }} />
          <ObsNumberInput id={id} value={value} min={min} max={max} step={step} onChange={onChange} resetKey={resetKey} />
        </div>
        <span className="precision-estimate">
          {unit === 'vh' ? `最终约 ${toDisplayPixels(value, displayHeight).toFixed(2)} px` : '行高倍数'}
        </span>
      </div>
    </div>
  );
}
