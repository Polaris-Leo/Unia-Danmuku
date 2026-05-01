import { BiliLive, getRoomId, getRoomConf } from 'bili-live-listener';
import { loadCookies, getCookieString } from '../utils/cookieStorage.js';

/**
 * 使用 bili-live-listener 库的直播间监听服务
 */
export class BiliLiveService {
  constructor() {
    this.biliLive = null;
    this.roomId = null;
    this.isConnected = false;
    
    // 事件回调
    this.onDanmaku = null;
    this.onGift = null;
    this.onGuard = null;
    this.onWelcome = null;
    this.onSuperChat = null;
    this.onWatched = null;
    this.onRankCount = null;
    this.onLike = null;
    this.onError = null;
    this.onConnect = null;
    this.onClose = null;
  }

  /**
   * 连接直播间
   */
  async connect(roomId) {
    try {
      // 加载 Cookie
      const cookies = await loadCookies();
      if (!cookies) {
        throw new Error('未找到登录信息，请先登录');
      }

      const cookieStr = getCookieString(cookies);
      
      // 获取真实房间号
      console.log(`🔍 获取房间 ${roomId} 的真实房间号...`);
      const { longRoomId } = await getRoomId(roomId);
      this.roomId = longRoomId;
      console.log(`🏠 真实房间号: ${longRoomId}`);
      
      // 获取 key 和 uid
      console.log('🔑 获取直播间认证信息...');
      const { key } = await getRoomConf(longRoomId, cookieStr);
      const uid = cookies.DedeUserID ? parseInt(cookies.DedeUserID) : 0;
      
      if (!key) {
        throw new Error('获取 key 失败，请检查 Cookie 是否有效');
      }
      
      if (!uid) {
        console.warn('⚠️  未找到 DedeUserID，可能导致用户信息脱敏');
      }
      
      console.log(`✅ 认证信息获取成功 - UID: ${uid}`);
      
      // 创建 BiliLive 实例
      this.biliLive = new BiliLive(longRoomId, {
        key,
        uid,
        isBrowser: false
      });
      
      // 注册事件监听器
      this.registerEventListeners();
      
      console.log(`🔌 正在连接直播间 ${longRoomId}...`);
      
    } catch (error) {
      console.error('❌ 连接失败:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  /**
   * 注册事件监听器
   */
  registerEventListeners() {
    // 连接相关事件
    this.biliLive.onOpen(() => {
      console.log('✅ WebSocket 连接已建立');
    });
    
    this.biliLive.onLive(() => {
      console.log('🎉 成功登入房间');
      this.isConnected = true;
      if (this.onConnect) this.onConnect();
    });
    
    this.biliLive.onHeartbeat(() => {
      console.log('💓 心跳包');
    });
    
    this.biliLive.onClose(() => {
      console.log('❌ WebSocket 连接已关闭');
      this.isConnected = false;
      if (this.onClose) this.onClose();
    });
    
    this.biliLive.onError((error) => {
      console.error('❌ 连接错误:', error);
      if (this.onError) this.onError(error);
    });
    
    // 弹幕消息
    this.biliLive.onDanmu(({ data }) => {
      console.log('💬 弹幕:', data.user.uname, '-', data.content);
      
      // 转换为统一格式
      const danmaku = {
        type: 'danmaku',
        user: {
          uid: data.user.uid,
          username: data.user.uname,
          face: data.user.face,
          isAdmin: data.user.isRoomAdmin,
          isVip: false,
          isSvip: false
        },
        content: data.content,
        timestamp: data.timestamp,
        medal: data.user.fansMedal ? {
          level: data.user.fansMedal.level,
          name: data.user.fansMedal.name,
          upName: data.user.fansMedal.anchor.uname,
          roomId: data.user.fansMedal.anchor.roomId
        } : null,
        // 表情信息
        emots: data.emoticon ? {
          [data.emoticon.url]: {
            url: data.emoticon.url,
            width: 60,
            height: 60,
            emoticon_id: data.emoticon.id
          }
        } : null
      };
      
      if (data.emoticon) {
        console.log('🎨 表情包:', data.emoticon.url);
      }
      
      if (this.onDanmaku) this.onDanmaku(danmaku);
    });
    
    // 礼物消息
    this.biliLive.onGift(({ data }) => {
      const gift = {
        type: 'gift',
        user: {
          uid: data.user.uid,
          username: data.user.uname,
          face: data.user.face
        },
        giftName: data.giftName,
        giftId: data.giftId,
        num: data.giftNum,
        price: data.price,
        coinType: data.coinType,
        totalCoin: data.totalCoin,
        timestamp: data.timestamp
      };
      if (this.onGift) this.onGift(gift);
    });
    
    // 上舰消息
    this.biliLive.onGuardBuy(({ data }) => {
      const guard = {
        type: 'guard',
        user: {
          uid: data.user.uid,
          username: data.user.uname
        },
        guardLevel: data.guardLevel,
        num: data.guardNum,
        price: data.price,
        giftName: data.giftName
      };
      if (this.onGuard) this.onGuard(guard);
    });
    
    // SC 醒目留言
    this.biliLive.onSuperChat(({ data }) => {
      const superChat = {
        type: 'super_chat',
        user: {
          uid: data.user.uid,
          username: data.user.uname,
          face: data.user.face
        },
        message: data.message,
        price: data.price,
        timestamp: data.timestamp
      };
      if (this.onSuperChat) this.onSuperChat(superChat);
    });
    
    // 互动消息（进入、关注、分享等）
    this.biliLive.onInteract(({ data }) => {
      // 过滤掉空用户名和脱敏用户名
      if (!data.user.uname || data.user.uname.includes('*')) {
        return;
      }
      
      const welcome = {
        type: 'welcome',
        user: {
          uid: data.user.uid,
          username: data.user.uname
        },
        msgType: data.msgType // 1:进入 2:关注 3:分享
      };
      if (this.onWelcome) this.onWelcome(welcome);
    });
    
    // 看过人数变动
    this.biliLive.onWatchedChange(({ data }) => {
      if (this.onWatched) {
        this.onWatched({ count: data.textLarge });
      }
    });
    
    // 高能榜人数变动
    this.biliLive.onRankCountChange(({ data }) => {
      if (this.onRankCount) {
        this.onRankCount({ count: data.count });
      }
    });
    
    // 点赞数变动
    this.biliLive.onLikeCountChange(({ data }) => {
      if (this.onLike) {
        this.onLike({ count: data.likeCount });
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.biliLive) {
      this.biliLive.close();
      this.biliLive = null;
      this.isConnected = false;
      console.log('👋 已断开连接');
    }
  }
}
