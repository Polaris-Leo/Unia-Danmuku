import express from 'express';
import { generateQRCode, pollQRCode, fetchBuvid } from '../services/bilibiliAuth.js';
import { saveCookies, loadCookies, loadCookiesWithSource, clearCookies } from '../utils/cookieStorage.js';
import { roomManager } from '../services/roomManager.js';

const router = express.Router();

/**
 * 生成登录二维码
 * GET /api/auth/qrcode
 */
router.get('/qrcode', async (req, res) => {
  try {
    const qrData = await generateQRCode();
    res.json({
      success: true,
      data: qrData
    });
  } catch (error) {
    console.error('生成二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成二维码失败',
      error: error.message
    });
  }
});

/**
 * 轮询二维码扫描状态
 * GET /api/auth/qrcode/poll
 */
router.get('/qrcode/poll', async (req, res) => {
  try {
    const { qrcode_key } = req.query;
    
    if (!qrcode_key) {
      return res.status(400).json({
        success: false,
        message: '缺少 qrcode_key 参数'
      });
    }

    const result = await pollQRCode(qrcode_key);
    
    // 如果登录成功，设置cookie
    if (result.data.code === 0 && result.cookies) {
      const cookieObj = {};

      result.cookies.forEach(cookie => {
        cookieObj[cookie.name] = cookie.value;
      });

      // 登录成功后立即获取与账号绑定的 buvid3/buvid4，避免后续连接时被风控
      const buvid = await fetchBuvid(cookieObj);
      if (buvid) {
        cookieObj.buvid3 = buvid.buvid3;
        cookieObj.buvid4 = buvid.buvid4;
      }

      // 设置从B站返回的cookie
      Object.entries(cookieObj).forEach(([name, value]) => {
        res.cookie(name, value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30天
        });
      });

      // 保存Cookie到本地文件
      saveCookies(cookieObj);

      // 登录成功后，触发所有监控房间使用新Cookie重新连接
      setTimeout(() => roomManager.reconnectAll(), 1000);
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('轮询二维码状态失败:', error);
    res.status(500).json({
      success: false,
      message: '轮询二维码状态失败',
      error: error.message
    });
  }
});

/**
 * 获取当前登录状态
 * GET /api/auth/status
 */
router.get('/status', async (req, res) => {
  let hasAuth = false;
  let cookieData = null;
  let cookieSource = null;

  // 一次调用获取管理器 cookie（内部已按 remote → local 优先）
  const { cookies: managedCookies, source: managedSource } = await loadCookiesWithSource();
  const hasRemoteCookie = managedSource === 'remote' && !!managedCookies?.SESSDATA && !!managedCookies?.bili_jct;
  const hasSessionCookie = !!req.cookies.SESSDATA && !!req.cookies.bili_jct;
  const hasLocalCookie = managedSource === 'local' && !!managedCookies?.SESSDATA && !!managedCookies?.bili_jct;

  // 1. 优先：Cookie 管理器（远程）
  if (hasRemoteCookie) {
    hasAuth = true;
    cookieSource = 'remote';
    cookieData = {
      SESSDATA: managedCookies.SESSDATA?.substring(0, 10) + '...',
      bili_jct: managedCookies.bili_jct
    };
  }

  // 2. 回退：session cookie（扫码登录）
  if (!hasAuth && hasSessionCookie) {
    hasAuth = true;
    cookieSource = 'session';
    cookieData = {
      SESSDATA: req.cookies.SESSDATA?.substring(0, 10) + '...',
      bili_jct: req.cookies.bili_jct
    };
  }

  // 3. 回退：本地文件
  if (!hasAuth && hasLocalCookie) {
    hasAuth = true;
    cookieSource = 'local';
    cookieData = {
      SESSDATA: managedCookies.SESSDATA?.substring(0, 10) + '...',
      bili_jct: managedCookies.bili_jct
    };
  }

  res.json({
    success: true,
    authenticated: !!hasAuth,
    isLoggedIn: !!hasAuth,
    cookies: cookieData,
    cookieSource,
    availableSources: {
      remote: hasRemoteCookie,
      session: hasSessionCookie,
      local: hasLocalCookie,
      active: cookieSource
    }
  });
});

/**
 * 手动触发重新连接所有监控房间
 * POST /api/auth/reconnect
 */
router.post('/reconnect', async (req, res) => {
  try {
    await roomManager.reconnectAll();
    res.json({ success: true, message: '已触发重新连接' });
  } catch (error) {
    console.error('重新连接失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 退出登录
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  // 清除所有相关cookie
  const cookiesToClear = ['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5'];
  cookiesToClear.forEach(name => {
    res.clearCookie(name);
  });
  
  // 清除本地保存的Cookie
  clearCookies();

  // 退出后用 Cookie 管理器中的 cookie 重新连接监控房间
  setTimeout(() => roomManager.reconnectAll(), 1000);
  
  res.json({
    success: true,
    message: '已退出登录'
  });
});

export default router;
