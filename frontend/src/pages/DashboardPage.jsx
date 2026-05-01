import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthStatus, logout } from '../services/api';
import './DashboardPage.css';

function DashboardPage() {
  const navigate = useNavigate();
  const [authInfo, setAuthInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState(localStorage.getItem('lastRoomId') || '');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await getAuthStatus();
      if (result.success && result.isLoggedIn) {
        setAuthInfo(result);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAuthInfo(null);
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const handleEnterConsole = () => {
    if (!roomId.trim()) {
      alert('请输入直播间号');
      return;
    }
    localStorage.setItem('lastRoomId', roomId);
    navigate(`/danmaku?roomId=${roomId}`);
  };

  const handleRoomAction = (path) => {
    if (!roomId.trim()) {
      alert('请先在上方输入直播间号');
      return;
    }
    localStorage.setItem('lastRoomId', roomId);
    navigate(`${path}?roomId=${roomId}`);
  };

  if (loading) {
    return (
      <div className="db-page">
        <div className="db-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="db-page">
      {/* 顶部导航栏 */}
      <header className="db-navbar">
        <div className="db-navbar__brand">
          <span className="db-navbar__logo">🎥</span>
          <span className="db-navbar__title">Unia 弹幕系统</span>
        </div>
        <div className="db-navbar__auth">
          {authInfo ? (
            <>
              <span className="db-badge db-badge--green">• 已登录</span>
              <button className="db-nav-btn db-nav-btn--ghost" onClick={handleLogout}>退出登录</button>
            </>
          ) : (
            <>
              <span className="db-badge db-badge--yellow">• 未登录</span>
              <button className="db-nav-btn db-nav-btn--primary" onClick={() => navigate('/login')}>🔐 扫码登录</button>
            </>
          )}
        </div>
      </header>

      <main className="db-main">
        {/* Hero 区域 */}
        <section className="db-hero">
          <h2 className="db-hero__title">将直播间号输入即可开始</h2>
          <p className="db-hero__sub">支持弹幕、礼物、舰长监控及多种 OBS 覆盖层</p>
          <div className="db-hero__input-row">
            <input
              type="text"
              className="db-room-input"
              placeholder="输入 B 站直播间号..."
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEnterConsole()}
            />
            <button className="db-hero__enter-btn" onClick={handleEnterConsole}>
              进入控制台 →
            </button>
          </div>
        </section>

        {/* 功能卡片网格 */}
        <section className="db-grid">

          <div className="db-card db-card--accent" onClick={() => navigate('/monitor')}>
            <div className="db-card__icon">📡</div>
            <div className="db-card__body">
              <h4>后台监控</h4>
              <p>添加常驻监控的直播间，后台持续接收弹幕数据</p>
            </div>
            <span className="db-card__arrow">›</span>
          </div>

          <div className="db-card" onClick={() => handleRoomAction('/captains')}>
            <div className="db-card__icon">🛥️</div>
            <div className="db-card__body">
              <h4>舰长信息</h4>
              <p>查看当前直播间的舰长列表与记录</p>
            </div>
            <span className="db-card__arrow">›</span>
          </div>

          <div className="db-card" onClick={() => navigate('/obs-settings')}>
            <div className="db-card__icon">⚙️</div>
            <div className="db-card__body">
              <h4>OBS 样式设置</h4>
              <p>自定义弹幕覆盖层字体、颜色、布局样式</p>
            </div>
            <span className="db-card__arrow">›</span>
          </div>

          <div className="db-card" onClick={() => navigate('/clock-settings')}>
            <div className="db-card__icon">⏰</div>
            <div className="db-card__body">
              <h4>时钟设置</h4>
              <p>配置直播时钟外观与显示格式</p>
            </div>
            <span className="db-card__arrow">›</span>
          </div>

          <div className="db-card" onClick={() => navigate('/thankyou-settings')}>
            <div className="db-card__icon">🎁</div>
            <div className="db-card__body">
              <h4>答谢姬设置</h4>
              <p>配置礼物/上舰自动答谢内容与样式</p>
            </div>
            <span className="db-card__arrow">›</span>
          </div>

        </section>

        {!authInfo && (
          <div className="db-hint">
            ⚠️ 未检测到登录信息。Cookie 可由外部管理工具提供，或点击右上角“扫码登录”手动登录。
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
