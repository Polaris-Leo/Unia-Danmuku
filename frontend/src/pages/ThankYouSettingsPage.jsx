import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ThankYouSettingsPage.css';

const defaultConfig = {
  // Image & Audio
  audioEnabled: true,
  backgroundImg: '', 
  audioUrl: '', // Custom audio URL
  imageHeight: 500, // New: Image Height (Scaled for 2000x2000)
  globalScale: 1.0, // New: Global Scale Factor
  
  // Text Style
  template: '感谢 {sender} 的 {gift} * {count} ({price} 元)',
  blindboxTemplate: '感谢 {sender} 的 {blindbox_name} * {count}, 爆出 {gift} ({price} 元)', // New
  guardTemplate: '感谢 {sender} 开通 {gift} * {count}',
  scTemplate: '感谢 {sender} 的醒目留言 ({price} 元): {content}',
  fontFamily: 'Microsoft YaHei',
  fontSize: 50,
  fontColor: '#000000',
  fontWeight: 'normal',
  textSpacing: 0, // New: Spacing between image and text
  
  // Advanced Text Style
  strokeWidth: 0,
  strokeColor: '#ffffff',
  glowIntensity: 0,
  shadowIntensity: 0,
  highlightKeywords: false,
  highlightColor: '#ff0000',

  // Gift
  minPrice: 9.9,
  ignoreFree: true,
  blindboxCalcOriginal: false, // New: Blindbox calculation mode
  
  // Animation
  stayDuration: 5, // seconds
  animationDuration: 1, // seconds
  animationType: 'fadein'
};

