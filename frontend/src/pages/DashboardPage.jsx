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
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const handleEnterConsole = () => {
    if (!roomId) {
      alert('请输入直播间号');
      return;
    }
    localStorage.setItem('lastRoomId', roomId);
    navigate(`/danmaku?roomId=${roomId}`);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h1>🎉 登录成功！</h1>
          <p>欢迎使用 Unia 弹幕系统</p>
        </div>

        <div className="dashboard-content">
          {/* 快速启动区域 */}
          <div className="quick-start-section">
            <h3>🚀 快速启动</h3>
            <div className="input-group">
              <input
                type="text"
                className="room-input"
                placeholder="输入直播间号"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEnterConsole()}
              />
            </div>
            <div className="button-group">
              <button className="action-btn primary" onClick={handleEnterConsole}>
                📺 进入控制台
              </button>
              <button className="action-btn outline" onClick={() => navigate('/monitor')}>
                📡 后台监控配置
              </button>
            </div>
          </div>

          <div className="info-section">
            <h3>✅ 登录状态</h3>
            <div className="info-item">
              <span className="label">状态：</span>
              <span className="value success">已登录</span>
            </div>
            {authInfo?.cookies && (
              <>
                <div className="info-item">
                  <span className="label">SESSDATA：</span>
                  <span className="value">{authInfo.cookies.SESSDATA}</span>
                </div>
              </>
            )}
          </div>

          <div className="features-section">
            <h3>📋 其他功能</h3>
            <ul className="feature-list">
              <li onClick={() => navigate('/obs-settings')} style={{cursor: 'pointer'}}>
                ⚙️ OBS样式设置 →
              </li>
              <li onClick={() => navigate('/clock-settings')} style={{cursor: 'pointer'}}>
                ⏰ 时钟设置 →
              </li>
              <li onClick={() => navigate('/thankyou-settings')} style={{cursor: 'pointer'}}>
                🎁 答谢姬设置 →
              </li>
            </ul>
          </div>

          <div className="actions">
            <button onClick={handleLogout} className="logout-btn">
              🚪 退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
