import React, { useState, useEffect, useRef } from 'react';
import './ObsPreview.css';
import './styles/Bubbles.css';

// Helper to split text into Main (ASCII) and Fallback (Non-ASCII) parts
const renderTextWithFallback = (text, type = 'danmaku') => {
  if (!text) return null;
  
  // Regex to match ASCII characters (Basic Latin + Latin-1 Supplement)
  const asciiRegex = /[\u0000-\u007F]+/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = asciiRegex.exec(text)) !== null) {
    // Non-ASCII part before this match (Fallback Font)
    if (match.index > lastIndex) {
      const segment = text.substring(lastIndex, match.index);
      parts.push(
        <span key={`fb-${lastIndex}`} data-text={segment} style={{ 
          fontFamily: `var(--${type}-font-family-fallback)`,
          fontWeight: `var(--${type}-font-weight-fallback)`
        }}>
          {segment}
        </span>
      );
    }
    
    // ASCII part (Main Font)
    const segment = match[0];
    parts.push(
      <span key={`main-${match.index}`} data-text={segment} style={{ 
        fontFamily: `var(--${type}-font-family)`,
        fontWeight: `var(--${type}-font-weight)`
      }}>
        {segment}
      </span>
    );
    
    lastIndex = asciiRegex.lastIndex;
  }
  
  // Remaining Non-ASCII part
  if (lastIndex < text.length) {
    const segment = text.substring(lastIndex);
    parts.push(
      <span key={`fb-${lastIndex}`} data-text={segment} style={{ 
        fontFamily: `var(--${type}-font-family-fallback)`,
        fontWeight: `var(--${type}-font-weight-fallback)`
      }}>
        {segment}
      </span>
    );
  }
  
  return parts;
};

