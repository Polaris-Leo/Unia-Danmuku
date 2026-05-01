import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMonitoredRooms, addMonitoredRoom, removeMonitoredRoom, pauseMonitoredRoom, resumeMonitoredRoom } from '../services/api';
import './MonitorPage.css';

const MonitorPage = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoomId, setNewRoomId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await getMonitoredRooms();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomId) return;

    try {
      setAdding(true);
      const data = await addMonitoredRoom(newRoomId);
      if (data.success) {
        setNewRoomId('');
        fetchRooms();
      } else {
        alert(data.message || '添加失败');
      }
    } catch (error) {
      console.error('Failed to add room:', error);
      alert('添加失败，请检查网络或房间号');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRoom = async (roomId) => {
    if (!window.confirm(`确定要取消监控房间 ${roomId} 吗？`)) return;
    try {
      const data = await removeMonitoredRoom(roomId);
      if (data.success) fetchRooms();
      else alert(data.message || '移除失败');
    } catch (error) {
      alert('移除失败');
    }
  };

  const handleTogglePause = async (room) => {
    try {
      if (room.paused) await resumeMonitoredRoom(room.roomId);
      else await pauseMonitoredRoom(room.roomId);
      fetchRooms();
    } catch (error) {
      alert('操作失败');
    }
  };

  return (
    <div className="mn-page">
      {/* 顶部导航栏 */}
      <header className="db-navbar">
        <div className="db-navbar__brand">
          <button className="mn-back-btn" onClick={() => navigate('/')}>←</button>
          <span className="db-navbar__logo">📡</span>
          <span className="db-navbar__title">后台监控配置</span>
        </div>
      </header>

      <main className="mn-main">
        {/* 添加区域 */}
        <section className="mn-add-section">
          <h3 className="mn-section-title">添加监控直播间</h3>
          <form className="mn-add-form" onSubmit={handleAddRoom}>
            <input
              type="text"
              className="db-room-input"
              placeholder="输入 B 站直播间房间号..."
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              disabled={adding}
            />
            <button type="submit" className="mn-add-btn" disabled={adding || !newRoomId}>
              {adding ? '添加中...' : '+ 添加监控'}
            </button>
          </form>
          <p className="mn-add-hint">添加后，系统将在后台持续接收该直播间的弹幕数据，无需保持页面打开。</p>
        </section>

        {/* 房间列表 */}
        <section>
          <div className="mn-list-header">
            <h3 className="mn-section-title" style={{ margin: 0 }}>
              监控列表
              <span className="mn-count">{rooms.length}</span>
            </h3>
            <button className="mn-refresh-btn" onClick={fetchRooms}>刷新</button>
          </div>

          {loading ? (
            <div className="mn-empty">加载中...</div>
          ) : rooms.length === 0 ? (
            <div className="mn-empty">暂无监控的直播间，请在上方添加</div>
          ) : (
            <div className="mn-grid">
              {rooms.map((room) => (
                <div key={room.roomId} className={`mn-card ${room.paused ? 'mn-card--paused' : ''}`}>
                  <div className="mn-card__header">
                    <div className="mn-card__avatar-wrap">
                      {room.face
                        ? <img src={room.face} alt={room.uname} className="mn-card__avatar" />
                        : <div className="mn-card__avatar mn-card__avatar--placeholder">📺</div>
                      }
                      <span className={`mn-dot ${room.liveStatus === 1 ? 'mn-dot--live' : 'mn-dot--off'}`} />
                    </div>
                    <div className="mn-card__info">
                      <span className="mn-card__uname">{room.uname || '获取中...'}</span>
                      <span className="mn-card__roomid">房间号 {room.roomId}</span>
                    </div>
                    <span className={`mn-live-badge ${room.liveStatus === 1 ? 'mn-live-badge--on' : 'mn-live-badge--off'}`}>
                      {room.liveStatus === 1 ? '直播中' : '未开播'}
                    </span>
                  </div>

                  <div className="mn-card__status">
                    <span className={`mn-status-dot ${room.paused ? 'paused' : room.connected ? 'active' : 'connecting'}`} />
                    {room.paused ? '已暂停' : room.connected ? '监控中' : '连接中...'}
                  </div>

                  <div className="mn-card__actions">
                    <button
                      className={`mn-btn ${room.paused ? 'mn-btn--resume' : 'mn-btn--pause'}`}
                      onClick={() => handleTogglePause(room)}
                    >
                      {room.paused ? '▶ 恢复' : '⏸ 暂停'}
                    </button>
                    <button
                      className="mn-btn mn-btn--view"
                      onClick={() => navigate(`/danmaku?roomId=${room.roomId}`)}
                    >
                      进入控制台
                    </button>
                    <button
                      className="mn-btn mn-btn--remove"
                      onClick={() => handleRemoveRoom(room.roomId)}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MonitorPage;
