import { useEffect, useRef } from 'react';

// Keep incomplete keyboard input local; only valid numbers reach saved settings.
export default function ObsNumberInput({ value, onChange, min, max, step = 0.01, resetKey, ...props }) {
  const inputRef = useRef(null);
  const previousResetKey = useRef(resetKey);
  useEffect(() => {
    const input = inputRef.current;
    // Let the browser retain intermediate number syntax such as "-" and "-0.".
    if (input && (document.activeElement !== input || previousResetKey.current !== resetKey)) {
      input.value = String(value);
    }
    previousResetKey.current = resetKey;
  }, [value, resetKey]);
  const update = (event) => {
    const next = event.target.value;
    const number = Number(next);
    if (next !== '' && Number.isFinite(number) && number >= min && number <= max) onChange(number);
  };
  const commit = (event) => {
    const draft = event.target.value;
    const number = Number(draft);
    const bounded = draft !== '' && Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : value;
    const next = step === 1 ? Math.round(bounded) : bounded;
    event.target.value = String(next);
    if (next !== value) onChange(next);
  };
  return <input {...props} ref={inputRef} type="number" defaultValue={value} min={min} max={max} step={step} onChange={update} onBlur={commit} />;
}