const ObsPreview = ({ settings }) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // 自动计算缩放比例以适应容器
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parentHeight = containerRef.current.parentElement.clientHeight;
        const parentWidth = containerRef.current.parentElement.clientWidth;
        // 目标尺寸 2400x3000
        // 计算基于宽度的缩放和基于高度的缩放，取较小值以确保完全容纳
        const scaleX = parentWidth / 2400;
        const scaleY = parentHeight / 3000;
        setScale(Math.min(scaleX, scaleY));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // 示例数据
  const sampleMessages = [
    {
      id: 1,
      type: 'message',
      user: { username: '萌新用户', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '主播好！第一次来看直播',
      guardLevel: 0
    },
    {
      id: 2,
      type: 'message',
      user: { username: 'EnglishUser', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: 'Hello streamer! Nice to meet you. This is an English test message.',
      guardLevel: 0
    },
    {
      id: 3,
      type: 'message',
      user: { username: '日本語ユーザー', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: 'こんにちは！初見です。配信頑張ってください！',
      guardLevel: 3
    },
    {
      id: 4,
      type: 'message',
      user: { username: '提督巨佬', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: 'Mixed Test: 中文 English 日本語 12345',
      guardLevel: 2
    },
    {
      id: 5,
      type: 'message',
      user: { username: '总督神豪', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '大家晚上好，今晚不醉不归',
      guardLevel: 1
    },
    {
      id: 6,
      type: 'message',
      user: { username: '表情包达人', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '这也太好笑了吧 [dog] [笑哭]',
      guardLevel: 0,
      emots: {
        '[dog]': { url: 'https://i0.hdslb.com/bfs/live/4428c84e694fbf4e0ef6c06e958d9352c3582740.png', height: 20 },
        '[笑哭]': { url: 'https://i0.hdslb.com/bfs/live/e6073c6849f735ae6cb7af3a20ff7dcec962b4c5.png', height: 20 }
      }
    },
    {
      id: 7,
      type: 'message',
      user: { username: '话痨用户', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '这是一条非常非常长的弹幕消息，用来测试换行显示的效果是否正常。如果显示不正常的话，就需要调整CSS样式了。',
      guardLevel: 0
    },
    {
      id: 8,
      type: 'message',
      user: { username: '大表情测试', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '[U脑过载]',
      guardLevel: 0,
      emots: {
        '[U脑过载]': { url: 'https://i0.hdslb.com/bfs/live/6528ebcab366a09c92c4c6bf2a16af1a088a9578.png', height: 60 }
      }
    },
    {
      id: 9,
      type: 'gift',
      user: { username: '富哥', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      giftName: '告白气球',
      num: 1,
      price: 520,
      totalCoin: 52000
    },
    {
      id: 11,
      type: 'message',
      user: { username: '主播本人', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg', isAnchor: true },
      message: '欢迎大家来到直播间！这是一条主播发送的弹幕。',
      guardLevel: 0
    }
  ];

  const sampleSC = {
    id: 99,
    type: 'superchat',
    user: { username: '富豪用户', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
    message: '这是一条醒目留言 Super Chat，支持主播！',
    price: 30,
    startTime: Date.now(),
    endTime: Date.now() + 60000,
    duration: 60
  };

  // Helper to convert value to unit
  const toUnit = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0cqh';
    return `${num}cqh`;
  };

  // 生成平滑描边阴影
  const generateTextShadow = (strokeWidth, strokeColor, glowIntensity, shadowIntensity, enhanced) => {
    if (!enhanced) {
      const sw = toUnit(strokeWidth);
      const swNeg = toUnit(-strokeWidth);
      const si = toUnit(shadowIntensity);
      return `
        ${sw} 0 0 ${strokeColor},
        ${swNeg} 0 0 ${strokeColor},
        0 ${sw} 0 ${strokeColor},
        0 ${swNeg} 0 ${strokeColor},
        0 ${si} ${si} rgba(0,0,0,0.5)
      `;
    }

    // 增强模式：多层描边以实现平滑效果
    const layers = [0.33, 0.66, 1];
    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]
    ];
    
    let shadows = [];
    
    // 描边层
    if (strokeWidth > 0) {
      layers.forEach(layer => {
        const w = strokeWidth * layer;
        directions.forEach(dir => {
          shadows.push(`${toUnit(w * dir[0])} ${toUnit(w * dir[1])} 0 ${strokeColor}`);
        });
      });
    }
    
    // 外发光
    if (glowIntensity > 0) {
      shadows.push(`0 0 ${toUnit(glowIntensity)} ${strokeColor}`);
    }
    
    // 投影
    if (shadowIntensity > 0) {
      shadows.push(`0 ${toUnit(shadowIntensity * 0.5)} ${toUnit(shadowIntensity)} rgba(0,0,0,0.6)`);
    }
    
    return shadows.join(', ');
  };

  // 修复：如果未设置备用字体，则默认使用主字体
  const usernameFamily = settings.usernameFontFamily || 'sans-serif';
  const usernameFallback = settings.usernameFontFamilyFallback || usernameFamily;
  
  const danmakuFamily = settings.danmakuFontFamily || 'sans-serif';
  const danmakuFallback = settings.danmakuFontFamilyFallback || danmakuFamily;

  // 构建样式对象
  const containerStyle = {
    '--username-font-family': `${usernameFamily}, sans-serif`,
    '--username-font-family-fallback': `${usernameFallback}, sans-serif`,
    '--username-font-size': toUnit(settings.usernameFontSize),
    '--username-font-weight': settings.usernameFontWeight,
    '--username-font-weight-fallback': settings.usernameFontWeightFallback || 'normal',
    '--username-color': settings.usernameColor,
    '--username-color-guard1': settings.usernameColorGuard1,
    '--username-color-guard2': settings.usernameColorGuard2,
    '--username-color-guard3': settings.usernameColorGuard3,
    '--username-color-anchor-start': settings.usernameColorAnchorStart || '#ff0000',
    '--username-color-anchor-end': settings.usernameColorAnchorEnd || '#ff0000',
    
    // 动态生成阴影
    '--username-text-shadow': generateTextShadow(
      settings.usernameStrokeWidth,
      settings.usernameStrokeColor,
      settings.usernameGlowIntensity,
      settings.usernameShadowIntensity,
      settings.usernameEnhancedStroke
    ),
    
    '--danmaku-font-family': `${danmakuFamily}, sans-serif`,
    '--danmaku-font-family-fallback': `${danmakuFallback}, sans-serif`,
    '--danmaku-font-size': toUnit(settings.danmakuFontSize),
    '--danmaku-font-weight': settings.danmakuFontWeight,
    '--danmaku-font-weight-fallback': settings.danmakuFontWeightFallback || 'normal',
    '--danmaku-color': settings.danmakuColor,
    '--danmaku-color-anchor-start': settings.danmakuColorAnchorStart || '#ff0000',
    '--danmaku-color-anchor-end': settings.danmakuColorAnchorEnd || '#ff0000',
    
    // 动态生成阴影
    '--danmaku-text-shadow': generateTextShadow(
      settings.danmakuStrokeWidth,
      settings.danmakuStrokeColor,
      settings.danmakuGlowIntensity,
      settings.danmakuShadowIntensity,
      settings.danmakuEnhancedStroke
    ),

    '--avatar-size': toUnit(settings.avatarSize),
    '--item-spacing': toUnit(settings.itemSpacing),
    '--emot-size': toUnit(settings.emotSize || 28),
    '--bubble-padding-x': toUnit(settings.bubblePaddingX !== undefined ? settings.bubblePaddingX : 3.7),
    
    // 气泡渐变色
    '--bubble-bg-start': settings.danmakuBubbleBgStartTransparent ? 'transparent' : (settings.danmakuBubbleBgStart || '#ffa8d7'),
    '--bubble-bg-end': settings.danmakuBubbleBgEnd || '#ffa8d7',
    '--sc-bubble-bg-start': settings.scBubbleBgStartTransparent ? 'transparent' : (settings.scBubbleBgStart || '#c3a4f5'),
    '--sc-bubble-bg-end': settings.scBubbleBgEnd || '#c3a4f5',
  };

  // 渲染内容（简化版，不包含所有逻辑）
  const renderContent = (msg) => {
    if (msg.emots && Object.keys(msg.emots).length > 0) {
      const pattern = new RegExp(Object.keys(msg.emots).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
      
      // 如果没有匹配到任何表情，直接返回文本
      if (!pattern.test(msg.message)) {
        return msg.message;
      }
      
      // 重置 lastIndex
      pattern.lastIndex = 0;
      
      const parts = msg.message.split(pattern);
      const matches = msg.message.match(pattern) || [];
      
      const content = [];
      parts.forEach((part, i) => {
        if (part) content.push(renderTextWithFallback(part, 'danmaku'));
        if (i < matches.length) {
          const key = matches[i];
          if (msg.emots[key]) {
            const isLarge = msg.emots[key].height > 30;
            content.push(
              <img 
                key={`emot-${i}`} 
                src={msg.emots[key].url} 
                className={`danmaku-emot ${isLarge ? 'emote-large' : ''}`}
                alt={key} 
                referrerPolicy="no-referrer"
                onError={(e) => { e.target.style.display = 'none'; }} // 图片加载失败隐藏
              />
            );
          } else {
            content.push(renderTextWithFallback(key, 'danmaku'));
          }
        }
      });
      
      return content.length > 0 ? content : renderTextWithFallback(msg.message, 'danmaku');
    }
    return renderTextWithFallback(msg.message, 'danmaku');
  };

  return (
    <div className="obs-preview-wrapper">
      <div 
        className={`obs-preview-scale-container ${settings.style === 'bubbles' ? 'style-bubbles' : ''}`}
        style={{ ...containerStyle, transform: `scale(${scale})` }}
        ref={containerRef}
      >
        {/* SC 倒计时栏模拟 */}
        <div className="sc-timer-bar">
        <div 
          className="sc-timer-capsule"
          style={{
            '--sc-bg': '#2a60b2',
            '--sc-bg-light': '#4275c4',
            '--progress': '70%'
          }}
        >
          <div className="sc-timer-avatar">
            <img src={sampleSC.user.face} alt="" referrerPolicy="no-referrer" />
          </div>
          <div className="sc-timer-price">{renderTextWithFallback(`CN¥${sampleSC.price}`, 'danmaku')}</div>
        </div>
      </div>

      <div className="danmaku-list has-sc-timer">
        {/* SC 消息 */}
        <div className="sc-wrapper superchat">
          <div className="sc-item" style={{ '--sc-bg': '#2a60b2', '--sc-bg-light': '#4275c4' }}>
            <div className="sc-header">
              <yt-img-shadow class="sc-avatar no-transition style-scope yt-live-chat-text-message-renderer" id="author-photo" height="24" width="24">
                <img 
                  id="img"
                  className="style-scope yt-img-shadow"
                  src={sampleSC.user.face}
                  alt={sampleSC.user.username}
                  referrerPolicy="no-referrer"
                  height="24" 
                  width="24"
                />
              </yt-img-shadow>
              <div className="sc-user-info">
                <div className="sc-username">{renderTextWithFallback(sampleSC.user.username, 'username')}</div>
              </div>
              <div className="sc-price">CN¥{sampleSC.price}</div>
            </div>
            <div className="sc-content">
              {renderTextWithFallback(sampleSC.message, 'danmaku')}
            </div>
          </div>
        </div>

        {/* 普通消息 */}
        {sampleMessages.map(msg => {
          // 舰长消息
          if (msg.type === 'guard') {
            const colors = { bg: '#2a60b2', bgLight: '#4275c4' }; // 舰长蓝色
            const roleName = '舰长';
            return (
              <div key={msg.id} className="guard-wrapper">
                <div className="sc-item" style={{ '--sc-bg': colors.bg, '--sc-bg-light': colors.bgLight }}>
                  <div className="sc-header">
                    <yt-img-shadow class="sc-avatar no-transition style-scope yt-live-chat-text-message-renderer" id="author-photo" height="24" width="24">
                      <img 
                        id="img"
                        className="style-scope yt-img-shadow"
                        src={msg.user.face}
                        alt={msg.user.username}
                        referrerPolicy="no-referrer"
                        height="24" 
                        width="24"
                      />
                    </yt-img-shadow>
                    <div className="sc-user-info">
                      <div className="sc-username">{renderTextWithFallback(msg.user.username, 'username')}</div>
                    </div>
                    <div className="sc-price">{roleName}</div>
                  </div>
                  <div className="sc-content">
                    {renderTextWithFallback(`${msg.user.username} 开通了 ${roleName}`, 'danmaku')}
                  </div>
                </div>
              </div>
            );
          }

          // 礼物消息
          if (msg.type === 'gift') {
            const colors = { bg: '#e54d4d', bgLight: '#ed6565' }; // 高价值礼物红色
            return (
              <div key={msg.id} className="sc-wrapper gift">
                <div className="sc-item" style={{ '--sc-bg': colors.bg, '--sc-bg-light': colors.bgLight }}>
                  <div className="sc-header">
                    <yt-img-shadow class="sc-avatar no-transition style-scope yt-live-chat-text-message-renderer" id="author-photo" height="24" width="24">
                      <img 
                        id="img"
                        className="style-scope yt-img-shadow"
                        src={msg.user.face}
                        alt={msg.user.username}
                        referrerPolicy="no-referrer"
                        height="24" 
                        width="24"
                      />
                    </yt-img-shadow>
                    <div className="sc-user-info">
                      <div className="sc-username">{renderTextWithFallback(msg.user.username, 'username')}</div>
                    </div>
                    <div className="sc-price">投喂</div>
                  </div>
                  <div className="sc-content" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>{renderTextWithFallback(`送出了 ${msg.giftName} x ${msg.num}`, 'danmaku')}</span>
                  </div>
                </div>
              </div>
            );
          }

          // 普通弹幕
          return (
          <div key={msg.id} className={`danmaku-wrapper ${msg.user.isAnchor ? 'anchor' : ''}`}>
            <div className="danmaku-item">
              <div className="avatar">
                <img src={msg.user.face} alt="" referrerPolicy="no-referrer" />
              </div>
              <div className="content-area">
                <div className="username-line">
                  {msg.guardLevel > 0 && (
                    <img 
                      className="guard-icon"
                      src={
                        msg.guardLevel === 3 ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/captain-Bjw5Byb5.png' :
                        msg.guardLevel === 2 ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/supervisor-u43ElIjU.png' :
                        'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/governor-DpDXKEdA.png'
                      }
                      alt="guard"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className={`username guard-${msg.guardLevel}`} lang={settings.usernameLang || 'zh-CN'}>
                    {renderTextWithFallback(msg.user.username, 'username')}
                  </span>
                </div>
                <div className="danmaku-text" lang={settings.danmakuLang || 'zh-CN'}>
                  {(() => {
                    const content = renderContent(msg);
                    if (msg.user.isAnchor) {
                      return (
                        <>
                          <div className="text-layer-stroke">{content}</div>
                          <div className="text-layer-gradient">{content}</div>
                        </>
                      );
                    }
                    return content;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>
      </div>
    </div>
  );
};

export default ObsPreview;
