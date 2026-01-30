import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import './ClockPage.css';

const ClockDisplay = ({ settings }) => {
  const [time, setTime] = useState(new Date());
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Update time
    const timer = setInterval(() => {
      setTime(new Date());
    }, 100); 

    return () => clearInterval(timer);
  }, []);

  // Autofill Logic
  useLayoutEffect(() => {
    const handleResize = () => {
        if (containerRef.current && contentRef.current) {
            const containerW = containerRef.current.clientWidth;
            const containerH = containerRef.current.clientHeight;

            // Simple robust scaling:
            // 1. Measure the natural size of the content (unscaled).
            const contentW = contentRef.current.offsetWidth;
            const contentH = contentRef.current.offsetHeight;

            if (contentW > 0 && contentH > 0) {
               // Calculate scale needed to fit width and height
               // We add a safety margin (0.9) to ensure no clipping at edges or due to rounding
               const scaleX = containerW / contentW;
               const scaleY = containerH / contentH;
               const s = Math.min(scaleX, scaleY) * 0.9;
               setScale(s);
            }
        }
    };

    // Run on mount, time update, and resize
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [time, settings.fontFamily, settings.fontWeight]); 

  if (!settings) return null;


  // Format time (Logic updated to support split rendering)
  let timeData = { hour: '00', minute: '00', second: '00', sep: ':' };
  
  try {
    const options = {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    
    if (settings.timezone && settings.timezone !== 'auto') {
      options.timeZone = settings.timezone;
    }

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(time);
    const getPart = (type) => parts.find(p => p.type === type)?.value || '00';
    
    timeData.hour = getPart('hour');
    timeData.minute = getPart('minute');
    timeData.second = getPart('second');
    
    // Try to detect separator (default is :)
    const literal = parts.find(p => p.type === 'literal' && p.value.trim().length > 0);
    if (literal) timeData.sep = literal.value;

  } catch (e) {
    // Fallback?
  }

  // Base font size for calculation (Pixels)
  // We use a fixed large size so that scaling down is smooth.
  const BASE_FONT_SIZE = 100;

  // Generate stroke shadow (Adaptive)
  const generateStrokeShadow = (widthInput, color) => {
    if (!widthInput || widthInput <= 0) return 'none';
    
    const w = parseFloat(widthInput);
    const c = color;
    
    const layers = [];
    const steps = 8; 
    const layers_count = 3; 
    const toUnit = (v) => `${v}px`;

    for (let l = 1; l <= layers_count; l++) {
        const radius = (l / layers_count) * w;
        for (let i = 0; i < steps * l; i++) {
            const angle = (i / (steps * l)) * 2 * Math.PI;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            layers.push(`${toUnit(x)} ${toUnit(y)} 0 ${c}`);
        }
    }
    
    return layers.join(', ');
  };
  
  const strokeShadow = generateStrokeShadow(settings.strokeWidth, settings.strokeColor);
  
  // Drop Shadow
  const dropShadow = settings.shadowBlur > 0 
      ? `0 0 ${settings.shadowBlur}px ${settings.shadowColor}` 
      : 'none';

  const style = {
    fontFamily: settings.fontFamily,
    fontSize: `${BASE_FONT_SIZE}px`,
    fontWeight: settings.fontWeight,
    color: settings.color,
    // Critical layout properties for centering and measuring
    display: 'inline-flex',
    justifyContent: 'center',
    lineHeight: 1, 
    whiteSpace: 'nowrap',
    transformOrigin: 'center center',
    transform: `scale(${scale})`, 
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum"',
  };

  // Helper to render segment
  const renderSegment = (text, widthCh = null) => (
      <span style={{ 
          display: 'inline-block', 
          width: widthCh ? `${widthCh}ch` : 'auto', 
          textAlign: 'center' 
      }}>
        {text}
      </span>
  );

  const renderClockContent = () => (
      <>
        {renderSegment(timeData.hour, 1.95)}
        {renderSegment(timeData.sep, 0.45)}
        {renderSegment(timeData.minute, 1.95)}
        {settings.format !== 'HH:mm' && (
            <>
                {renderSegment(timeData.sep, 0.45)}
                {renderSegment(timeData.second, 1.95)}
            </>
        )}
      </>
  );

  return (
    <div className="clock-container" ref={containerRef} style={{
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        overflow: 'hidden' // Crop anything outside
    }}>
      <div 
        className="clock-text" 
        ref={contentRef} 
        style={style}
      >
        {/* Stroke Layer */}
        <div 
            className="clock-text-stroke" 
            style={{ 
                textShadow: strokeShadow,
                fontFamily: 'inherit',
                fontWeight: 'inherit',
                fontSize: 'inherit',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: -1,
                display: 'inline-flex',
                justifyContent: 'center'
            }}
        >
          {renderClockContent()}
        </div>
        
        {/* Fill Layer with Drop Shadow */}
        <div 
            className="clock-text-fill"
            style={{
                filter: `drop-shadow(${dropShadow})`,
                display: 'inline-flex',
                justifyContent: 'center'
            }}
        >
          {renderClockContent()}
        </div>
      </div>
    </div>
  );
};

export default ClockDisplay;
