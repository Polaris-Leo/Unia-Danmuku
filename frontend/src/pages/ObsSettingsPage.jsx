import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ObsPreviewPanel from './ObsPreviewPanel';
import ObsNumberSetting from '../components/ObsNumberSetting';
import ObsStrokeSettings from '../components/ObsStrokeSettings';
import ObsIcon from '../components/ObsIcon';
import { defaultObsSettings, normalizeObsSettings } from '../utils/obsSettings';
import { getPreviewGeometry } from '../utils/obsRendering';
import './ObsSettingsPage.css';

const editorTabs = [
  { id: 'basic', label: '基础配置', icon: 'settings', note: '房间与显示样式' },
  { id: 'text', label: '文字排版', icon: 'text', note: '字体、颜色与行高' },
  { id: 'effects', label: '描边与质感', icon: 'effects', note: '轮廓、柔光与投影' },
  { id: 'layout', label: '布局与气泡', icon: 'layout', note: '间距、头像与背景' },
  { id: 'tools', label: '导入与测试', icon: 'tools', note: '字体导入与调试' },
];

const ObsSettingsPage = () => {
  const navigate = useNavigate();
  
  const defaultSettings = defaultObsSettings;

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
    { value: 'default', label: '主样式' },
    { value: '1', label: '缩小版（独立设置）' },
  ];

  const [settings, setSettings] = useState(defaultSettings);
  const [currentTemplate, setCurrentTemplate] = useState('default');
  const [activeTab, setActiveTab] = useState('effects');
  const [savedSignature, setSavedSignature] = useState(JSON.stringify(defaultSettings));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackKind, setFeedbackKind] = useState('success');
  const activeEditor = editorTabs.find(tab => tab.id === activeTab);
  const dirty = JSON.stringify(settings) !== savedSignature;
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 4500);
    return () => clearTimeout(timer);
  }, [feedback]);
  const previewGeometry = getPreviewGeometry(settings, currentTemplate);
  const [settingsLoading, setSettingsLoading] = useState(true);
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
    username: true,
    danmaku: true,
    bubbles: true,
    import: true,
    test: true,
    layout: true
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
    let cancelled = false;
    setSettingsLoading(true);
    setSettings(defaultSettings);
    setSavedSignature(JSON.stringify(defaultSettings));
    // 优先从后端加载设置
    fetch(`/api/obs/settings?template=${currentTemplate}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.success && data.settings && Object.keys(data.settings).length > 0) {
          console.log('✅ 从后端加载设置:', data.settings, `模板: ${data.template}`);
          const loaded = normalizeObsSettings(data.settings);
          setSettings(loaded);
          setSavedSignature(JSON.stringify(loaded));
          // 同时更新localStorage作为备份（带模板ID）
          localStorage.setItem(`obsSettings_${currentTemplate}`, JSON.stringify(data.settings));
        } else {
          // 后端没有设置，尝试从localStorage加载
          loadFromLocalStorage();
        }
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Failed to fetch settings from backend:', err);
        loadFromLocalStorage();
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });

    const loadFromLocalStorage = () => {
      const saved = localStorage.getItem(`obsSettings_${currentTemplate}`)
        || (currentTemplate === 'default' ? localStorage.getItem('obsSettings') : null);
      if (saved) {
        try {
          const loaded = normalizeObsSettings(JSON.parse(saved));
          setSettings(loaded);
          setSavedSignature(JSON.stringify(loaded));
        } catch (e) {
          console.error('Failed to parse settings', e);
        }
      }
    };

    const savedRoom = localStorage.getItem('obsRoomId');
    if (savedRoom) {
      setRoomId(savedRoom);
    }
    return () => { cancelled = true; };
  }, [currentTemplate]);

  // 保存设置
  const saveSettings = async () => {
    if (saving || settingsLoading) return;
    setSaving(true);
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
        setSavedSignature(JSON.stringify(settings));
        setFeedbackKind('success');
        setFeedback(`${templateName}已保存，OBS 将自动读取新样式`);
      } else {
        setFeedbackKind('error');
        setFeedback('保存失败：' + data.message);
      }
    } catch (err) {
      console.error('Failed to save settings to backend:', err);
      setFeedbackKind('error');
      setFeedback('后端暂不可用，配置已保存在此浏览器');
    } finally {
      setSaving(false);
    }
  };

  // 重置设置
  const resetSettings = () => {
    if (confirm('确定要重置当前模板的设置吗？保存后同步到 OBS。')) {
      setSettings(defaultSettings);
      localStorage.removeItem(`obsSettings_${currentTemplate}`);
      if (currentTemplate === 'default') localStorage.removeItem('obsSettings');
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
      setFeedbackKind('success');
      setFeedback(`${templateName}链接已复制，可粘贴到 OBS 浏览器源`);
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
      <aside className="studio-sidebar">
        <button className="studio-brand" onClick={goBack} aria-label="Unia 返回主页"><span className="brand-mark"><ObsIcon name="effects" size={23} /></span><span>Unia<span className="brand-subtitle">LIVE STUDIO</span></span></button>
        <div className="sidebar-label">创作空间</div>
        <nav className="studio-nav" aria-label="样式设置分类">{editorTabs.map(tab => <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} aria-label={tab.label} title={tab.label} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => setActiveTab(tab.id)}><ObsIcon name={tab.icon} /><span>{tab.label}</span>{activeTab === tab.id && <span className="nav-active-dot" />}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-tip"><ObsIcon name="screen" size={23} /><strong>为你的直播，添一点个性。</strong><p>每一处细节，都在这里慢慢调好。</p></div><button className="back-home" onClick={goBack}><ObsIcon name="arrow" size={16} />返回主页</button></div>
      </aside>
      <main className="studio-main">
      <header className="studio-header"><div><div className="studio-breadcrumb">直播工具<span>/</span>弹幕样式</div><h1>弹幕样式工作台<span className="studio-version">OBS</span></h1><p>一点灵感，让直播间的每句话都有自己的样子。</p></div><div className="studio-header-actions"><span className={`save-status ${dirty ? 'is-dirty' : ''}`}><span className="status-dot" />{settingsLoading ? '正在读取' : dirty ? '有未保存的修改' : '配置已加载'}</span><button className="studio-button secondary" onClick={handleCopyOBSLink}><ObsIcon name="link" size={16} />复制 OBS 链接</button><button className="studio-button primary" onClick={saveSettings} disabled={settingsLoading || saving}><ObsIcon name="check" size={17} />{saving ? '保存中…' : '保存设置'}</button></div></header>
      <div className="studio-template-bar"><div className="template-tabs" role="group" aria-label="编辑模板">{templateOptions.map(option => <button key={option.value} type="button" aria-pressed={currentTemplate === option.value} onClick={() => setCurrentTemplate(option.value)} disabled={saving}><ObsIcon name="screen" size={16} />{option.value === 'default' ? '主样式' : '缩小版'}{option.value === '1' && <span>独立</span>}</button>)}</div><p><span className="template-indicator" />正在编辑 · {currentTemplate === 'default' ? '主样式' : '缩小版'}<span className="template-separator">/</span>独立保存与同步</p></div>
      <div className="obs-settings-layout">
        <div className="settings-container">
          <div className="editor-panel-header"><span className="editor-panel-icon"><ObsIcon name={activeEditor.icon} /></span><div><h2>{activeEditor.label}</h2><p>{activeEditor.note}</p></div><span className="editor-step">{String(editorTabs.findIndex(tab => tab.id === activeTab) + 1).padStart(2, '0')}</span></div>
          <fieldset className="editor-fieldset" disabled={settingsLoading || saving}>
          <div hidden={activeTab !== 'effects'}><ObsStrokeSettings key={currentTemplate} settings={settings} onChange={patch => setSettings(previous => ({ ...previous, ...patch }))} displayHeight={previewGeometry.displayHeight} templateId={currentTemplate} /></div>

          {/* 房间号设置 */}
          <div className="setting-section" hidden={activeTab !== 'basic'}>
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

            <div className="connection-note"><span className="status-dot" />两套模板分别保存，位置与缩放在 OBS 中调整。</div>
          </div>

          {/* 用户名样式 */}
          <div className="setting-section" hidden={activeTab !== 'text'}>
            <h2><button type="button" className="section-toggle" aria-expanded={expandedSections.username} onClick={() => toggleSection('username')}>用户名样式<ObsIcon name="chevron" size={16} /></button></h2>
            
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
                仅对支持多语言字形的字体生效
              </span>
            </div>

            <ObsNumberSetting label="字号" value={settings.usernameFontSize}
                onChange={value => setSettings({ ...settings, usernameFontSize: value })}
                min={0} max={12.8} step={0.01}
                displayHeight={previewGeometry.displayHeight} resetKey={currentTemplate} />

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

            </div>
          </div>

          {/* 弹幕内容样式 */}
          <div className="setting-section" hidden={activeTab !== 'text'}>
            <h2><button type="button" className="section-toggle" aria-expanded={expandedSections.danmaku} onClick={() => toggleSection('danmaku')}>弹幕内容样式<ObsIcon name="chevron" size={16} /></button></h2>
            
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
                仅对支持多语言字形的字体生效
              </span>
            </div>

            <ObsNumberSetting label="字号" value={settings.danmakuFontSize}
                onChange={value => setSettings({ ...settings, danmakuFontSize: value })}
                min={0} max={12.8} step={0.01}
                displayHeight={previewGeometry.displayHeight} resetKey={currentTemplate} />

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

            <ObsNumberSetting label="行间距" value={settings.danmakuLineHeight ?? 1.5}
                onChange={value => setSettings({ ...settings, danmakuLineHeight: value })}
                min={0.5} max={4} step={0.05} unit=""
                displayHeight={previewGeometry.displayHeight} resetKey={currentTemplate} />
            </div>
          </div>

          {/* 气泡样式 */}
          {settings.style === 'bubbles' && (
            <div className="setting-section" hidden={activeTab !== 'layout'}>
              <h2><button type="button" className="section-toggle" aria-expanded={expandedSections.bubbles} onClick={() => toggleSection('bubbles')}>气泡样式<ObsIcon name="chevron" size={16} /></button></h2>
              
              <div className={`section-content ${expandedSections.bubbles ? 'expanded' : ''}`}>
              <ObsNumberSetting label="气泡左右内边距" value={settings.bubblePaddingX ?? 3.7}
                onChange={value => setSettings({ ...settings, bubblePaddingX: value })}
                min={0} max={10} step={0.01}
                displayHeight={previewGeometry.displayHeight} resetKey={currentTemplate} />

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
          <div className="setting-section" hidden={activeTab !== 'tools'}>
            <h2><button type="button" className="section-toggle" aria-expanded={expandedSections.import} onClick={() => toggleSection('import')}>BLC 样式导入<ObsIcon name="chevron" size={16} /></button></h2>
            
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
          <div className="setting-section" hidden={activeTab !== 'tools'}>
            <h2><button type="button" className="section-toggle" aria-expanded={expandedSections.test} onClick={() => toggleSection('test')}>测试工具<ObsIcon name="chevron" size={16} /></button></h2>
            <div className={`section-content ${expandedSections.test ? 'expanded' : ''}`}>
            <div className="setting-item">
              <label>功能测试：</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                <button 
                  onClick={handleTestFlow} 
                  className="btn-test-flow"
                >
                  <ObsIcon name="screen" /> 启动综合测试流
                </button>
                <button 
                  onClick={handleTestSC} 
                  className="btn-test-sc"
                >
                  <ObsIcon name="effects" /> 发送测试SC
                </button>
                <button 
                  onClick={handleTestAnchor} 
                  className="btn-test-anchor"
                >
                  <ObsIcon name="text" /> 发送主播消息
                </button>
              </div>
            </div>
            </div>
          </div>

          {/* 布局设置 */}
          <div className="setting-section" hidden={activeTab !== 'layout'}>
            <h2><button type="button" className="section-toggle" aria-expanded={expandedSections.layout} onClick={() => toggleSection('layout')}>布局设置<ObsIcon name="chevron" size={16} /></button></h2>
            
            <div className={`section-content ${expandedSections.layout ? 'expanded' : ''}`}>
            
            <ObsNumberSetting label="头像大小" value={settings.avatarSize}
                onChange={value => setSettings({ ...settings, avatarSize: value })}
                min={0} max={50} step={0.01}
                displayHeight={previewGeometry.displayHeight} resetKey={currentTemplate} />

            <ObsNumberSetting label="弹幕间距" value={settings.itemSpacing}
                onChange={value => setSettings({ ...settings, itemSpacing: value })}
                min={0} max={5} step={0.01}
                displayHeight={previewGeometry.displayHeight} resetKey={currentTemplate} />

            <ObsNumberSetting label="用户名/内容间距" value={settings.usernameContentSpacing ?? 0.37}
                onChange={value => setSettings({ ...settings, usernameContentSpacing: value })}
                min={-2} max={5} step={0.01}
                displayHeight={previewGeometry.displayHeight} resetKey={currentTemplate} />



            <ObsNumberSetting label="表情大小" value={settings.emotSize}
                onChange={value => setSettings({ ...settings, emotSize: value })}
                min={0} max={40} step={0.01}
                displayHeight={previewGeometry.displayHeight} resetKey={currentTemplate} />
            </div>
          </div>

          </fieldset>
          <footer className="editor-footer"><button className="quiet-button" onClick={resetSettings} disabled={settingsLoading || saving}><ObsIcon name="reset" size={15} />重置当前模板</button><button className="quiet-button" onClick={preview} disabled={settingsLoading || saving}>独立窗口预览<ObsIcon name="play" size={14} /></button></footer>

          {/* 使用说明 */}
          <details className="info-box" hidden={activeTab !== 'basic'}><summary>如何接入 OBS<ObsIcon name="chevron" size={15} /></summary>
            <ol>
              <li>设置完成后点击"保存设置"</li>
              <li>点击"复制OBS链接"按钮</li>
              <li>在OBS中添加"浏览器"源</li>
              <li>URL处粘贴刚才复制的链接</li>
              <li>浏览器源尺寸请与右侧“源宽度 / 源高度”一致；显示尺寸由 OBS 等比缩放</li>
              <li>样式会自动加载，无需手动输入CSS</li>
            </ol>
          </details>
        </div>

        {/* 右侧：预览面板 */}
        <div className="preview-wrapper">
          <fieldset className="preview-fieldset" disabled={settingsLoading || saving}>
          <ObsPreviewPanel key={currentTemplate} settings={settings} templateId={currentTemplate}
            onChange={patch => setSettings(previous => ({ ...previous, ...patch }))} />
          </fieldset>
        </div>
      </div>
      <div className="studio-bottom-note"><span>UNIA LIVE STUDIO</span><p>样式实时预览 · 保存后同步至 OBS</p><span>MAKE IT YOURS.</span></div>
      </main>
      {feedback && <div className={`studio-toast ${feedbackKind}`} role="status"><ObsIcon name={feedbackKind === 'error' ? 'alert' : 'check'} size={18} />{feedback}<button aria-label="关闭提示" onClick={() => setFeedback('')}>×</button></div>}
    </div>
  );
};

export default ObsSettingsPage;
