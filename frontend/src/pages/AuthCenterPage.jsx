import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthStatus, logout, reconnectAuth } from '../services/api';
import './AuthCenterPage.css';

const SOURCE_LABELS = {
  remote: 'BiliCookie 系统',
  session: '扫码登录',
  local: '本地 Cookie'
};

function AuthCenterPage() {
  const navigate = useNavigate();
  const [authInfo, setAuthInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const fetchAuthStatus = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const result = await getAuthStatus();
      if (result.success && result.isLoggedIn) {
        setAuthInfo(result);
      } else {
        setAuthInfo(null);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setAuthInfo(null);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      await fetchAuthStatus(true);
    } catch (error) {
      console.error('退出登录失败:', error);
      alert('退出登录失败');
    }
  };

  const handleReconnect = async () => {
    try {
      setReconnecting(true);
      const result = await reconnectAuth();
      if (!result.success) {
        alert(result.message || '重新连接失败');
        return;
      }
      await fetchAuthStatus(true);
    } catch (error) {
      console.error('重新连接失败:', error);
      alert('重新连接失败');
    } finally {
      setReconnecting(false);
    }
  };

  const sourceLabel = authInfo?.cookieSource ? SOURCE_LABELS[authInfo.cookieSource] || authInfo.cookieSource : '未检测到';
  const hasSessionCookie = !!authInfo?.availableSources?.session;
  const isSessionActive = authInfo?.cookieSource === 'session';
  const hasRemoteCookie = !!authInfo?.availableSources?.remote;
  const sessionCookiePreview = authInfo?.sourceDetails?.session?.SESSDATA || '未获取';
  const remoteCookiePreview = authInfo?.sourceDetails?.remote?.SESSDATA || '未获取';

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <div className="auth-navbar__brand">
          <button className="auth-back-btn" onClick={() => navigate('/dashboard')}>←</button>
          <span className="auth-navbar__title">登录信息</span>
        </div>
        <button className="auth-refresh-btn" onClick={() => fetchAuthStatus(true)} disabled={refreshing || loading}>
          {refreshing ? '刷新中...' : '刷新状态'}
        </button>
      </header>

      <main className="auth-main">
        <section className="auth-panel auth-panel--hero">
          <span className={`auth-status-pill ${authInfo ? 'auth-status-pill--on' : 'auth-status-pill--off'}`}>
            {authInfo ? '已登录' : '未登录'}
          </span>
          <h1 className="auth-title">账号与 Cookie 状态</h1>
          <p className="auth-subtitle">查看当前来源、切换登录方式，或在来源变更后触发监控重连。</p>
        </section>

        {loading ? (
          <section className="auth-panel auth-panel--empty">加载中...</section>
        ) : (
          <>
            <section className="auth-grid">
              <article className="auth-panel">
                <div className="auth-section-head">
                  <h2 className="auth-section-title">扫码登录</h2>
                  <span className={`auth-inline-pill ${hasSessionCookie ? 'auth-inline-pill--active' : ''}`}>
                    {isSessionActive ? '当前生效' : hasSessionCookie ? '已扫码' : '未扫码'}
                  </span>
                </div>
                <p className="auth-section-copy">
                  用于手动登录一个浏览器会话 Cookie。适合临时接管，或在 BiliCookie 系统不可用时作为回退方式。
                </p>
                <div className="auth-metric-list">
                  <div className="auth-metric">
                    <span className="auth-metric__label">当前状态</span>
                    <strong className="auth-metric__value">
                      {isSessionActive
                        ? '正在使用扫码登录 Cookie'
                        : hasSessionCookie
                          ? '扫码登录 Cookie 已存在，但当前优先使用其他来源'
                          : '当前没有扫码登录 Cookie'}
                    </strong>
                  </div>
                  <div className="auth-metric">
                    <span className="auth-metric__label">适用场景</span>
                    <strong className="auth-metric__value">
                      {hasRemoteCookie
                        ? '当前有 BiliCookie 可用，扫码登录会作为备用回退'
                        : '需要立即手动登录或远程 Cookie 暂不可用时'}
                    </strong>
                  </div>
                  <div className="auth-metric">
                    <span className="auth-metric__label">扫码 SESSDATA</span>
                    <strong className="auth-metric__value auth-metric__value--mono">{sessionCookiePreview}</strong>
                  </div>
                </div>
                <div className="auth-actions auth-actions--section">
                  <button className="auth-btn auth-btn--primary" onClick={() => navigate('/login', { state: { from: '/auth-center' } })}>
                    前往扫码登录
                  </button>
                  <button className="auth-btn auth-btn--ghost" onClick={handleLogout} disabled={!authInfo}>
                    退出当前登录
                  </button>
                </div>
              </article>

              <article className="auth-panel">
                <div className="auth-section-head">
                  <h2 className="auth-section-title">BiliCookie</h2>
                  <span className={`auth-inline-pill ${hasRemoteCookie ? 'auth-inline-pill--active' : ''}`}>
                    {authInfo?.cookieSource === 'remote' ? '当前生效' : hasRemoteCookie ? '已接入' : '未接入'}
                  </span>
                </div>
                <p className="auth-section-copy">
                  系统默认优先使用 BiliCookie 提供的远程 Cookie。只要管理器内有可用账号，监控和首页状态都应直接恢复。
                </p>
                <div className="auth-metric-list">
                  <div className="auth-metric">
                    <span className="auth-metric__label">当前状态</span>
                    <strong className="auth-metric__value">
                      {authInfo?.cookieSource === 'remote'
                        ? '正在使用 BiliCookie 提供的远程 Cookie'
                        : hasRemoteCookie
                          ? 'BiliCookie 已可用，但当前未作为生效来源'
                          : '当前未检测到 BiliCookie 可用 Cookie'}
                    </strong>
                  </div>
                  <div className="auth-metric">
                    <span className="auth-metric__label">BiliCookie SESSDATA</span>
                    <strong className="auth-metric__value auth-metric__value--mono">{remoteCookiePreview}</strong>
                  </div>
                </div>
                <ul className="auth-source-list">
                  <li>优先使用 BiliCookie 系统提供的远程 Cookie。</li>
                  <li>远程不可用时，回退到扫码登录会话 Cookie。</li>
                  <li>两者都不可用时，最后回退到本地保存的 Cookie。</li>
                </ul>
                <div className="auth-actions auth-actions--section">
                  <button className="auth-btn auth-btn--secondary" onClick={handleReconnect} disabled={reconnecting}>
                    {reconnecting ? '重连中...' : '重新连接监控'}
                  </button>
                  <button className="auth-btn auth-btn--secondary" onClick={() => fetchAuthStatus(true)} disabled={refreshing}>
                    {refreshing ? '刷新中...' : '刷新 BiliCookie 状态'}
                  </button>
                </div>
              </article>
            </section>

            <section className="auth-panel">
              <h2 className="auth-section-title">状态说明</h2>
              <p className="auth-help-text auth-help-text--standalone">
                只要任一来源存在可用 Cookie，首页就会显示“登录状态正常”。如果 BiliCookie 系统已经有有效账号，但当前仍未恢复，可先点击“刷新 BiliCookie 状态”，再执行“重新连接监控”。
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AuthCenterPage;
