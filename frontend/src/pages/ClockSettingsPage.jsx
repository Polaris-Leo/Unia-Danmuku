import React, { useState, useEffect, useRef } from 'react';
import { getClockSettings, saveClockSettings } from '../services/api';
import './ClockSettingsPage.css';
import ClockDisplay from './ClockDisplay';

const ClockSettingsPage = () => {
  const [settings, setSettings] = useState({
    timezone: 'auto',
    fontFamily: 'Microsoft YaHei',
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 4,
    fontWeight: 'bold',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 0,
    format: 'HH:mm:ss'
  });

  const previewContainerRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.15); // Default scale

  useEffect(() => {
    // Calculate scale factor to adapt 1920x1080 to current preview container size
    const handleResize = () => {
        if (previewContainerRef.current) {
            const containerWidth = previewContainerRef.current.clientWidth;
            const containerHeight = previewContainerRef.current.clientHeight;
            // Target: 1920 x 1080
            // We want to fit it mostly by height or width, let's say 'contain'
            const scaleX = containerWidth / 1920;
            const scaleY = containerHeight / 1080;
            const scale = Math.min(scaleX, scaleY) * 0.9; // 0.9 for padding
            setPreviewScale(scale);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [fonts, setFonts] = useState([
    { name: '默认 (微软雅黑)', value: 'Microsoft YaHei' },
    { name: '黑体', value: 'SimHei' },
    { name: '宋体', value: 'SimSun' },
    { name: '楷体', value: 'KaiTi' },
    { name: 'Arial', value: 'Arial' },
    { name: 'Helvetica', value: 'Helvetica' },
    { name: 'Times New Roman', value: 'Times New Roman' },
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    obs: true,
    basic: true,
    style: true,
    shadow: false
  });
  const [detectedTimezone, setDetectedTimezone] = useState('');

  // Detect browser timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedTimezone(tz);
    } catch (e) {
      setDetectedTimezone('Unknown');
    }
  }, []);

  // Timezones configuration
  const timezones = [
    { value: 'auto', label: `自动识别${detectedTimezone ? ` (${detectedTimezone})` : ''}` },
    { value: 'Asia/Shanghai', label: '北京时间 (Asia/Shanghai)' },
    { value: 'Asia/Tokyo', label: '东京时间 (Asia/Tokyo)' },
    { value: 'America/New_York', label: '纽约时间 (America/New_York)' },
    { value: 'Europe/London', label: '伦敦时间 (Europe/London)' },
    { value: 'UTC', label: '协调世界时 (UTC)' }
  ];

  useEffect(() => {
    // Load settings
    getClockSettings().then(res => {
      if (res.success) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
    });

    // Load available fonts from server
    fetch('/api/fonts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Inject styles for custom fonts
          const styleId = 'clock-custom-fonts';
          let styleEl = document.getElementById(styleId);
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
          }
          
          let css = '';
          // Merge custom fonts, avoiding duplicates by name
          const existingNames = new Set(fonts.map(f => f.name));
          const newFonts = [];
          
          data.forEach(f => {
            // Add font-face rule
            css += `
              @font-face {
                font-family: '${f.family}';
                src: url('${f.url}');
                font-weight: 100 900;
                font-style: normal;
              }
            `;
            
            if (!existingNames.has(f.name)) {
                newFonts.push({ 
                    name: f.name, 
                    value: f.family 
                });
            }
          });

          styleEl.textContent = css;

          if (newFonts.length > 0) {
            setFonts(prev => [...prev, ...newFonts]);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Convert number strings to numbers
      const dataToSave = {
        ...settings,
        fontSize: Number(settings.fontSize),
        strokeWidth: Number(settings.strokeWidth),
        shadowBlur: Number(settings.shadowBlur)
      };
      
      const res = await saveClockSettings(dataToSave);
      if (res.success) {
        setMessage('设置已保存！');
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('保存失败。');
      }
    } catch (err) {
      console.error(err);
      setMessage('保存时发生错误。');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyOBSLink = () => {
    const obsLink = `${window.location.origin}/clock`;
    navigator.clipboard.writeText(obsLink).then(() => {
      alert('OBS链接已复制！\n请在OBS中添加浏览器源，并粘贴此链接。');
    }).catch(() => {
      alert('复制失败，请手动复制：\n' + obsLink);
    });
  };

  const handleOpenOBSPage = () => {
    window.open('/clock', '_blank');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Helper to render section
  const renderSection = (id, title, children) => (
    <div className="clock-setting-section">
      <div 
        className="clock-section-header" 
        onClick={() => toggleSection(id)}
      >
        <span>{title}</span>
        <span>{expandedSections[id] ? '▼' : '▶'}</span>
      </div>
      {expandedSections[id] && (
        <div className="clock-section-content">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="clock-settings-page">
      <div className="clock-settings-layout">
        
        {/* Preview Wrapper (Moved to Top) */}
        <div className="clock-preview-wrapper">
            <div className="clock-preview-container" ref={previewContainerRef}>
               <div 
                 className="clock-preview-inner" 
                 style={{ transform: `scale(${previewScale})` }}
               >
                 <ClockDisplay settings={settings} mockHeight={1080} />
               </div>
            </div>
            <div style={{textAlign: 'center', marginTop: '10px', color: '#666', fontSize: '14px'}}>
                实时预览
            </div>
        </div>

        {/* Settings Column */}
        <div className="clock-settings-container">
          <h1>时钟设置</h1>

          {renderSection('obs', 'OBS 连接', (
            <div className="clock-form-group">
              <label>OBS 浏览器源链接</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/clock`}
                  className="clock-form-control"
                  style={{ backgroundColor: '#f5f5f5', cursor: 'text' }}
                />
                <button 
                  className="clock-btn-primary" 
                  style={{ padding: '0 20px', whiteSpace: 'nowrap' }}
                  onClick={handleCopyOBSLink}
                >
                  复制链接
                </button>
                <button 
                  className="clock-btn-primary" 
                  style={{ padding: '0 20px', whiteSpace: 'nowrap', backgroundColor: '#52c41a' }}
                  onClick={handleOpenOBSPage}
                >
                  打开页面
                </button>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                说明：在OBS中添加"浏览器"源，将此链接粘贴到URL栏中。建议设置宽高为自定义大小(如 600x200)。
              </div>
            </div>
          ))}
          
          {renderSection('basic', '基本设置', (
            <>
              <div className="clock-form-group">
                <label>时区选择</label>
                <select 
                  name="timezone" 
                  value={settings.timezone || 'auto'} 
                  onChange={handleChange}
                  className="clock-form-control"
                >
                  {timezones.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>

              <div className="clock-form-group">
                <label>时间格式</label>
                <select 
                  name="format" 
                  value={settings.format || 'HH:mm:ss'} 
                  onChange={handleChange}
                  className="clock-form-control"
                >
                  <option value="HH:mm:ss">时:分:秒 (HH:mm:ss)</option>
                  <option value="HH:mm">时:分 (HH:mm)</option>
                </select>
              </div>
            </>
          ))}

          {renderSection('style', '外观样式', (
            <>
              <div className="clock-form-group">
                <label>字体</label>
                <select 
                  name="fontFamily" 
                  value={settings.fontFamily} 
                  onChange={handleChange}
                  className="clock-form-control"
                >
                  {fonts.map((font, idx) => (
                    <option key={`${font.value}-${idx}`} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size Removed - Using Auto Fill */}

              <div className="clock-form-group">
                <label>字体粗细</label>
                <select 
                  name="fontWeight" 
                  value={settings.fontWeight} 
                  onChange={handleChange}
                  className="clock-form-control"
                >
                  <option value="normal">正常 (Normal)</option>
                  <option value="bold">粗体 (Bold)</option>
                  <option value="100">极细 (100)</option>
                  <option value="300">细 (300)</option>
                  <option value="500">中等 (500)</option>
                  <option value="700">粗 (700)</option>
                  <option value="900">极粗 (900)</option>
                </select>
              </div>

              <div className="clock-form-group">
                <label>文字颜色</label>
                <div className="clock-color-input-wrapper">
                  <input 
                    type="color" 
                    name="color" 
                    value={settings.color} 
                    onChange={handleChange}
                    className="clock-form-control"
                  />
                  <input 
                    type="text" 
                    name="color" 
                    value={settings.color} 
                    onChange={handleChange}
                    className="clock-form-control"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className="clock-form-group">
                <label>描边颜色</label>
                <div className="clock-color-input-wrapper">
                  <input 
                    type="color" 
                    name="strokeColor" 
                    value={settings.strokeColor} 
                    onChange={handleChange}
                    className="clock-form-control"
                  />
                  <input 
                    type="text" 
                    name="strokeColor" 
                    value={settings.strokeColor} 
                    onChange={handleChange}
                    className="clock-form-control"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="clock-form-group">
                <label>描边粗细 (相对大小)</label>
                <input 
                  type="number" 
                  step="0.1"
                  name="strokeWidth" 
                  value={settings.strokeWidth} 
                  onChange={handleChange}
                  className="clock-form-control"
                />
              </div>
            </>
          ))}

          {renderSection('shadow', '阴影设置', (
            <>
              <div className="clock-form-group">
                <label>阴影颜色</label>
                <div className="clock-color-input-wrapper">
                  <input 
                    type="color" 
                    name="shadowColor" 
                    value={settings.shadowColor.startsWith('#') ? settings.shadowColor : '#000000'} 
                    onChange={(e) => handleChange({...e, target: {...e.target, name: 'shadowColor', value: e.target.value}})}
                    className="clock-form-control"
                  />
                  <input 
                     type="text"
                     name="shadowColor"
                     value={settings.shadowColor}
                     onChange={handleChange}
                     className="clock-form-control"
                     style={{width: '120px'}}
                     placeholder="rgba(0,0,0,0.5)"
                  />
                </div>
              </div>

              <div className="clock-form-group">
                <label>阴影模糊 (相对大小)</label>
                <input 
                  type="number" 
                  step="0.1"
                  name="shadowBlur" 
                  value={settings.shadowBlur} 
                  onChange={handleChange}
                  className="clock-form-control"
                />
              </div>
            </>
          ))}

          <div className="clock-save-actions">
            <button 
              className="clock-btn-primary" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
            {message && <div className="clock-message">{message}</div>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClockSettingsPage;
