import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ObsPreview from './ObsPreview';
import './ObsSettingsPage.css';

const ObsSettingsPage = () => {
  const navigate = useNavigate();
  
  // 默认设置
  const defaultSettings = {
    style: 'default',
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
    danmakuStrokeColor: '#ffffff',
    danmakuEnhancedStroke: true, // 启用增强描边
    danmakuGlowIntensity: 0.7, // vh
    danmakuShadowIntensity: 0.5, // vh
    danmakuFontFamilyFallback: '', // 弹幕备用字体
    danmakuFontFamilyFallback2: '', // 弹幕备用字体2
    danmakuFontWeightFallback: 'normal', // 弹幕备用字体粗细
    danmakuLang: 'zh-CN', // 弹幕语言变体
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
  };

  const languageOptions = [
    { value: 'zh-CN', label: '简体中文 (zh-CN)' },
    { value: 'zh-TW', label: '繁体中文 (zh-TW)' },
    { value: 'zh-HK', label: '香港繁体 (zh-HK)' },
    { value: 'ja', label: '日语 (ja)' },
    { value: 'ko', label: '韩语 (ko)' },
    { value: 'en', label: '英语 (en)' },
  ];

  // 模板选项
  const templateOptions = [
    { value: 'default', label: '默认模板 (全屏)' },
    { value: '1', label: '模板1 (右上角缩小版)' },
  ];

  const [settings, setSettings] = useState(defaultSettings);
  const [currentTemplate, setCurrentTemplate] = useState('default');
  const [roomId, setRoomId] = useState('21514463');
  const [blcInput, setBlcInput] = useState('');
  const [availableFonts, setAvailableFonts] = useState([
    { name: '默认 (微软雅黑)', value: 'Microsoft YaHei' },
    { name: '黑体', value: 'SimHei' },
    { name: '宋体', value: 'SimSun' },
    { name: '楷体', value: 'KaiTi' },
    { name: 'Arial', value: 'Arial' },
    { name: 'Helvetica', value: 'Helvetica' },
    { name: 'Times New Roman', value: 'Times New Roman' },
  ]);

  // 折叠状态管理
  const [expandedSections, setExpandedSections] = useState({
    username: false,
    danmaku: false,
    bubbles: false,
    import: false,
    test: false,
    layout: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 加载自定义字体
  useEffect(() => {
    fetch('/api/fonts')
      .then(res => res.json())
      .then(fonts => {
        if (Array.isArray(fonts) && fonts.length > 0) {
          // Inject styles for custom fonts
          const styleId = 'custom-fonts-style';
          let styleEl = document.getElementById(styleId);
          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
          }
          
          let css = '';
          const customFontOptions = fonts.map(font => {
            css += `
              @font-face {
                font-family: '${font.family}';
                src: url('${font.url}');
                font-weight: 100 900;
                font-style: normal;
              }
            `;
            return { name: font.name, value: font.family };
          });
          
          styleEl.textContent = css;
          
          setAvailableFonts(prev => [
            ...prev,
            { name: '--- 自定义字体 ---', value: '', disabled: true },
            ...customFontOptions
          ]);
        }
      })
      .catch(err => console.error('Failed to fetch fonts:', err));
  }, []);

  // 加载保存的设置
  useEffect(() => {
    // 优先从后端加载设置
    fetch(`/api/obs/settings?template=${currentTemplate}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings && Object.keys(data.settings).length > 0) {
          console.log('✅ 从后端加载设置:', data.settings, `模板: ${data.template}`);
          setSettings({ ...defaultSettings, ...data.settings });
          // 同时更新localStorage作为备份（带模板ID）
          localStorage.setItem(`obsSettings_${currentTemplate}`, JSON.stringify(data.settings));
        } else {
          // 后端没有设置，尝试从localStorage加载
          loadFromLocalStorage();
        }
      })
      .catch(err => {
        console.error('Failed to fetch settings from backend:', err);
        loadFromLocalStorage();
      });

    const loadFromLocalStorage = () => {
      const saved = localStorage.getItem(`obsSettings_${currentTemplate}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          // 自动迁移：检测是否为旧的像素值（如果字号大于10，通常意味着是像素值）
          // 将其转换为 vh (基于 1080p: 1vh = 10.8px)
          if (parsed.usernameFontSize && parsed.usernameFontSize > 10) {
            console.log('🔄 检测到旧版像素设置，正在迁移到相对单位(vh)...');
            const toVhVal = (val) => {
              const num = parseFloat(val);
              return isNaN(num) ? 0 : parseFloat((num / 10.8).toFixed(2));
            };

            parsed.usernameFontSize = toVhVal(parsed.usernameFontSize);
            parsed.usernameStrokeWidth = toVhVal(parsed.usernameStrokeWidth);
            parsed.usernameGlowIntensity = toVhVal(parsed.usernameGlowIntensity);
            parsed.usernameShadowIntensity = toVhVal(parsed.usernameShadowIntensity);

            parsed.danmakuFontSize = toVhVal(parsed.danmakuFontSize);
            parsed.danmakuStrokeWidth = toVhVal(parsed.danmakuStrokeWidth);
            parsed.danmakuGlowIntensity = toVhVal(parsed.danmakuGlowIntensity);
            parsed.danmakuShadowIntensity = toVhVal(parsed.danmakuShadowIntensity);

            parsed.avatarSize = toVhVal(parsed.avatarSize);
            parsed.itemSpacing = toVhVal(parsed.itemSpacing);
            parsed.emotSize = toVhVal(parsed.emotSize);

            console.log('✅ 迁移完成:', parsed);
          }

          // 合并默认设置，确保新添加的设置项（如emotSize）有默认值
          setSettings({ ...defaultSettings, ...parsed });
        } catch (e) {
          console.error('Failed to parse settings', e);
        }
      }
    };

    const savedRoom = localStorage.getItem('obsRoomId');
    if (savedRoom) {
      setRoomId(savedRoom);
    }
  }, [currentTemplate]);

  // 保存设置
  const saveSettings = async () => {
    // 保存到 localStorage（带模板ID）
    localStorage.setItem(`obsSettings_${currentTemplate}`, JSON.stringify(settings));
    localStorage.setItem('obsRoomId', roomId);

    // 保存到后端
    try {
      const res = await fetch(`/api/obs/settings?template=${currentTemplate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        const templateName = currentTemplate === 'default' ? '默认模板' : `模板${currentTemplate}`;
        alert(`${templateName}设置已保存！(已同步到OBS)`);
      } else {
        alert('保存到后端失败: ' + data.message);
      }
    } catch (err) {
      console.error('Failed to save settings to backend:', err);
      alert('保存到后端失败，但本地已保存');
    }
  };

  // 重置设置
  const resetSettings = () => {
    if (confirm('确定要重置所有设置吗？')) {
      setSettings(defaultSettings);
      localStorage.removeItem('obsSettings');
    }
  };


  // 处理BLC配置导入
  const handleImportBLC = async () => {
    if (!blcInput.trim()) return;
    
    let cssContent = blcInput;
    let changed = false;
    const newSettings = { ...settings };

    // 尝试处理 @import 或 URL
    const urlMatch = blcInput.match(/^(https?:\/\/[^\s]+)/) || blcInput.match(/@import\s+(?:url\()?['"]?(https?:\/\/[^'"\)]+)['"]?\)?/);
    if (urlMatch) {
      const url = urlMatch[1] || urlMatch[2];
      try {
        const res = await fetch(url);
        if (res.ok) {
          cssContent = await res.text();
        } else {
          alert(`无法加载远程CSS (Status: ${res.status})，请尝试直接粘贴CSS内容。`);
          return;
        }
      } catch (e) {
        alert("无法加载远程CSS (跨域或网络错误)，请尝试直接粘贴CSS内容。");
        return;
      }
    }

    // 简单的CSS解析辅助函数
    const findStyle = (selector, prop) => {
      // 匹配 selector { ... prop: value ... }
      // 转义特殊字符，允许 selector 中包含空格、点、井号、星号等
      const escapedSelector = selector.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*'); 
      // 上面的转义可能太激进了，我们手动构建正则更安全
      // 我们直接使用传入的 selector 字符串，假设调用者已经处理好了正则转义（如果需要）
      // 或者我们只转义关键的正则元字符，但保留空格
      
      // 简化策略：直接构造正则，但在调用时注意 selector 的写法
      // 为了匹配换行，使用 [\s\S]*? 替代 .*?
      // 匹配 selector 后面跟着 {，然后是任意内容，直到遇到 prop:
      const regex = new RegExp(`${selector.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1")}\\s*\\{[^}]*?${prop}\\s*:\\s*([^;!}]+)`, 'i');
      const match = cssContent.match(regex);
      return match ? match[1].trim() : null;
    };

    // 1. 提取颜色
    const authorColor = findStyle('#author-name', 'color') 
      || findStyle('.yt-live-chat-author-chip', 'color')
      || findStyle('yt-live-chat-text-message-renderer #author-name', 'color');

    if (authorColor) {
      newSettings.usernameColor = authorColor;
      changed = true;
    }

    const msgColor = findStyle('#message', 'color') 
      || findStyle('.yt-live-chat-text-message-renderer', 'color')
      || findStyle('yt-live-chat-text-message-renderer #message', 'color');

    if (msgColor) {
      newSettings.danmakuColor = msgColor;
      changed = true;
    }

    // 2. 提取字体
    const fontFamily = findStyle('body', 'font-family') 
      || findStyle('*', 'font-family') 
      || findStyle('.yt-live-chat-text-message-renderer', 'font-family')
      || findStyle('yt-live-chat-renderer *', 'font-family');

    if (fontFamily) {
      // 去除引号
      const cleanFont = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
      newSettings.usernameFontFamily = cleanFont;
      newSettings.danmakuFontFamily = cleanFont;
      changed = true;
    }

    // 3. 提取字号 (尝试转换为当前单位)
    const fontSizeStr = findStyle('#message', 'font-size') 
      || findStyle('.yt-live-chat-text-message-renderer', 'font-size')
      || findStyle('yt-live-chat-renderer *', 'font-size');

    if (fontSizeStr && fontSizeStr.endsWith('px')) {
      const pxVal = parseFloat(fontSizeStr);
      if (!isNaN(pxVal)) {
        // 假设基准 1080p: 1vh = 10.8px
        newSettings.danmakuFontSize = parseFloat((pxVal / 10.8).toFixed(1));
        newSettings.usernameFontSize = parseFloat((pxVal * 0.85 / 10.8).toFixed(1)); // 用户名通常稍小
        changed = true;
      }
    }

    // 4. 提取头像大小
    const avatarSizeStr = findStyle('#author-photo', 'width') 
      || findStyle('#author-photo img', 'width')
      || findStyle('yt-live-chat-text-message-renderer #author-photo', 'width');

    if (avatarSizeStr && avatarSizeStr.endsWith('px')) {
      const pxVal = parseFloat(avatarSizeStr);
      if (!isNaN(pxVal)) {
        newSettings.avatarSize = parseFloat((pxVal / 10.8).toFixed(1));
        changed = true;
      }
    }

    // 5. 简单的背景色检测 (判断是否为气泡风格)
    const bgStyle = findStyle('yt-live-chat-text-message-renderer', 'background-color') 
      || findStyle('#card', 'background-color')
      || findStyle('yt-live-chat-text-message-renderer #message', 'background-color');

    if (bgStyle && bgStyle !== 'transparent' && bgStyle !== 'rgba(0,0,0,0)') {
      newSettings.style = 'bubbles';
      // 尝试提取背景色作为气泡色
      if (bgStyle.startsWith('#') || bgStyle.startsWith('rgb')) {
        newSettings.danmakuBubbleBgStart = bgStyle;
        newSettings.danmakuBubbleBgEnd = bgStyle;
      }
      changed = true;
    }

    if (changed) {
      setSettings(newSettings);
      alert("样式已解析并应用！\n\n已更新：\n" + 
            (authorColor ? "- 用户名颜色\n" : "") +
            (msgColor ? "- 弹幕颜色\n" : "") +
            (fontFamily ? "- 字体\n" : "") +
            (fontSizeStr ? "- 字号\n" : "") +
            (avatarSizeStr ? "- 头像大小\n" : "")
      );
    } else {
      alert("未能识别出有效的样式规则。\n请确保粘贴的是包含 #author-name, #message 等标准选择器的 CSS 代码。");
    }
  };

  // 预览
  const preview = () => {
    localStorage.setItem(`obsSettings_${currentTemplate}`, JSON.stringify(settings));
    localStorage.setItem('obsRoomId', roomId);
    const templateParam = currentTemplate !== 'default' ? `&template=${currentTemplate}` : '';
    window.open(`/obs?room=${roomId}${templateParam}`, '_blank');
  };

  // 返回主页
  const goBack = () => {
    navigate('/dashboard');
  };

  // 复制OBS链接
  const handleCopyOBSLink = () => {
    if (!roomId) {
      alert('请输入直播间号');
      return;
    }
    const templateParam = currentTemplate !== 'default' ? `&template=${currentTemplate}` : '';
    const obsLink = `${window.location.origin}/obs?room=${roomId}${templateParam}`;
    const templateName = currentTemplate === 'default' ? '默认模板' : `模板${currentTemplate}`;
    navigator.clipboard.writeText(obsLink).then(() => {
      alert(`${templateName}OBS链接已复制！\n请在OBS中添加浏览器源，并粘贴此链接。`);
    }).catch(() => {
      alert('复制失败，请手动复制：\n' + obsLink);
    });
  };

  // 上传字体
  const handleFontUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/fonts/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      if (data.success) {
        alert('字体上传成功！');
        // Refresh fonts list
        window.location.reload();
      } else {
        alert('上传失败: ' + data.message);
      }
    } catch (error) {
      console.error('Error uploading font:', error);
      alert('上传出错');
    }
  };

  // 启动综合测试流
  const handleTestFlow = async () => {
    if (!roomId) {
      alert('请先输入直播间ID');
      return;
    }
    try {
      const res = await fetch('/api/danmaku/test-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });
      const data = await res.json();
      if (data.success) {
        // alert('综合测试流已启动，请观察OBS画面');
      } else {
        alert('启动失败: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('请求失败，请确保后端服务已启动');
    }
  };

  // 发送单条测试SC
  const handleTestSC = async () => {
    if (!roomId) {
      alert('请先输入直播间ID');
      return;
    }
    // 包含特殊金额以便测试紫色背景
    const testAmounts = [30, 50, 77, 100, 177, 500, 777, 1000, 2000, 7777, 17777, 77777];
    const amount = testAmounts[Math.floor(Math.random() * testAmounts.length)];
    const msg = {
      type: 'superchat',
      user: {
        uid: 123456,
        username: '测试用户',
        face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg'
      },
      price: amount,
      message: '这是一条测试SC消息，用于检查样式效果',
      time: Math.floor(Date.now() / 1000)
    };

    try {
      const res = await fetch('/api/danmaku/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, data: msg })
      });
      const data = await res.json();
      if (!data.success) {
        alert('发送失败: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('请求失败，请确保后端服务已启动');
    }
  };

  // 发送主播测试消息
  const handleTestAnchor = async () => {
    if (!roomId) {
      alert('请先输入直播间ID');
      return;
    }
    const msg = {
      type: 'danmaku',
      user: {
        uid: 888888,
        username: '主播本人',
        face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg',
        isAnchor: true,
        isAdmin: true
      },
      content: '这是一条主播发送的测试弹幕，应该显示为渐变色！',
      timestamp: Date.now()
    };

    try {
      const res = await fetch('/api/danmaku/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, data: msg })
      });
      const data = await res.json();
      if (!data.success) {
        alert('发送失败: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('请求失败，请确保后端服务已启动');
    }
  };

  return (
    <div className="obs-settings-page">
      <div className="obs-settings-layout">
        {/* 左侧：设置面板 */}
        <div className="settings-container">
          <h1>OBS 弹幕样式设置</h1>

          {/* 房间号设置 */}
          <div className="setting-section">
            <h2>基本设置</h2>
            <div className="setting-item">
              <label>房间号：</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="输入B站直播间号"
              />
            </div>

            <div className="setting-item">
              <label>弹幕样式：</label>
              <select
                value={settings.style || 'default'}
                onChange={(e) => setSettings({ ...settings, style: e.target.value })}
              >
                <option value="default">默认简洁样式</option>
                <option value="bubbles">气泡样式 (Bubbles)</option>
              </select>
            </div>

            <div className="setting-item">
              <label>选择模板：</label>
              <select
                value={currentTemplate}
                onChange={(e) => setCurrentTemplate(e.target.value)}
              >
                {templateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="hint">切换模板以设置不同的OBS弹幕样式（如右上角缩小版）</span>
            </div>
          </div>

          {/* 用户名样式 */}
          <div className="setting-section">
            <h2 onClick={() => toggleSection('username')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              用户名样式
              <span style={{ fontSize: '0.8em', transform: expandedSections.username ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s' }}>▼</span>
            </h2>
            
            <div className={`section-content ${expandedSections.username ? 'expanded' : ''}`}>
            <div className="setting-item">
              <label>字体：</label>
              <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                <select
                  value={settings.usernameFontFamily}
                  onChange={(e) => setSettings({ ...settings, usernameFontFamily: e.target.value })}
                  style={{ flex: 1 }}
                >
                  {availableFonts.map((font, idx) => (
                    <option key={idx} value={font.value} disabled={font.disabled}>
                      {font.name}
                    </option>
                  ))}
                </select>
                <label className="btn-secondary" style={{ width: 'auto', padding: '0 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: 0, fontSize: '13px', borderRadius: '6px', background: '#f0f0f0', color: '#333', border: '1px solid #ccc' }}>
                  上传
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleFontUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div className="setting-item">
              <label>备用字体：</label>
              <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                <select
                  value={settings.usernameFontFamilyFallback}
                  onChange={(e) => setSettings({ ...settings, usernameFontFamilyFallback: e.target.value })}
                  style={{ flex: 1 }}
                >
                  <option value="">无 (默认)</option>
                  {availableFonts.map((font, idx) => (
                    <option key={idx} value={font.value} disabled={font.disabled}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="setting-item">
              <label>备用字体2：</label>
              <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                <select
                  value={settings.usernameFontFamilyFallback2}
                  onChange={(e) => setSettings({ ...settings, usernameFontFamilyFallback2: e.target.value })}
                  style={{ flex: 1 }}
                >
                  <option value="">无 (默认)</option>
                  {availableFonts.map((font, idx) => (
                    <option key={idx} value={font.value} disabled={font.disabled}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="setting-item">
              <label>备用字体粗细：</label>
              <select
                value={settings.usernameFontWeightFallback}
                onChange={(e) => setSettings({ ...settings, usernameFontWeightFallback: e.target.value })}
              >
                <option value="normal">正常</option>
                <option value="bold">粗体</option>
                <option value="100">100 - Thin</option>
                <option value="200">200 - Extra Light</option>
                <option value="300">300 - Light</option>
                <option value="400">400 - Normal</option>
                <option value="500">500 - Medium</option>
                <option value="600">600 - Semi Bold</option>
                <option value="700">700 - Bold</option>
                <option value="800">800 - Extra Bold</option>
                <option value="900">900 - Black</option>
              </select>
            </div>

            <div className="setting-item">
              <label>语言变体：</label>
              <select
                value={settings.usernameLang || 'zh-CN'}
                onChange={(e) => setSettings({ ...settings, usernameLang: e.target.value })}
              >
                {languageOptions.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <span className="hint" style={{ display: 'block', width: '100%', marginTop: '5px' }}>
                （仅对支持多语言的字体有效，如 Resource Han Rounded）
              </span>
            </div>

            <div className="setting-item">
              <label>字号 (vh)：</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <input
                  type="range"
                  value={Math.round(settings.usernameFontSize * 10)}
                  onChange={(e) => setSettings({ ...settings, usernameFontSize: parseFloat(e.target.value) / 10 })}
                  min="0"
                  max="128"
                  step="1"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={Math.round(settings.usernameFontSize * 10)}
                  onChange={(e) => setSettings({ ...settings, usernameFontSize: parseFloat(e.target.value) / 10 })}
                  min="0"
                  max="128"
                  step="1"
                  style={{ width: '100px', flex: 'none' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <label>粗细：</label>
              <select
                value={settings.usernameFontWeight}
                onChange={(e) => setSettings({ ...settings, usernameFontWeight: e.target.value })}
              >
                <option value="normal">正常</option>
                <option value="bold">粗体</option>
                <option value="100">100 - Thin</option>
                <option value="200">200 - Extra Light</option>
                <option value="300">300 - Light</option>
                <option value="400">400 - Normal</option>
                <option value="500">500 - Medium</option>
                <option value="600">600 - Semi Bold</option>
                <option value="700">700 - Bold</option>
                <option value="800">800 - Extra Bold</option>
                <option value="900">900 - Black</option>
              </select>
            </div>

            <div className="setting-item">
              <label>颜色：</label>
              <input
                type="color"
                value={settings.usernameColor}
                onChange={(e) => setSettings({ ...settings, usernameColor: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColor}
                onChange={(e) => setSettings({ ...settings, usernameColor: e.target.value })}
                placeholder="#333333"
              />
            </div>

            <div className="setting-item">
              <label>舰长颜色：</label>
              <input
                type="color"
                value={settings.usernameColorGuard3}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard3: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColorGuard3}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard3: e.target.value })}
                placeholder="#1fa3f1"
              />
            </div>

            <div className="setting-item">
              <label>提督颜色：</label>
              <input
                type="color"
                value={settings.usernameColorGuard2}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard2: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColorGuard2}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard2: e.target.value })}
                placeholder="#9b39f4"
              />
            </div>

            <div className="setting-item">
              <label>总督颜色：</label>
              <input
                type="color"
                value={settings.usernameColorGuard1}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard1: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColorGuard1}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard1: e.target.value })}
                placeholder="#ff1a75"
              />
            </div>

            <div className="setting-item">
              <label>主播颜色(渐变始)：</label>
              <input
                type="color"
                value={settings.usernameColorAnchorStart}
                onChange={(e) => setSettings({ ...settings, usernameColorAnchorStart: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColorAnchorStart}
                onChange={(e) => setSettings({ ...settings, usernameColorAnchorStart: e.target.value })}
                placeholder="#ff0000"
              />
            </div>

            <div className="setting-item">
              <label>主播颜色(渐变终)：</label>
              <input
                type="color"
                value={settings.usernameColorAnchorEnd}
                onChange={(e) => setSettings({ ...settings, usernameColorAnchorEnd: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColorAnchorEnd}
                onChange={(e) => setSettings({ ...settings, usernameColorAnchorEnd: e.target.value })}
                placeholder="#ff0000"
              />
            </div>

            <div className="setting-item">
              <label>描边宽度 (vh)：</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <input
                  type="range"
                  value={Math.round(settings.usernameStrokeWidth * 25)}
                  onChange={(e) => setSettings({ ...settings, usernameStrokeWidth: parseFloat(e.target.value) / 25 })}
                  min="0"
                  max="15"
                  step="1"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={Math.round(settings.usernameStrokeWidth * 25)}
                  onChange={(e) => setSettings({ ...settings, usernameStrokeWidth: parseFloat(e.target.value) / 25 })}
                  min="0"
                  max="15"
                  step="1"
                  style={{ width: '100px', flex: 'none' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <label>描边颜色：</label>
              <input
                type="color"
                value={settings.usernameStrokeColor}
                onChange={(e) => setSettings({ ...settings, usernameStrokeColor: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameStrokeColor}
                onChange={(e) => setSettings({ ...settings, usernameStrokeColor: e.target.value })}
                placeholder="#ffffff"
              />
            </div>

            <div className="setting-item">
              <label>增强描边效果：</label>
              <input
                type="checkbox"
                checked={settings.usernameEnhancedStroke}
                onChange={(e) => setSettings({ ...settings, usernameEnhancedStroke: e.target.checked })}
              />
              <span className="hint">（启用8方向描边+外发光+阴影）</span>
            </div>

            {settings.usernameEnhancedStroke && (
              <>
                <div className="setting-item">
                  <label>外发光强度 (vh)：</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <input
                      type="range"
                      value={Math.round(settings.usernameGlowIntensity * 10)}
                      onChange={(e) => setSettings({ ...settings, usernameGlowIntensity: parseFloat(e.target.value) / 10 })}
                      min="0"
                      max="15"
                      step="1"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      value={Math.round(settings.usernameGlowIntensity * 10)}
                      onChange={(e) => setSettings({ ...settings, usernameGlowIntensity: parseFloat(e.target.value) / 10 })}
                      min="0"
                      max="15"
                      step="1"
                      style={{ width: '100px', flex: 'none' }}
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <label>阴影强度 (vh)：</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <input
                      type="range"
                      value={Math.round(settings.usernameShadowIntensity * 10)}
                      onChange={(e) => setSettings({ ...settings, usernameShadowIntensity: parseFloat(e.target.value) / 10 })}
                      min="0"
                      max="15"
                      step="1"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      value={Math.round(settings.usernameShadowIntensity * 10)}
                      onChange={(e) => setSettings({ ...settings, usernameShadowIntensity: parseFloat(e.target.value) / 10 })}
                      min="0"
                      max="15"
                      step="1"
                      style={{ width: '100px', flex: 'none' }}
                    />
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          {/* 弹幕内容样式 */}
          <div className="setting-section">
            <h2 onClick={() => toggleSection('danmaku')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              弹幕内容样式
              <span style={{ fontSize: '0.8em', transform: expandedSections.danmaku ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s' }}>▼</span>
            </h2>
            
            <div className={`section-content ${expandedSections.danmaku ? 'expanded' : ''}`}>
            <div className="setting-item">
              <label>字体：</label>
              <select
                value={settings.danmakuFontFamily}
                onChange={(e) => setSettings({ ...settings, danmakuFontFamily: e.target.value })}
              >
                {availableFonts.map((font, idx) => (
                  <option key={idx} value={font.value} disabled={font.disabled}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="setting-item">
              <label>备用字体：</label>
              <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                <select
                  value={settings.danmakuFontFamilyFallback}
                  onChange={(e) => setSettings({ ...settings, danmakuFontFamilyFallback: e.target.value })}
                  style={{ flex: 1 }}
                >
                  <option value="">无 (默认)</option>
                  {availableFonts.map((font, idx) => (
                    <option key={idx} value={font.value} disabled={font.disabled}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="setting-item">
              <label>备用字体2：</label>
              <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                <select
                  value={settings.danmakuFontFamilyFallback2}
                  onChange={(e) => setSettings({ ...settings, danmakuFontFamilyFallback2: e.target.value })}
                  style={{ flex: 1 }}
                >
                  <option value="">无 (默认)</option>
                  {availableFonts.map((font, idx) => (
                    <option key={idx} value={font.value} disabled={font.disabled}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="setting-item">
              <label>备用字体粗细：</label>
              <select
                value={settings.danmakuFontWeightFallback}
                onChange={(e) => setSettings({ ...settings, danmakuFontWeightFallback: e.target.value })}
              >
                <option value="normal">正常</option>
                <option value="bold">粗体</option>
                <option value="100">100 - Thin</option>
                <option value="200">200 - Extra Light</option>
                <option value="300">300 - Light</option>
                <option value="400">400 - Normal</option>
                <option value="500">500 - Medium</option>
                <option value="600">600 - Semi Bold</option>
                <option value="700">700 - Bold</option>
                <option value="800">800 - Extra Bold</option>
                <option value="900">900 - Black</option>
              </select>
            </div>

            <div className="setting-item">
              <label>语言变体：</label>
              <select
                value={settings.danmakuLang || 'zh-CN'}
                onChange={(e) => setSettings({ ...settings, danmakuLang: e.target.value })}
              >
                {languageOptions.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <span className="hint" style={{ display: 'block', width: '100%', marginTop: '5px' }}>
                （仅对支持多语言的字体有效，如 Resource Han Rounded）
              </span>
            </div>

            <div className="setting-item">
              <label>字号 (vh)：</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <input
                  type="range"
                  value={Math.round(settings.danmakuFontSize * 10)}
                  onChange={(e) => setSettings({ ...settings, danmakuFontSize: parseFloat(e.target.value) / 10 })}
                  min="0"
                  max="128"
                  step="1"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={Math.round(settings.danmakuFontSize * 10)}
                  onChange={(e) => setSettings({ ...settings, danmakuFontSize: parseFloat(e.target.value) / 10 })}
                  min="0"
                  max="128"
                  step="1"
                  style={{ width: '100px', flex: 'none' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <label>粗细：</label>
              <select
                value={settings.danmakuFontWeight}
                onChange={(e) => setSettings({ ...settings, danmakuFontWeight: e.target.value })}
              >
                <option value="normal">正常</option>
                <option value="bold">粗体</option>
                <option value="100">100 - Thin</option>
                <option value="200">200 - Extra Light</option>
                <option value="300">300 - Light</option>
                <option value="400">400 - Normal</option>
                <option value="500">500 - Medium</option>
                <option value="600">600 - Semi Bold</option>
                <option value="700">700 - Bold</option>
                <option value="800">800 - Extra Bold</option>
                <option value="900">900 - Black</option>
              </select>
            </div>

            <div className="setting-item">
              <label>颜色：</label>
              <input
                type="color"
                value={settings.danmakuColor}
                onChange={(e) => setSettings({ ...settings, danmakuColor: e.target.value })}
              />
              <input
                type="text"
                value={settings.danmakuColor}
                onChange={(e) => setSettings({ ...settings, danmakuColor: e.target.value })}
                placeholder="#333333"
              />
            </div>

            <div className="setting-item">
              <label>主播弹幕(渐变始)：</label>
              <input
                type="color"
                value={settings.danmakuColorAnchorStart}
                onChange={(e) => setSettings({ ...settings, danmakuColorAnchorStart: e.target.value })}
              />
              <input
                type="text"
                value={settings.danmakuColorAnchorStart}
                onChange={(e) => setSettings({ ...settings, danmakuColorAnchorStart: e.target.value })}
                placeholder="#ff0000"
              />
            </div>

            <div className="setting-item">
              <label>主播弹幕(渐变终)：</label>
              <input
                type="color"
                value={settings.danmakuColorAnchorEnd}
                onChange={(e) => setSettings({ ...settings, danmakuColorAnchorEnd: e.target.value })}
              />
              <input
                type="text"
                value={settings.danmakuColorAnchorEnd}
                onChange={(e) => setSettings({ ...settings, danmakuColorAnchorEnd: e.target.value })}
                placeholder="#ff0000"
              />
            </div>

            <div className="setting-item">
              <label>描边宽度 (vh)：</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <input
                  type="range"
                  value={Math.round(settings.danmakuStrokeWidth * 25)}
                  onChange={(e) => setSettings({ ...settings, danmakuStrokeWidth: parseFloat(e.target.value) / 25 })}
                  min="0"
                  max="15"
                  step="1"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={Math.round(settings.danmakuStrokeWidth * 25)}
                  onChange={(e) => setSettings({ ...settings, danmakuStrokeWidth: parseFloat(e.target.value) / 25 })}
                  min="0"
                  max="15"
                  step="1"
                  style={{ width: '100px', flex: 'none' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <label>描边颜色：</label>
              <input
                type="color"
                value={settings.danmakuStrokeColor}
                onChange={(e) => setSettings({ ...settings, danmakuStrokeColor: e.target.value })}
              />
              <input
                type="text"
                value={settings.danmakuStrokeColor}
                onChange={(e) => setSettings({ ...settings, danmakuStrokeColor: e.target.value })}
                placeholder="#ffffff"
              />
            </div>

            <div className="setting-item">
              <label>增强描边效果：</label>
              <input
                type="checkbox"
                checked={settings.danmakuEnhancedStroke}
                onChange={(e) => setSettings({ ...settings, danmakuEnhancedStroke: e.target.checked })}
              />
              <span className="hint">（启用8方向描边+外发光+阴影）</span>
            </div>

            {settings.danmakuEnhancedStroke && (
              <>
                <div className="setting-item">
                  <label>外发光强度 (vh)：</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <input
                      type="range"
                      value={Math.round(settings.danmakuGlowIntensity * 10)}
                      onChange={(e) => setSettings({ ...settings, danmakuGlowIntensity: parseFloat(e.target.value) / 10 })}
                      min="0"
                      max="15"
                      step="1"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      value={Math.round(settings.danmakuGlowIntensity * 10)}
                      onChange={(e) => setSettings({ ...settings, danmakuGlowIntensity: parseFloat(e.target.value) / 10 })}
                      min="0"
                      max="15"
                      step="1"
                      style={{ width: '100px', flex: 'none' }}
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <label>阴影强度 (vh)：</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <input
                      type="range"
                      value={Math.round(settings.danmakuShadowIntensity * 10)}
                      onChange={(e) => setSettings({ ...settings, danmakuShadowIntensity: parseFloat(e.target.value) / 10 })}
                      min="0"
                      max="15"
                      step="1"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      value={Math.round(settings.danmakuShadowIntensity * 10)}
                      onChange={(e) => setSettings({ ...settings, danmakuShadowIntensity: parseFloat(e.target.value) / 10 })}
                      min="0"
                      max="15"
                      step="1"
                      style={{ width: '100px', flex: 'none' }}
                    />
                  </div>
                </div>
              </>
            )}
            </div>
          </div>

          {/* 气泡样式 */}
          {settings.style === 'bubbles' && (
            <div className="setting-section">
              <h2 onClick={() => toggleSection('bubbles')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                气泡样式
                <span style={{ fontSize: '0.8em', transform: expandedSections.bubbles ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s' }}>▼</span>
              </h2>
              
              <div className={`section-content ${expandedSections.bubbles ? 'expanded' : ''}`}>
              <div className="setting-item">
                <label>气泡左右内边距 (vh)：</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <input
                    type="range"
                    value={Math.round((settings.bubblePaddingX !== undefined ? settings.bubblePaddingX : 3.7) * 10)}
                    onChange={(e) => setSettings({ ...settings, bubblePaddingX: parseFloat(e.target.value) / 10 })}
                    min="0"
                    max="100"
                    step="1"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    value={Math.round((settings.bubblePaddingX !== undefined ? settings.bubblePaddingX : 3.7) * 10)}
                    onChange={(e) => setSettings({ ...settings, bubblePaddingX: parseFloat(e.target.value) / 10 })}
                    min="0"
                    max="100"
                    step="1"
                    style={{ width: '100px', flex: 'none' }}
                  />
                </div>
              </div>

              <div className="setting-item">
                <label>普通弹幕气泡渐变：</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '60px' }}>顶部：</span>
                    <input
                      type="color"
                      value={settings.danmakuBubbleBgEnd || '#ffa8d7'}
                      onChange={(e) => setSettings({ ...settings, danmakuBubbleBgEnd: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.danmakuBubbleBgEnd || '#ffa8d7'}
                      onChange={(e) => setSettings({ ...settings, danmakuBubbleBgEnd: e.target.value })}
                      style={{ width: '80px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '60px' }}>底部：</span>
                    <input
                      type="checkbox"
                      checked={settings.danmakuBubbleBgStartTransparent}
                      onChange={(e) => setSettings({ ...settings, danmakuBubbleBgStartTransparent: e.target.checked })}
                    />
                    <span onClick={() => setSettings({ ...settings, danmakuBubbleBgStartTransparent: !settings.danmakuBubbleBgStartTransparent })} style={{ cursor: 'pointer' }}>透明</span>
                    
                    {!settings.danmakuBubbleBgStartTransparent && (
                      <>
                        <input
                          type="color"
                          value={settings.danmakuBubbleBgStart || '#ffa8d7'}
                          onChange={(e) => setSettings({ ...settings, danmakuBubbleBgStart: e.target.value })}
                        />
                        <input
                          type="text"
                          value={settings.danmakuBubbleBgStart || '#ffa8d7'}
                          onChange={(e) => setSettings({ ...settings, danmakuBubbleBgStart: e.target.value })}
                          style={{ width: '80px' }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="setting-item">
                <label>SC/礼物气泡渐变：</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '60px' }}>顶部：</span>
                    <input
                      type="color"
                      value={settings.scBubbleBgEnd || '#c3a4f5'}
                      onChange={(e) => setSettings({ ...settings, scBubbleBgEnd: e.target.value })}
                    />
                    <input
                      type="text"
                      value={settings.scBubbleBgEnd || '#c3a4f5'}
                      onChange={(e) => setSettings({ ...settings, scBubbleBgEnd: e.target.value })}
                      style={{ width: '80px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '60px' }}>底部：</span>
                    <input
                      type="checkbox"
                      checked={settings.scBubbleBgStartTransparent}
                      onChange={(e) => setSettings({ ...settings, scBubbleBgStartTransparent: e.target.checked })}
                    />
                    <span onClick={() => setSettings({ ...settings, scBubbleBgStartTransparent: !settings.scBubbleBgStartTransparent })} style={{ cursor: 'pointer' }}>透明</span>
                    
                    {!settings.scBubbleBgStartTransparent && (
                      <>
                        <input
                          type="color"
                          value={settings.scBubbleBgStart || '#c3a4f5'}
                          onChange={(e) => setSettings({ ...settings, scBubbleBgStart: e.target.value })}
                        />
                        <input
                          type="text"
                          value={settings.scBubbleBgStart || '#c3a4f5'}
                          onChange={(e) => setSettings({ ...settings, scBubbleBgStart: e.target.value })}
                          style={{ width: '80px' }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* BLC 样式导入 */}
          <div className="setting-section">
            <h2 onClick={() => toggleSection('import')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              BLC 样式导入 (实验性)
              <span style={{ fontSize: '0.8em', transform: expandedSections.import ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s' }}>▼</span>
            </h2>
            
            <div className={`section-content ${expandedSections.import ? 'expanded' : ''}`}>
              <div className="setting-item" style={{ display: 'block' }}>
                <div className="hint" style={{ marginBottom: '10px' }}>
                  支持粘贴 BLC (Bilibili Live Chat) 样式的 CSS 代码或 @import 链接。
                  <br/>
                  系统将尝试解析并转换为当前弹幕机的样式设置。
                </div>
                <textarea
                  value={blcInput}
                  onChange={(e) => setBlcInput(e.target.value)}
                  placeholder={`示例：\n@import url("https://...");\n\n或者：\nyt-live-chat-renderer {\n  background-color: transparent !important;\n}`}
                  style={{ 
                    width: '100%', 
                    height: '200px', 
                    fontFamily: 'monospace', 
                    fontSize: '12px',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                />
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={handleImportBLC} 
                    className="btn-primary"
                    disabled={!blcInput.trim()}
                  >
                    分析并应用配置
                  </button>
                  <button 
                    onClick={() => setBlcInput('')} 
                    className="btn-secondary"
                    disabled={!blcInput.trim()}
                  >
                    清空
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 测试工具 */}
          <div className="setting-section">
            <h2 onClick={() => toggleSection('test')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              测试工具
              <span style={{ fontSize: '0.8em', transform: expandedSections.test ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s' }}>▼</span>
            </h2>
            <div className={`section-content ${expandedSections.test ? 'expanded' : ''}`}>
            <div className="setting-item">
              <label>功能测试：</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                <button 
                  onClick={handleTestFlow} 
                  className="btn-test-flow"
                >
                  <span className="icon">📺</span> 启动综合测试流
                </button>
                <button 
                  onClick={handleTestSC} 
                  className="btn-test-sc"
                >
                  <span className="icon">💰</span> 发送测试SC
                </button>
                <button 
                  onClick={handleTestAnchor} 
                  className="btn-test-anchor"
                >
                  <span className="icon">🎤</span> 发送主播消息
                </button>
              </div>
            </div>
            </div>
          </div>

          {/* 布局设置 */}
          <div className="setting-section">
            <h2 onClick={() => toggleSection('layout')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              布局设置
              <span style={{ fontSize: '0.8em', transform: expandedSections.layout ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s' }}>▼</span>
            </h2>
            
            <div className={`section-content ${expandedSections.layout ? 'expanded' : ''}`}>
            
            <div className="setting-item">
              <label>头像大小 (vh)：</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <input
                  type="range"
                  value={Math.round(settings.avatarSize * 10)}
                  onChange={(e) => setSettings({ ...settings, avatarSize: parseFloat(e.target.value) / 10 })}
                  min="10"
                  max="300"
                  step="1"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={Math.round(settings.avatarSize * 10)}
                  onChange={(e) => setSettings({ ...settings, avatarSize: parseFloat(e.target.value) / 10 })}
                  min="0"
                  max="500"
                  step="1"
                  style={{ width: '100px', flex: 'none' }}
                />
              </div>
            </div>

            <div className="setting-item">
              <label>弹幕间距 (vh)：</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <input
                  type="range"
                  value={Math.round(settings.itemSpacing * 10)}
                  onChange={(e) => setSettings({ ...settings, itemSpacing: parseFloat(e.target.value) / 10 })}
                  min="0"
                  max="50"
                  step="1"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={Math.round(settings.itemSpacing * 10)}
                  onChange={(e) => setSettings({ ...settings, itemSpacing: parseFloat(e.target.value) / 10 })}
                  min="0"
                  max="50"
                  step="1"
                  style={{ width: '100px', flex: 'none' }}
                />
              </div>
            </div>



            <div className="setting-item">
              <label>表情大小 (vh)：</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <input
                  type="range"
                  value={Math.round(settings.emotSize * 10)}
                  onChange={(e) => setSettings({ ...settings, emotSize: parseFloat(e.target.value) / 10 })}
                  min="10"
                  max="400"
                  step="1"
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  value={Math.round(settings.emotSize * 10)}
                  onChange={(e) => setSettings({ ...settings, emotSize: parseFloat(e.target.value) / 10 })}
                  min="10"
                  max="400"
                  step="1"
                  style={{ width: '100px', flex: 'none' }}
                />
              </div>
            </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="action-buttons">
            <button onClick={saveSettings} className="btn-primary">保存设置</button>
            <button onClick={preview} className="btn-success">预览效果</button>
            <button onClick={handleCopyOBSLink} className="btn-info">复制OBS链接</button>
            <button onClick={resetSettings} className="btn-warning">重置设置</button>
            <button onClick={goBack} className="btn-secondary">返回主页</button>
          </div>

          {/* 使用说明 */}
          <div className="info-box">
            <h3>使用说明</h3>
            <ol>
              <li>设置完成后点击"保存设置"</li>
              <li>点击"复制OBS链接"按钮</li>
              <li>在OBS中添加"浏览器"源</li>
              <li>URL处粘贴刚才复制的链接</li>
              <li>建议分辨率：1920x1080</li>
              <li>样式会自动加载，无需手动输入CSS</li>
            </ol>
          </div>
        </div>

        {/* 右侧：预览面板 */}
        <div className="preview-wrapper">
          <div className="preview-container">
            <ObsPreview settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObsSettingsPage;