const ThankYouSettingsPage = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(localStorage.getItem('lastRoomId') || '');
  
  const [config, setConfig] = useState(defaultConfig);

  const [previewIndex, setPreviewIndex] = useState(0);
  
  const previewSamples = [
    {
      user: { username: '普通用户A', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      giftName: '星愿水晶球',
      num: 1,
      price: 100000, // 100 CNY
      totalPrice: 100,
      giftType: 'gift'
    },
    {
      user: { username: '盲盒欧皇', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      giftName: '浪漫城堡', // This is the gift name (what was opened)
      blindboxName: '心动盲盒', // The blindbox name
      num: 1,
      price: 15000, // Cost: 15 CNY
      blindItemPrice: 2233000, // Value: 2233 CNY
      totalPrice: 15,
      giftType: 'blindbox'
    },
    {
      user: { username: '大航海家', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      giftName: '舰长',
      num: 1,
      price: 138000,
      totalPrice: 138,
      giftType: 'guard'
    },
    {
      user: { username: '富哥SC', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      giftName: '醒目留言',
      num: 1,
      price: 30000,
      totalPrice: 30,
      content: '主播好可爱！',
      giftType: 'sc'
    }
  ];

  const previewData = previewSamples[previewIndex];

  useEffect(() => {
    // Removed simple interval
  }, []);

  const [previewBgDark, setPreviewBgDark] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState('style'); // default open
  const [previewOverrides, setPreviewOverrides] = useState({ backgroundImg: null, audioUrl: null });
  const [pendingFiles, setPendingFiles] = useState({ backgroundImg: null, audioUrl: null });
  const [showPreview, setShowPreview] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (roomId) {
      axios.get(`/api/thankyou/${roomId}`)
        .then(res => {
          if (res.data.config) {
            setConfig(prev => ({ ...prev, ...res.data.config }));
          } else {
            setConfig(defaultConfig);
          }
        })
        .catch(err => console.error(err));
    } else {
      const savedConfig = localStorage.getItem('thankYouConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      } else {
        setConfig(defaultConfig);
      }
    }
  }, [roomId]);

  // Preview Cycle Logic (Show -> Stay -> Exit -> Hide -> Next)
  useEffect(() => {
    let stayTimer;
    let exitTimer;
    let nextTimer;

    const runCycle = () => {
      setShowPreview(true);
      setIsExiting(false);
      
      // Stay Duration
      const stayMs = (config.stayDuration || 5) * 1000;
      const animMs = (config.animationDuration || 1) * 1000;
      
      stayTimer = setTimeout(() => {
        // Start Exit Animation
        setIsExiting(true);
        
        // Wait for animation to finish then hide
        exitTimer = setTimeout(() => {
          setShowPreview(false);
          setIsExiting(false);
          
          // Gap before next message (1s)
          nextTimer = setTimeout(() => {
            setPreviewIndex(prev => (prev + 1) % previewSamples.length);
            runCycle();
          }, 1000);
        }, animMs);
        
      }, stayMs);
    };

    // Start the cycle
    runCycle();

    return () => {
      clearTimeout(stayTimer);
      clearTimeout(exitTimer);
      clearTimeout(nextTimer);
    };
  }, [config.stayDuration, config.animationDuration]);

  // Audio Preview Effect - Only play when showing
  useEffect(() => {
    if (showPreview && previewAudio && config.audioEnabled) {
      const src = previewOverrides.audioUrl || config.audioUrl;
      if (src) {
        const audio = new Audio(src);
        audio.play().catch(e => {
          // Ignore autoplay policy errors
          if (e.name !== 'NotAllowedError') {
            console.error('Audio play failed', e);
          }
        });
      }
    }
  }, [previewIndex, showPreview, previewAudio, config.audioEnabled, config.audioUrl, previewOverrides.audioUrl]);

  const saveConfig = async (newConfig) => {
    setConfig(newConfig);
    if (roomId) {
      try {
        await axios.post(`/api/thankyou/${roomId}`, newConfig);
      } catch (err) {
        console.error('Failed to save config', err);
      }
    } else {
      localStorage.setItem('thankYouConfig', JSON.stringify(newConfig));
    }
  };

  const handleTest = async () => {
    if (!roomId) {
      alert('请先输入直播间ID');
      return;
    }

    // Send all samples in sequence
    for (const item of previewSamples) {
      let type = 'gift';
      let data = {
        user: item.user,
        num: item.num,
        price: item.price,
        timestamp: Date.now()
      };

      if (item.giftType === 'guard') {
        type = 'guard';
        data.giftName = item.giftName;
      } else if (item.giftType === 'sc') {
        type = 'superchat';
        data.price = item.totalPrice; // SC uses RMB directly usually
        data.message = item.content;
      } else if (item.giftType === 'blindbox') {
        type = 'gift';
        data.giftName = item.blindboxName;
        data.coinType = 'gold';
        data.blindGift = {
          gift_name: item.giftName,
          original_price: item.blindItemPrice || item.price 
        };
      } else {
        // Normal gift
        type = 'gift';
        data.giftName = item.giftName;
        data.coinType = 'gold';
      }

      try {
        await axios.post('/api/danmaku/test', {
          roomId,
          type,
          data
        });
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error('Test failed', err);
      }
    }
  };

  const handleManualSave = async () => {
    let newConfig = { ...config };
    console.log('Starting save. Current config:', config);
    console.log('Pending files:', pendingFiles);
    
    // Upload pending files
    for (const [type, file] of Object.entries(pendingFiles)) {
      if (file) {
        const formData = new FormData();
        // Append roomId BEFORE file so multer can access it in req.body
        formData.append('roomId', roomId || 'common'); 
        formData.append('file', file);
        try {
          const res = await axios.post('/api/thankyou/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          console.log('Full upload response:', res.data);
          
          // Handle both string and object responses just in case
          const responseData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          
          if (responseData.success) {
            if (responseData.url) {
              newConfig[type] = responseData.url;
              console.log(`Uploaded ${type}: ${responseData.url}`);
            } else {
              console.error(`Upload successful but no URL returned for ${type}`, responseData);
              alert(`上传成功但未返回文件路径，请检查后端日志。`);
            }
          }
        } catch (err) {
          console.error(`Failed to upload ${type}`, err);
          alert(`上传 ${type} 失败: ` + (err.response?.data?.message || err.message));
          return; // Stop saving if upload fails
        }
      }
    }

    console.log('Final config to save:', newConfig);

    // Clear pending files and overrides after successful upload
    setPendingFiles({ backgroundImg: null, audioUrl: null });
    setPreviewOverrides({ backgroundImg: null, audioUrl: null });
    
    // Save final config
    await saveConfig(newConfig);
    alert('保存成功！');
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Immediate preview using FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewOverrides(prev => ({ ...prev, [type]: e.target.result }));
    };
    reader.readAsDataURL(file);

    // Store file for later upload
    setPendingFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置吗？')) {
      localStorage.removeItem('thankYouConfig');
      window.location.reload();
    }
  };

  const handleGenerate = async () => {
    if (!roomId) {
      alert('请输入直播间ID');
      return;
    }
    localStorage.setItem('lastRoomId', roomId);
    
    // Save pending files and config first
    await handleManualSave();
    
    const link = `${window.location.origin}/thankyou?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('答谢姬链接已复制到剪贴板！\n请在OBS中添加浏览器源，粘贴此链接。');
    });
  };

  const togglePanel = (panel) => {
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  // Helper to scale px values based on globalScale
  // Returns cqh (Container Query Height) for the preview
  // 1080px = 100cqh
  const toPreviewUnit = (px) => {
    const val = parseFloat(px);
    if (isNaN(val)) return '0cqh';
    const scale = config.globalScale || 1.0;
    // val / 10.8 gives the percentage of 1080p height
    return `${(val / 10.8 * scale).toFixed(3)}cqh`;
  };

  // Generate Text Shadow (Same logic as ObsDanmakuPage)
  const generateTextShadow = (strokeWidth, strokeColor, glowIntensity, shadowIntensity) => {
    const layers = [0.33, 0.66, 1];
    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]
    ];
    
    // Convert input value to em (relative to font size)
    // Assuming input 100 = 1em (100% of font size)
    // So input 5 = 0.05em
    const toEm = (val) => `${(val / 100).toFixed(3)}em`;
    
    let shadows = [];
    
    // Stroke
    if (strokeWidth > 0) {
      layers.forEach(layer => {
        const w = strokeWidth * layer;
        directions.forEach(dir => {
          shadows.push(`${toEm(w * dir[0])} ${toEm(w * dir[1])} 0 ${strokeColor}`);
        });
      });
    }
    
    // Glow
    if (glowIntensity > 0) {
      shadows.push(`0 0 ${toEm(glowIntensity)} ${strokeColor}`);
    }
    
    // Shadow
    if (shadowIntensity > 0) {
      shadows.push(`0 ${toEm(shadowIntensity * 0.5)} ${toEm(shadowIntensity)} rgba(0,0,0,0.6)`);
    }
    
    return shadows.join(', ');
  };

  const renderPreviewMessage = () => {
    let template = config.template;
    
    if (previewData.giftType === 'guard') template = config.guardTemplate;
    else if (previewData.giftType === 'blindbox') template = config.blindboxTemplate;
    else if (previewData.giftType === 'sc') template = config.scTemplate;

    const replacements = {
      '{sender}': previewData.user.username,
      '{gift}': previewData.giftName,
      '{count}': previewData.num,
      '{price}': previewData.totalPrice ? parseFloat(previewData.totalPrice.toFixed(1)) : '0',
      '{blindbox_name}': previewData.blindboxName || previewData.giftName,
      '{content}': previewData.content || ''
    };

    // If no highlighting, just do string replace
    if (!config.highlightKeywords) {
      let text = template;
      for (const [key, value] of Object.entries(replacements)) {
        text = text.split(key).join(value);
      }
      return text;
    }

    // If highlighting, we need to split the string by the placeholders
    const keys = Object.keys(replacements).map(k => k.replace(/[{}]/g, '\\$&')); // escape { }
    const regex = new RegExp(`(${keys.join('|')})`, 'g');
    
    const parts = template.split(regex);
    
    return parts.map((part, index) => {
      const key = Object.keys(replacements).find(k => k === part);
      
      if (key) {
        const value = replacements[key];
        if (['{sender}', '{gift}', '{blindbox_name}'].includes(key)) {
           return <span key={index} style={{ color: config.highlightColor }}>{value}</span>;
        }
        return value;
      }
      return part;
    });
  };

  return (
    <div className="v-app">
      <div className="settings-layout">
        {/* Left Side: Preview */}
        <div className="preview-pane">
          <div className={`preview-container ${previewBgDark ? 'dark-bg' : 'light-bg'}`}>
            {showPreview && (
              <div 
                className={`thank-you-card-preview ${isExiting ? 'animate-out' : 'animate-in'}`} 
                style={{
                  '--anim-duration': `${config.animationDuration}s`,
                  opacity: 1, // Controlled by animation
                }}
              >
                <img 
                  src={previewOverrides.backgroundImg || config.backgroundImg || previewData.user.face} 
                  alt="face" 
                  className="preview-avatar"
                  onError={(e) => {
                    console.error('Image load failed:', e.target.src);
                  }}
                  style={{ 
                    width: toPreviewUnit(config.imageHeight), 
                    height: toPreviewUnit(config.imageHeight),
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
                <div className="preview-message" style={{
                  fontFamily: config.fontFamily,
                  color: config.fontColor,
                  fontWeight: config.fontWeight,
                  fontSize: toPreviewUnit(config.fontSize),
                  textShadow: generateTextShadow(config.strokeWidth, config.strokeColor, config.glowIntensity, config.shadowIntensity),
                  width: toPreviewUnit(config.imageHeight * 2),
                  minWidth: toPreviewUnit(config.imageHeight * 2),
                  textAlign: 'center',
                  wordWrap: 'break-word',
                  whiteSpace: 'normal',
                  lineHeight: '1.5',
                  marginTop: toPreviewUnit(config.textSpacing || 0),
                  flexShrink: 0
                }}>
                  {renderPreviewMessage()}
                </div>
              </div>
            )}
          </div>
          
          <div className="preview-controls">
            <div className="switch-group">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={previewAudio} 
                  onChange={e => setPreviewAudio(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
              <span className="switch-label">预览时播放音效</span>
            </div>

            <div className="switch-group">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={previewBgDark} 
                  onChange={e => setPreviewBgDark(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
              <span className="switch-label">反转预览背景颜色</span>
            </div>



            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
              <button className="v-btn bg-primary" style={{ flex: 1 }} onClick={handleManualSave}>
                保存设置
              </button>
              <button className="v-btn" style={{ flex: 1, backgroundColor: '#4caf50', color: 'white' }} onClick={handleTest}>
                发送测试
              </button>
              <button className="v-btn bg-red" style={{ flex: 1 }} onClick={handleReset}>
                重置数据
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Settings */}
        <div className="settings-pane">
          
          {/* Room ID Input */}
          <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>直播间 ID (配置标识)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="v-input" 
                  value={roomId} 
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    localStorage.setItem('lastRoomId', e.target.value);
                  }}
                  placeholder="输入直播间ID以加载对应配置"
                />
              </div>
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                不同的直播间ID对应不同的配置文件。修改后会自动加载。
              </small>
            </div>
          </div>

          <div className="v-expansion-panels">
            
            {/* Panel 1: Image & Audio */}
            <div className={`v-expansion-panel ${expandedPanel === 'audio' ? 'active' : ''}`}>
              <button className="v-expansion-panel-title" onClick={() => togglePanel('audio')}>
                图片与音效
                <span className="icon-chevron">▼</span>
              </button>
              {expandedPanel === 'audio' && (
                <div className="v-expansion-panel-text">
                  <div className="form-group">
                    <label>启用音效</label>
                    <input 
                      type="checkbox" 
                      checked={config.audioEnabled}
                      onChange={e => saveConfig({...config, audioEnabled: e.target.checked})}
                    />
                  </div>
                  <div className="form-group">
                    <label>自定义音效 (MP3)</label>
                    <input 
                      type="file" 
                      accept="audio/*"
                      onChange={e => handleFileUpload(e, 'audioUrl')}
                    />
                    {config.audioUrl && <div className="file-preview">已上传: {config.audioUrl.split('/').pop()}</div>}
                  </div>
                  <div className="form-group">
                    <label>背景图片</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => handleFileUpload(e, 'backgroundImg')}
                    />
                    {config.backgroundImg && <div className="file-preview">已上传: {config.backgroundImg.split('/').pop()}</div>}
                  </div>
                  <div className="form-group">
                    <label>背景图片 URL (可选)</label>
                    <input 
                      type="text" 
                      className="v-input"
                      value={config.backgroundImg}
                      onChange={e => saveConfig({...config, backgroundImg: e.target.value})}
                      placeholder="http://..."
                    />
                  </div>
                  <div className="form-group">
                    <label>图片大小 (px)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="range" 
                        min="100" 
                        max="1000" 
                        step="10"
                        value={config.imageHeight}
                        onChange={e => saveConfig({...config, imageHeight: Number(e.target.value)})}
                        style={{ flex: 1 }}
                      />
                      <input 
                        type="number" 
                        className="v-input"
                        style={{ width: '80px' }}
                        value={config.imageHeight}
                        onChange={e => saveConfig({...config, imageHeight: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>全局缩放比例 (默认 1.0)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="5.0" 
                        step="0.1"
                        value={config.globalScale || 1.0}
                        onChange={e => saveConfig({...config, globalScale: Number(e.target.value)})}
                        style={{ flex: 1 }}
                      />
                      <input 
                        type="number" 
                        className="v-input"
                        style={{ width: '80px' }}
                        value={config.globalScale || 1.0}
                        onChange={e => saveConfig({...config, globalScale: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Panel 2: Text Style */}
            <div className={`v-expansion-panel ${expandedPanel === 'style' ? 'active' : ''}`}>
              <button className="v-expansion-panel-title" onClick={() => togglePanel('style')}>
                文字样式
                <span className="icon-chevron">▼</span>
              </button>
              {expandedPanel === 'style' && (
                <div className="v-expansion-panel-text">
                  <div className="form-group">
                    <label>字体大小 (px)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="range" 
                        min="10" 
                        max="200" 
                        step="1"
                        value={config.fontSize}
                        onChange={e => saveConfig({...config, fontSize: Number(e.target.value)})}
                        style={{ flex: 1 }}
                      />
                      <input 
                        type="number" 
                        className="v-input"
                        style={{ width: '80px' }}
                        value={config.fontSize}
                        onChange={e => saveConfig({...config, fontSize: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>文字与图片间距 (px)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="range" 
                        min="-100" 
                        max="100" 
                        step="1"
                        value={config.textSpacing || 0}
                        onChange={e => saveConfig({...config, textSpacing: Number(e.target.value)})}
                        style={{ flex: 1 }}
                      />
                      <input 
                        type="number" 
                        className="v-input"
                        style={{ width: '80px' }}
                        value={config.textSpacing || 0}
                        onChange={e => saveConfig({...config, textSpacing: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>字体颜色</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="color" 
                        className="v-input-color"
                        value={config.fontColor}
                        onChange={e => saveConfig({...config, fontColor: e.target.value})}
                      />
                      <input 
                        type="text" 
                        className="v-input"
                        style={{ width: '120px' }}
                        value={config.fontColor}
                        onChange={e => saveConfig({...config, fontColor: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>字体粗细</label>
                    <select 
                      className="v-input"
                      value={config.fontWeight}
                      onChange={e => saveConfig({...config, fontWeight: e.target.value})}
                    >
                      <option value="normal">正常</option>
                      <option value="bold">加粗</option>
                    </select>
                  </div>


                  
                  <div className="v-divider"></div>
                  
                  <div className="form-group">
                    <label>描边宽度 (相对)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.strokeWidth}
                      onChange={e => saveConfig({...config, strokeWidth: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>描边颜色</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="color" 
                        className="v-input-color"
                        value={config.strokeColor}
                        onChange={e => saveConfig({...config, strokeColor: e.target.value})}
                      />
                      <input 
                        type="text" 
                        className="v-input"
                        style={{ width: '120px' }}
                        value={config.strokeColor}
                        onChange={e => saveConfig({...config, strokeColor: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>外发光强度 (相对)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.glowIntensity}
                      onChange={e => saveConfig({...config, glowIntensity: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>阴影强度 (相对)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.shadowIntensity}
                      onChange={e => saveConfig({...config, shadowIntensity: Number(e.target.value)})}
                    />
                  </div>

                  <div className="v-divider"></div>

                  <div className="form-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={config.highlightKeywords}
                        onChange={e => saveConfig({...config, highlightKeywords: e.target.checked})}
                      /> 关键字高亮 (用户名/礼物名)
                    </label>
                  </div>
                  {config.highlightKeywords && (
                    <div className="form-group">
                      <label>高亮颜色</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="color" 
                          className="v-input-color"
                          value={config.highlightColor}
                          onChange={e => saveConfig({...config, highlightColor: e.target.value})}
                        />
                        <input 
                          type="text" 
                          className="v-input"
                          style={{ width: '120px' }}
                          value={config.highlightColor}
                          onChange={e => saveConfig({...config, highlightColor: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel 3: Gift */}
            <div className={`v-expansion-panel ${expandedPanel === 'gift' ? 'active' : ''}`}>
              <button className="v-expansion-panel-title" onClick={() => togglePanel('gift')}>
                礼物
                <span className="icon-chevron">▼</span>
              </button>
              {expandedPanel === 'gift' && (
                <div className="v-expansion-panel-text">
                  <div className="info-box" style={{ fontSize: '0.85em', color: '#666', marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <strong>可用变量:</strong><br/>
                    <code>{'{sender}'}</code>: 用户名<br/>
                    <code>{'{gift}'}</code>: 礼物名称<br/>
                    <code>{'{count}'}</code>: 数量<br/>
                    <code>{'{price}'}</code>: 总价值(元)<br/>
                    <code>{'{blindbox_name}'}</code>: 盲盒名称(仅盲盒)<br/>
                    <code>{'{content}'}</code>: 留言内容(仅SC)
                  </div>

                  <div className="form-group">
                    <label>普通礼物模板</label>
                    <textarea 
                      className="v-input"
                      value={config.template}
                      onChange={e => saveConfig({...config, template: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>盲盒礼物模板</label>
                    <textarea 
                      className="v-input"
                      value={config.blindboxTemplate}
                      onChange={e => saveConfig({...config, blindboxTemplate: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>上舰礼物模板</label>
                    <textarea 
                      className="v-input"
                      value={config.guardTemplate}
                      onChange={e => saveConfig({...config, guardTemplate: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>SuperChat礼物模板</label>
                    <textarea 
                      className="v-input"
                      value={config.scTemplate}
                      onChange={e => saveConfig({...config, scTemplate: e.target.value})}
                    />
                  </div>
                  
                  <div className="v-divider"></div>
                  <div className="form-group">
                    <label>最低触发金额 (元)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.minPrice}
                      onChange={e => saveConfig({...config, minPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={config.ignoreFree}
                        onChange={e => saveConfig({...config, ignoreFree: e.target.checked})}
                      /> 忽略免费礼物
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={config.blindboxCalcOriginal}
                        onChange={e => saveConfig({...config, blindboxCalcOriginal: e.target.checked})}
                      /> 盲盒计算原始价值
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Panel 4: Animation */}
            <div className={`v-expansion-panel ${expandedPanel === 'animation' ? 'active' : ''}`}>
              <button className="v-expansion-panel-title" onClick={() => togglePanel('animation')}>
                动画
                <span className="icon-chevron">▼</span>
              </button>
              {expandedPanel === 'animation' && (
                <div className="v-expansion-panel-text">
                  <div className="form-group">
                    <label>停留时间 (s)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.stayDuration}
                      onChange={e => saveConfig({...config, stayDuration: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>动画时间 (s)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.animationDuration}
                      onChange={e => saveConfig({...config, animationDuration: Number(e.target.value)})}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="v-divider"></div>

          {/* Generation Section */}
          <div className="generation-section">
            <h2>生成</h2>
            <p className="subtitle">生成网页链接后, 在obs的浏览器源中添加链接</p>
            
            <div className="form-group">
              <label>直播间ID</label>
              <input 
                type="number" 
                className="v-input"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                placeholder="输入直播间ID"
              />
            </div>
            <button className="v-btn bg-primary full-width" onClick={handleGenerate}>
              生成 / 复制链接
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouSettingsPage;
