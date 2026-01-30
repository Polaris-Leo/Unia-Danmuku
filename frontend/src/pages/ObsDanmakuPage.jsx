import { useState, useEffect, useRef } from 'react';
import './ObsDanmakuPage.css';
import './ObsDanmakuPageBubbles.css';

// Helper to split text into Main (ASCII) and Fallback (Non-ASCII) parts
const renderTextWithFallback = (text, type = 'danmaku', overrideColor = null) => {
  if (!text) return null;
  
  // Regex to match ASCII characters (Basic Latin + Latin-1 Supplement)
  const asciiRegex = /[\u0000-\u007F]+/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  const colorStyle = overrideColor || `var(--${type}-color)`;
  
  while ((match = asciiRegex.exec(text)) !== null) {
    // Non-ASCII part before this match (Fallback Font)
    if (match.index > lastIndex) {
      const segment = text.substring(lastIndex, match.index);
      parts.push(
        <span key={`fb-${lastIndex}`} data-text={segment} style={{ 
          fontFamily: `var(--${type}-font-family-fallback)`,
          fontWeight: `var(--${type}-font-weight-fallback)`,
          fontSize: `var(--${type}-font-size)`,
          color: colorStyle
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
        fontWeight: `var(--${type}-font-weight)`,
        fontSize: `var(--${type}-font-size)`,
        color: colorStyle
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
        fontWeight: `var(--${type}-font-weight-fallback)`,
        fontSize: `var(--${type}-font-size)`,
        color: colorStyle
      }}>
        {segment}
      </span>
    );
  }
  
  return parts;
};

const ObsDanmakuPage = () => {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // 立即同步加载样式设置，避免第一条消息显示异常
  const [customStyles, setCustomStyles] = useState(() => {
    const saved = localStorage.getItem('obsSettings');
    console.log('🔍 OBS页面加载设置:', saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('✅ 解析后的设置:', parsed);
        return parsed;
      } catch (e) {
        console.error('❌ 设置解析失败:', e);
        return null;
      }
    }
    console.warn('⚠️ 未找到保存的设置，将使用默认样式');
    return null;
  });
  const [activeSCs, setActiveSCs] = useState([]); // 活跃的SC列表（倒计时中）
  const messagesContainerRef = useRef(null);
  const wsRef = useRef(null);
  const isClosingRef = useRef(false);
  
  // 从后端加载配置 (用于OBS浏览器源，无法访问localStorage的情况)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log('🔄 开始从后端加载OBS配置...');
        const res = await fetch(`/api/obs/settings?t=${Date.now()}`);
        const data = await res.json();
        
        if (data.success && data.settings && Object.keys(data.settings).length > 0) {
          console.log('✅ 成功加载OBS配置:', data.settings);
          setCustomStyles(data.settings);
          setError(null);
        } else {
          console.warn('⚠️ 后端配置为空或无效，使用默认值');
          setError('后端配置为空');
        }
      } catch (err) {
        console.error('❌ 加载OBS配置失败:', err);
        setError('加载配置失败: ' + err.message);
      }
    };

    loadConfig();
    
    // 每10秒轮询一次配置，确保OBS能同步最新的修改
    const interval = setInterval(loadConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  // 检测是否开启测试模式（URL包含 ?test=true）
  const params = new URLSearchParams(window.location.search);
  const testMode = params.get('test') === 'true';

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
          fonts.forEach(font => {
            css += `
              @font-face {
                font-family: '${font.family}';
                src: url('${font.url}');
                font-weight: 100 900;
                font-style: normal;
              }
            `;
          });
          
          styleEl.textContent = css;
        }
      })
      .catch(err => console.error('Failed to fetch fonts:', err));
  }, []);

  // 动态应用样式（移除加载样式的useEffect，因为已经在初始化时同步加载）
  useEffect(() => {
    console.log('🎨 应用样式到CSS变量:', customStyles);
    if (customStyles) {
      const root = document.documentElement;
      
      // Helper to append unit
      const toUnit = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '0vh';
        return `${num}vh`;
      };

      // 生成平滑描边阴影 (直接使用对应单位)
      const generateTextShadow = (strokeWidth, strokeColor, glowIntensity, shadowIntensity, enhanced) => {
        if (!enhanced) {
          const w = toUnit(strokeWidth);
          const s = toUnit(shadowIntensity);
          return `
            ${w} 0 0 ${strokeColor},
            -${w} 0 0 ${strokeColor},
            0 ${w} 0 ${strokeColor},
            0 -${w} 0 ${strokeColor},
            0 ${s} ${s} rgba(0,0,0,0.5)
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

      // 所有样式都需要设置，因为气泡样式也使用了部分CSS变量
      // 修复：如果未设置备用字体，则默认使用主字体，避免中文回退到系统默认字体
      // 修复：追加 , sans-serif 以确保字体族语法的完整性
      const usernameFamily = customStyles.usernameFontFamily || 'sans-serif';
      const usernameFallback = customStyles.usernameFontFamilyFallback || usernameFamily;
      
      root.style.setProperty('--username-font-family', `${usernameFamily}, sans-serif`);
      root.style.setProperty('--username-font-family-fallback', `${usernameFallback}, sans-serif`);
      
      root.style.setProperty('--username-font-size', toUnit(customStyles.usernameFontSize));
      root.style.setProperty('--username-font-weight', customStyles.usernameFontWeight || 'bold');
      root.style.setProperty('--username-font-weight-fallback', customStyles.usernameFontWeightFallback || 'normal');
      root.style.setProperty('--username-color', customStyles.usernameColor || '#333333');
      root.style.setProperty('--username-color-guard1', customStyles.usernameColorGuard1 || '#ff1a75');
      root.style.setProperty('--username-color-guard2', customStyles.usernameColorGuard2 || '#9b39f4');
      root.style.setProperty('--username-color-guard3', customStyles.usernameColorGuard3 || '#1fa3f1');
      root.style.setProperty('--username-color-anchor-start', customStyles.usernameColorAnchorStart || '#ff0000');
      root.style.setProperty('--username-color-anchor-end', customStyles.usernameColorAnchorEnd || '#ff0000');
      
      // 动态生成用户名阴影
      root.style.setProperty('--username-text-shadow', generateTextShadow(
        customStyles.usernameStrokeWidth,
        customStyles.usernameStrokeColor,
        customStyles.usernameGlowIntensity || 8,
        customStyles.usernameShadowIntensity || 6,
        customStyles.usernameEnhancedStroke !== false
      ));

      const danmakuFamily = customStyles.danmakuFontFamily || 'sans-serif';
      const danmakuFallback = customStyles.danmakuFontFamilyFallback || danmakuFamily;

      root.style.setProperty('--danmaku-font-family', `${danmakuFamily}, sans-serif`);
      root.style.setProperty('--danmaku-font-family-fallback', `${danmakuFallback}, sans-serif`);
      
      root.style.setProperty('--danmaku-font-size', toUnit(customStyles.danmakuFontSize));
      root.style.setProperty('--danmaku-font-weight', customStyles.danmakuFontWeight || 'normal');
      root.style.setProperty('--danmaku-font-weight-fallback', customStyles.danmakuFontWeightFallback || 'normal');
      root.style.setProperty('--danmaku-color', customStyles.danmakuColor || '#333333');
      root.style.setProperty('--danmaku-color-anchor-start', customStyles.danmakuColorAnchorStart || '#ff0000');
      root.style.setProperty('--danmaku-color-anchor-end', customStyles.danmakuColorAnchorEnd || '#ff0000');
      
      // 动态生成弹幕内容阴影
      root.style.setProperty('--danmaku-text-shadow', generateTextShadow(
        customStyles.danmakuStrokeWidth,
        customStyles.danmakuStrokeColor,
        customStyles.danmakuGlowIntensity || 8,
        customStyles.danmakuShadowIntensity || 6,
        customStyles.danmakuEnhancedStroke !== false
      ));

      root.style.setProperty('--avatar-size', toUnit(customStyles.avatarSize));
      root.style.setProperty('--item-spacing', toUnit(customStyles.itemSpacing));
      root.style.setProperty('--emot-size', toUnit(customStyles.emotSize || 28));
      root.style.setProperty('--bubble-padding-x', toUnit(customStyles.bubblePaddingX !== undefined ? customStyles.bubblePaddingX : 3.7));
      
      // 气泡渐变色
      root.style.setProperty('--bubble-bg-start', customStyles.danmakuBubbleBgStartTransparent ? 'transparent' : (customStyles.danmakuBubbleBgStart || '#ffa8d7'));
      root.style.setProperty('--bubble-bg-end', customStyles.danmakuBubbleBgEnd || '#ffa8d7');
      root.style.setProperty('--sc-bubble-bg-start', customStyles.scBubbleBgStartTransparent ? 'transparent' : (customStyles.scBubbleBgStart || '#c3a4f5'));
      root.style.setProperty('--sc-bubble-bg-end', customStyles.scBubbleBgEnd || '#c3a4f5');

      console.log('✅ CSS变量应用完成');
    } else {
      console.warn('⚠️ 没有自定义样式，将使用默认CSS样式');
    }
  }, [customStyles]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听 activeSCs 变化，处理顶部栏展开时的滚动
  useEffect(() => {
    if (activeSCs.length > 0) {
      // 顶部栏展开动画约400ms，动画完成后再次滚动到底部，确保最新消息可见
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [activeSCs.length]);

  // 活跃SC倒计时更新
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSCs(prev => {
        const now = Date.now();
        // 过滤掉已过期的SC
        return prev.filter(sc => sc.endTime > now);
      });
    }, 1000); // 每秒更新一次

    return () => clearInterval(timer);
  }, []);

  // 格式化倒计时显示
  const formatTime = (seconds) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}:${mins.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      return `${mins}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  // WebSocket连接逻辑
  const connect = () => {
    // 防止重复连接
    if (wsRef.current) {
      return;
    }
    
    // 从URL参数或localStorage获取房间号
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room') || localStorage.getItem('obsRoomId') || '1017';

    // 动态构建WebSocket URL，支持局域网访问
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // 包含域名和端口 (如 localhost:5173 或 192.168.1.x:3000)
    const wsUrl = `${protocol}//${host}/ws/danmaku?roomId=${roomId}`;
    
    console.log('🔌 创建 WebSocket 连接 [实例ID:', Date.now() + ']:', wsUrl);
    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;
    isClosingRef.current = false;

    websocket.onopen = () => {
      console.log('✅ WebSocket 已连接');
      setConnected(true);
      setError(null);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (['danmaku', 'superchat', 'gift', 'guard'].includes(data.type)) {
          setMessages(prev => {
            // 生成唯一指纹用于去重
            let fingerprint;
            if (data.type === 'danmaku') {
              fingerprint = `${data.timestamp}-${data.user?.uid}-${data.content}`;
            } else if (data.type === 'superchat') {
              fingerprint = `${data.time}-${data.user?.uid}-${data.price}`;
            } else if (data.type === 'gift') {
              fingerprint = `${data.timestamp}-${data.user?.uid}-${data.giftId}-${data.num}`;
            } else if (data.type === 'guard') {
              fingerprint = `${data.timestamp}-${data.user?.uid}-${data.guardLevel}`;
            }
            
            // 检查最近的消息中是否已存在相同指纹
            const isDuplicate = prev.slice(-20).some(msg => {
              let msgFingerprint;
              if (msg.type === 'danmaku') {
                msgFingerprint = `${msg.timestamp}-${msg.user?.uid}-${msg.content}`;
              } else if (msg.type === 'superchat') {
                msgFingerprint = `${msg.time}-${msg.user?.uid}-${msg.price}`;
              } else if (msg.type === 'gift') {
                msgFingerprint = `${msg.timestamp}-${msg.user?.uid}-${msg.giftId}-${msg.num}`;
              } else if (msg.type === 'guard') {
                msgFingerprint = `${msg.timestamp}-${msg.user?.uid}-${msg.guardLevel}`;
              }
              return msgFingerprint === fingerprint;
            });

            if (isDuplicate) {
              console.log('⚠️ 忽略重复消息:', fingerprint);
              return prev;
            }

            // 过滤低价值礼物 (例如小于 10 元的)
            if (data.type === 'gift') {
               // 如果 coinType 是 silver，则忽略
               if (data.coinType === 'silver') return prev;
               // 如果 totalCoin < 10000 (10元)，则忽略
               const totalValue = data.totalCoin || (data.price * data.num);
               if (totalValue < 10000) return prev;
            }

            const newMessages = [...prev, {
              id: Date.now() + Math.random(),
              ...data
            }].slice(-50);
            return newMessages;
          });
          
          // 如果是SC，添加到活跃SC列表
          if (data.type === 'superchat') {
            const duration = getSCDuration(data.price);
            const newSC = {
              id: Date.now() + Math.random(),
              type: 'superchat',
              user: data.user,
              price: data.price,
              startTime: Date.now(),
              endTime: Date.now() + duration * 1000,
              duration: duration,
              message: data.message
            };
            setActiveSCs(prev => [...prev, newSC]);
          }

          // 如果是舰长，添加到活跃列表 (显示在顶部)
          if (data.type === 'guard') {
            // 舰长价格通常是 198000 (198元), 提督 1998000, 总督 19998000
            const priceRMB = (data.price || 0) / 1000;
            const duration = getSCDuration(priceRMB);
            
            const newGuard = {
              id: Date.now() + Math.random(),
              type: 'guard',
              user: data.user,
              price: priceRMB, // 存RMB价格以便统一处理颜色
              guardLevel: data.guardLevel,
              startTime: Date.now(),
              endTime: Date.now() + duration * 1000,
              duration: duration,
              message: `开通了 ${data.giftName}`
            };
            setActiveSCs(prev => [...prev, newGuard]);
          }
        }
      } catch (error) {
        console.error('❌ 消息解析失败:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket 错误:', error);
      setError('WebSocket 连接错误');
      setConnected(false);
    };

    websocket.onclose = () => {
      console.log('🔌 WebSocket 已断开');
      setConnected(false);
      wsRef.current = null;
      if (!isClosingRef.current) {
        console.log('🔄 3秒后尝试重新连接...');
        setTimeout(() => {
          connect();
        }, 3000);
      }
    };
  };

  useEffect(() => {
    connect();

    return () => {
      console.log('🧹 清理 WebSocket 连接');
      isClosingRef.current = true;
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, []);

  // 处理表情包
  const renderContentWithEmoji = (content, emots) => {
    if (!emots || Object.keys(emots).length === 0) {
      return content;
    }

    const emotMatches = [];
    Object.keys(emots).forEach(emotText => {
      let index = content.indexOf(emotText);
      while (index !== -1) {
        emotMatches.push({
          text: emotText,
          start: index,
          end: index + emotText.length,
          info: emots[emotText]
        });
        index = content.indexOf(emotText, index + 1);
      }
    });

    if (emotMatches.length === 0) {
      return renderTextWithFallback(content, 'danmaku');
    }

    emotMatches.sort((a, b) => a.start - b.start);

    const parts = [];
    let lastEnd = 0;
    let key = 0;

    emotMatches.forEach(emot => {
      if (emot.start >= lastEnd) {
        if (emot.start > lastEnd) {
          parts.push(renderTextWithFallback(content.substring(lastEnd, emot.start), 'danmaku'));
        }

        const textContent = emot.text.replace(/[\[\]]/g, '');
        const isRoomEmoji = emot.text.startsWith('[[');
        const isSmallBiliEmoji = emot.info.height <= 30;
        const shouldLimit = !isRoomEmoji && isSmallBiliEmoji;

        parts.push(
          <img 
            key={`emot-${key++}`}
            src={emot.info.url} 
            alt={emot.text}
            title={emot.text}
            referrerPolicy="no-referrer"
            className={shouldLimit ? 'emote emote-small' : 'emote emote-large'}
          />
        );

        lastEnd = emot.end;
      }
    });

    if (lastEnd < content.length) {
      parts.push(renderTextWithFallback(content.substring(lastEnd), 'danmaku'));
    }

    return parts.length > 0 ? parts : renderTextWithFallback(content, 'danmaku');
  };

  // 判断是否只有大表情
  const hasOnlyEmotes = (content, emots) => {
    if (!emots) return false;
    
    let textOnly = content;
    Object.keys(emots).forEach(emotText => {
      textOnly = textOnly.replace(new RegExp(emotText.replace(/[[\]]/g, '\\$&'), 'g'), '');
    });
    
    return textOnly.trim().length === 0;
  };

  // 根据SC金额获取颜色
  const getSCColor = (price) => {
    // 特殊金额紫色配色（优先级最高）
    if (price === 77777) return { bg: '#7e00a8', bgLight: '#9510c2' }; // 最深紫色
    if (price === 17777) return { bg: '#900bbd', bgLight: '#a825d1' }; // 深紫色
    if (price === 7777) return { bg: '#b645da', bgLight: '#c860e6' }; // 中深紫色
    if (price === 777) return { bg: '#d280f0', bgLight: '#dd99f4' }; // 中浅紫色
    if (price === 177) return { bg: '#ebb8fc', bgLight: '#f2cafd' }; // 浅紫色
    if (price === 77) return { bg: '#f5d4ff', bgLight: '#fae5ff' }; // 最浅紫色
    
    // 常规金额配色
    if (price >= 2000) return { bg: '#ab1a32', bgLight: '#c42a42' }; // 深红色
    if (price >= 1000) return { bg: '#e54d4d', bgLight: '#ed6565' }; // 红色
    if (price >= 500) return { bg: '#e09443', bgLight: '#e8a75c' }; // 橙色
    if (price >= 100) return { bg: '#e2b52b', bgLight: '#eac043' }; // 黄色
    if (price >= 50) return { bg: '#427d9e', bgLight: '#5a93b5' }; // 浅蓝色
    return { bg: '#2a60b2', bgLight: '#4275c4' }; // 蓝色（30元以下）
  };

  // 根据舰长等级获取颜色
  const getGuardColor = (level) => {
    if (level === 1) return { bg: '#ab1a32', bgLight: '#c42a42' }; // 总督 - 深红
    if (level === 2) return { bg: '#900bbd', bgLight: '#a825d1' }; // 提督 - 紫色
    return { bg: '#2a60b2', bgLight: '#4275c4' }; // 舰长 - 蓝色
  };

  // 根据SC金额获取CD时长（秒）
  const getSCDuration = (price) => {
    if (price >= 2000) return 7200; // 2小时
    if (price >= 1000) return 3600; // 1小时
    if (price >= 500) return 1800; // 30分钟
    if (price >= 100) return 300; // 5分钟
    if (price >= 50) return 120; // 2分钟
    return 60; // 60秒
  };

  return (
    // 简洁样式
    <div className={`obs-danmaku-simple ${activeSCs.length > 0 ? 'has-sc-timer' : ''} ${customStyles?.style === 'bubbles' ? 'style-bubbles' : ''}`}>
      {/* SC倒计时栏 */}
      {activeSCs.length > 0 && (
        <div className="sc-timer-bar">
          {activeSCs.map(sc => {
            const now = Date.now();
            const elapsed = now - sc.startTime;
            const remaining = Math.max(0, Math.ceil((sc.endTime - now) / 1000));
            const progress = Math.min(100, (elapsed / (sc.duration * 1000)) * 100);
            
            let colors;
            let label;
            
            if (sc.type === 'guard') {
               colors = getGuardColor(sc.guardLevel);
               label = sc.guardLevel === 1 ? '总督' : (sc.guardLevel === 2 ? '提督' : '舰长');
            } else {
               colors = getSCColor(sc.price);
               label = `CN¥${sc.price}`;
            }
            
            return (
              <div 
                key={sc.id} 
                className="sc-timer-capsule"
                style={{
                  '--sc-bg': colors.bg,
                  '--sc-bg-light': colors.bgLight,
                  '--progress': `${progress}%`
                }}
              >
                <div className="sc-timer-avatar">
                  <img src={sc.user.face} alt="" referrerPolicy="no-referrer" />
                </div>
                <div className="sc-timer-price">{label}</div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="danmaku-list" ref={messagesContainerRef}>
        {messages.map(msg => {
          const guardLevel = msg.user?.guardLevel || 0;
          
          // SC消息特殊处理
          if (msg.type === 'superchat') {
            const colors = getSCColor(msg.price);
            return (
              <div key={msg.id} className="sc-wrapper superchat">
                <div className="sc-item" style={{ '--sc-bg': colors.bg, '--sc-bg-light': colors.bgLight }}>
                  <div className="sc-header">
                    <yt-img-shadow class="sc-avatar no-transition style-scope yt-live-chat-text-message-renderer" id="author-photo" height="24" width="24">
                      <img 
                        id="img"
                        className="style-scope yt-img-shadow"
                        src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                        alt={msg.user?.username}
                        referrerPolicy="no-referrer"
                        height="24" 
                        width="24"
                      />
                    </yt-img-shadow>
                    <div className="sc-user-info">
                      <div className="sc-username">
                        {renderTextWithFallback(msg.user?.username || '未知用户', 'username')}
                      </div>
                    </div>
                    <div className="sc-price">CN¥{msg.price}</div>
                  </div>
                  <div className="sc-content">
                    {renderTextWithFallback(msg.message, 'danmaku')}
                  </div>
                </div>
              </div>
            );
          }

          // 舰长消息
          if (msg.type === 'guard') {
            const colors = getGuardColor(msg.guardLevel);
            const roleName = msg.guardLevel === 1 ? '总督' : (msg.guardLevel === 2 ? '提督' : '舰长');
            return (
              <div key={msg.id} className={`guard-wrapper guard-level-${msg.guardLevel}`}>
                <div className="sc-item" style={{ '--sc-bg': colors.bg, '--sc-bg-light': colors.bgLight }}>
                  <div className="sc-header">
                    <yt-img-shadow class="sc-avatar no-transition style-scope yt-live-chat-text-message-renderer" id="author-photo" height="24" width="24">
                      <img 
                        id="img"
                        className="style-scope yt-img-shadow"
                        src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                        alt={msg.user?.username}
                        referrerPolicy="no-referrer"
                        height="24" 
                        width="24"
                      />
                    </yt-img-shadow>
                    <div className="sc-user-info">
                      <div className="sc-username">
                        {renderTextWithFallback(msg.user?.username || '未知用户', 'username')}
                      </div>
                    </div>
                    <div className="sc-price">{roleName}</div>
                  </div>
                  <div className="sc-content">
                    {renderTextWithFallback(`${msg.user?.username} 开通了 ${roleName}`, 'danmaku')}
                  </div>
                </div>
              </div>
            );
          }

          // 礼物消息
          if (msg.type === 'gift') {
             const colors = { bg: '#ff6699', bgLight: '#ff88b2' }; // 默认粉色
             // 如果是高价值礼物 (>= 100元)，可以用红色
             if ((msg.totalCoin || (msg.price * msg.num)) >= 100000) {
                colors.bg = '#e54d4d';
                colors.bgLight = '#ed6565';
             }

             return (
              <div key={msg.id} className="sc-wrapper gift">
                <div className="sc-item" style={{ '--sc-bg': colors.bg, '--sc-bg-light': colors.bgLight }}>
                  <div className="sc-header">
                    <yt-img-shadow class="sc-avatar no-transition style-scope yt-live-chat-text-message-renderer" id="author-photo" height="24" width="24">
                      <img 
                        id="img"
                        className="style-scope yt-img-shadow"
                        src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                        alt={msg.user?.username}
                        referrerPolicy="no-referrer"
                        height="24" 
                        width="24"
                      />
                    </yt-img-shadow>
                    <div className="sc-user-info">
                      <div className="sc-username">
                        {renderTextWithFallback(msg.user?.username || '未知用户', 'username')}
                      </div>
                    </div>
                    <div className="sc-price">投喂</div>
                  </div>
                  <div className="sc-content" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>{renderTextWithFallback(`送出了 ${msg.giftName} x ${msg.num}`, 'danmaku')}</span>
                    {msg.giftIcon && <img src={msg.giftIcon} alt="" style={{ height: '30px' }} referrerPolicy="no-referrer" />}
                  </div>
                </div>
              </div>
            );
          }
          
          // 普通弹幕
          return (
            <div key={msg.id} className={`danmaku-wrapper ${guardLevel > 0 ? `guard-level-${guardLevel}` : ''} ${msg.user?.isAdmin ? 'admin' : ''} ${msg.user?.isAnchor ? 'anchor' : ''}`} data-uid={msg.user?.uid}>
              <div className="danmaku-item">
                <div className="avatar">
                  <img 
                    src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                    alt={msg.user?.username}
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="content-area">
                  <div className="username-line">
                    {guardLevel > 0 && (
                      <img 
                        src={
                          guardLevel === 3 
                            ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/captain-Bjw5Byb5.png'
                            : guardLevel === 2
                            ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/supervisor-u43ElIjU.png'
                            : 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/governor-DpDXKEdA.png'
                        }
                        alt={`guard-${guardLevel}`}
                        referrerPolicy="no-referrer"
                        className="guard-icon"
                      />
                    )}
                    <span className={`username ${guardLevel > 0 ? `guard-${guardLevel}` : ''}`} lang={customStyles?.usernameLang || 'zh-CN'}>
                      {renderTextWithFallback(
                        msg.user?.username || '未知用户', 
                        'username', 
                        guardLevel > 0 ? `var(--username-color-guard${guardLevel})` : null
                      )}
                    </span>
                  </div>
                  <div className="danmaku-text" lang={customStyles?.danmakuLang || 'zh-CN'}>
                    {(() => {
                      const content = renderContentWithEmoji(msg.content, msg.emots);
                      if (msg.user?.isAnchor) {
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
          );
        })}
      </div>
    </div>
  );
};

export default ObsDanmakuPage;
