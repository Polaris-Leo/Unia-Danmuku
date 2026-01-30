import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './ThankYouPage.css';

const ThankYouPage = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');
  const [queue, setQueue] = useState([]);
  const [currentGift, setCurrentGift] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const [ws, setWs] = useState(null);
  const audioRef = useRef(null);
  const processingRef = useRef(false);
  const [config, setConfig] = useState({
    audioEnabled: true,
    backgroundImg: '',
    audioUrl: '',
    imageHeight: 600, // Default 600px for 2000x2000
    
    // Templates
    template: '感谢 {sender} 的 {gift} * {count} ({price} 元)',
    blindboxTemplate: '感谢 {sender} 的 {blindbox_name} * {count}, 爆出 {gift} ({price} 元)',
    guardTemplate: '感谢 {sender} 开通 {gift} * {count}',
    scTemplate: '感谢 {sender} 的醒目留言 ({price} 元): {content}',
    
    // Style
    fontFamily: 'Microsoft YaHei',
    fontSize: 120,
    fontColor: '#333333',
    fontWeight: 'bold',
    textSpacing: 0, // New: Spacing between image and text
    
    // Advanced Text Style
    strokeWidth: 0,
    strokeColor: '#ffffff',
    glowIntensity: 0,
    shadowIntensity: 0,
    highlightKeywords: false,
    highlightColor: '#ff0000',

    // Bubble Style
    bubbleEnabled: false,
    bubbleColorStart: 'transparent',
    bubbleColorEnd: '#ffa8d7',

    // Logic
    minPrice: 9.9,
    ignoreFree: true,
    blindboxCalcOriginal: false,
    
    // Animation
    stayDuration: 5,
    animationDuration: 1,
    animationType: 'fadein'
  });

  // Load config
  useEffect(() => {
    if (roomId) {
      axios.get(`/api/thankyou/${roomId}`)
        .then(res => {
          if (res.data.config) {
            setConfig(prev => ({ ...prev, ...res.data.config }));
          }
        })
        .catch(err => console.error(err));
    }
  }, [roomId]);

  // Initialize Audio
  useEffect(() => {
    if (config.audioUrl) {
      audioRef.current = new Audio(config.audioUrl);
      // Preload audio to ensure it's ready
      audioRef.current.load();
    } else {
      audioRef.current = null;
    }
  }, [config.audioUrl]);

  // Connect WebSocket
  useEffect(() => {
    if (roomId) {
      connectWebSocket();
    }
    return () => {
      if (ws) ws.close();
    };
  }, [roomId]);

  // Process Queue
  useEffect(() => {
    if (queue.length > 0 && !processingRef.current) {
      processQueue();
    }
  }, [queue]);

  // Add a click handler to unlock audio context if needed (for browser testing)
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }).catch(() => {});
      }
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    return () => document.removeEventListener('click', unlockAudio);
  }, []);

  const connectWebSocket = () => {
    if (!roomId) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; 
    const wsUrl = `${protocol}//${host}/ws/danmaku?roomId=${roomId}`;
    
    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      console.log('Connected to WebSocket');
    };

    newWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (roomId && msg.roomId && String(msg.roomId) !== String(roomId)) {
            return;
        }
        
        handleMessage(msg);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    newWs.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(connectWebSocket, 3000);
    };

    setWs(newWs);
  };

  const handleMessage = (msg) => {
    // Support both nested {type, data} and flat {type, ...data} formats
    const type = msg.type;
    const data = msg.data || msg;

    // Handle Config Update
    if (type === 'config_updated') {
      console.log('Config updated via WebSocket', msg.config);
      setConfig(prev => ({ ...prev, ...msg.config }));
      return;
    }

    if (type === 'gift' || type === 'guard' || type === 'superchat') {
      let totalPrice = 0;
      let giftType = 'gift'; // default

      if (type === 'guard') {
        giftType = 'guard';
        totalPrice = ((Number(data.price) || 0) * (Number(data.num) || 1)) / 1000;
      } else if (type === 'superchat') {
        giftType = 'sc';
        totalPrice = Number(data.price) || 0; // SC price is usually already in RMB or needs conversion? 
        // Usually SC price from bilibili-live-listener is in RMB directly or needs check. 
        // Assuming standard format where price is in RMB for SC.
        // Wait, bilibili-live-listener usually gives price in RMB for SC.
      } else {
        // Normal Gift or Blindbox
        if (data.blindGift) {
          giftType = 'blindbox';
          // Blindbox price calculation
          if (config.blindboxCalcOriginal) {
             // Use original price of the blindbox item itself (cost)
             totalPrice = ((Number(data.price) || 0) * (Number(data.num) || 1)) / 1000;
          } else {
             // Use value of item inside (dropped item)
             // blindGift usually has original_gift_price (in 1000 = 1 RMB units)
             const droppedPrice = (data.blindGift && data.blindGift.original_gift_price) 
                ? data.blindGift.original_gift_price 
                : data.price;
             totalPrice = ((Number(droppedPrice) || 0) * (Number(data.num) || 1)) / 1000;
          }
        } else {
          // Normal Gift
          if (data.coinType === 'gold') {
             totalPrice = ((Number(data.price) || 0) * (Number(data.num) || 1)) / 1000;
          } else {
            totalPrice = 0; // Silver gift
          }
        }
      }

      // Filter
      if (config.ignoreFree && totalPrice <= 0 && type !== 'guard') return;
      if (totalPrice < config.minPrice && type !== 'guard' && type !== 'superchat') return;

      const giftItem = {
        ...data,
        totalPrice,
        giftType, // 'gift', 'blindbox', 'guard', 'sc'
        // For SC
        content: data.message || '',
        // For Blindbox
        blindboxName: data.giftName, // The name of the blindbox itself (e.g. "星月盲盒")
        giftName: (giftType === 'blindbox' && data.blindGift) ? data.blindGift.gift_name : data.giftName // The item inside or the gift name
      };
      
      setQueue(prev => [...prev, giftItem]);
    }
  };

  const processQueue = async () => {
    processingRef.current = true;
    const item = queue[0];
    setCurrentGift(item);
    setIsExiting(false);
    
    // Play audio
    if (config.audioEnabled && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.error('Audio play failed (likely autoplay policy):', e);
          });
        }
      } catch (e) {
        console.error('Audio play failed', e);
      }
    }

    const stayDuration = (config.stayDuration || 5) * 1000;
    const animDuration = (config.animationDuration || 1) * 1000;
    
    // Wait for stay duration
    setTimeout(() => {
      // Start exit animation
      setIsExiting(true);
      
      // Wait for exit animation to finish
      setTimeout(() => {
        setCurrentGift(null);
        setIsExiting(false);
        setQueue(prev => prev.slice(1));
        processingRef.current = false;
      }, animDuration);
      
    }, stayDuration);
  };

  // Helper to scale vh values based on globalScale
  const toVh = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0vh';
    const scale = config.globalScale || 1.0;
    return `${(num * scale).toFixed(3)}vh`;
  };

  // Generate Text Shadow
  const generateTextShadow = (strokeWidth, strokeColor, glowIntensity, shadowIntensity) => {
    const layers = [0.33, 0.66, 1];
    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]
    ];
    
    // Convert input value to em (relative to font size)
    // Assuming input 100 = 1em (100% of font size)
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

  const renderMessage = (gift) => {
    let template = config.template;
    
    if (gift.giftType === 'guard') template = config.guardTemplate;
    else if (gift.giftType === 'blindbox') template = config.blindboxTemplate;
    else if (gift.giftType === 'sc') template = config.scTemplate;
    
    const replacements = {
      '{sender}': gift.user.username,
      '{gift}': gift.giftName,
      '{count}': gift.num,
      '{price}': gift.totalPrice ? parseFloat(gift.totalPrice.toFixed(1)) : '0',
      '{blindbox_name}': gift.blindboxName || gift.giftName,
      '{content}': gift.content || ''
    };

    // If no highlighting, just do string replace
    if (!config.highlightKeywords) {
      let text = template;
      for (const [key, value] of Object.entries(replacements)) {
        // Use a global replace for each key
        text = text.split(key).join(value);
      }
      return text;
    }

    // If highlighting, we need to split the string by the placeholders
    // Create a regex that matches any of the keys
    const keys = Object.keys(replacements).map(k => k.replace(/[{}]/g, '\\$&')); // escape { }
    const regex = new RegExp(`(${keys.join('|')})`, 'g');
    
    const parts = template.split(regex);
    
    return parts.map((part, index) => {
      // Check if the part is one of our placeholders
      // We need to find which key it corresponds to
      const key = Object.keys(replacements).find(k => k === part);
      
      if (key) {
        const value = replacements[key];
        // Highlight sender and gift (and blindbox_name)
        if (['{sender}', '{gift}', '{blindbox_name}'].includes(key)) {
           return <span key={index} style={{ color: config.highlightColor }}>{value}</span>;
        }
        return value;
      }
      return part;
    });
  };

  if (!currentGift) return <div className="thank-you-container empty"></div>;

  // Use configured background image as main image if available, otherwise fallback to user avatar
  const mainImage = config.backgroundImg || currentGift.user.face;

  return (
    <div className="thank-you-container">
      <div 
        className={`thank-you-card ${isExiting ? 'animate-out' : 'animate-in'}`} 
        style={{
          '--anim-duration': `${config.animationDuration}s`
        }}
      >
        <img 
          src={mainImage} 
          alt="main" 
          className="user-avatar"
          style={{ 
            width: toVh(config.imageHeight), 
            height: toVh(config.imageHeight),
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain' 
          }}
        />
        <div className="message" style={{
          fontFamily: config.fontFamily,
          color: config.fontColor,
          fontWeight: config.fontWeight,
          fontSize: toVh(config.fontSize),
          textShadow: generateTextShadow(config.strokeWidth, config.strokeColor, config.glowIntensity, config.shadowIntensity),
          width: toVh(config.imageHeight * 2),
          minWidth: toVh(config.imageHeight * 2),
          textAlign: 'center',
          wordWrap: 'break-word',
          whiteSpace: 'normal',
          lineHeight: '1.5',
          marginTop: toVh(config.textSpacing || 0),
          flexShrink: 0,
          
          // Bubble Style
          backgroundImage: config.bubbleEnabled ? `linear-gradient(to top, ${config.bubbleColorStart}, ${config.bubbleColorEnd} 70%)` : 'none',
          padding: config.bubbleEnabled ? `${toVh(config.fontSize * 0.5)} ${toVh(config.fontSize)}` : '0',
          borderRadius: config.bubbleEnabled ? toVh(config.fontSize) : '0',
        }}>
          {renderMessage(currentGift)}
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
