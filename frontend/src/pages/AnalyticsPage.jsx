import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  getHistorySessions,
  getMonitoredRooms,
  getSessionAnalyticsSummary,
  getSessionMetrics
} from '../services/api';
import './AnalyticsPage.css';

const METRICS = [
  { key: 'guardCount', label: '大航海', color: '#2367d1', format: formatNumber },
  { key: 'fansCount', label: '粉丝团', color: '#12866b', format: formatNumber },
  { key: 'rankCount', label: '高能榜', color: '#b84b08', format: formatNumber },
  { key: 'watchedCount', label: '看过人数', color: '#7a47b8', format: formatNumber },
  { key: 'durationSec', label: '直播时长', color: '#8f4a1f', format: formatDuration }
];

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? new Intl.NumberFormat('zh-CN').format(Number(value)) : '暂无数据';
}

function formatDuration(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
}

function formatSession(sessionId) {
  const date = new Date(Number(sessionId) * 1000);
  return Number.isNaN(date.getTime()) ? String(sessionId) : date.toLocaleString('zh-CN', { hour12: false });
}

function formatTime(ts) {
  const date = new Date(Number(ts) * 1000);
  return Number.isNaN(date.getTime()) ? '--:--' : date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
}

function MetricTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="analytics-tooltip">
      <strong>{formatTime(label)}</strong>
      <span>{formatter(payload[0].value)}</span>
    </div>
  );
}

function MetricChart({ metric, points, summary }) {
  const format = metric.format || formatNumber;
  const metricSummary = summary?.[metric.key === 'fansCount' ? summary.fansMetric : metric.key] || {};
  const hasData = points.some((point) => Number.isFinite(Number(point[metric.key])));

  return (
    <section className="analytics-chart-card">
      <header className="analytics-chart-card__header">
        <div>
          <h2>{metric.label}</h2>
          <p>当前 {format(metricSummary.end)}</p>
        </div>
        <span className="analytics-delta">
          变化 {metricSummary.delta === null || metricSummary.delta === undefined
            ? '暂无数据'
            : `${metricSummary.delta > 0 ? '+' : ''}${format(metricSummary.delta)}`}
        </span>
      </header>
      {hasData ? (
        <div className="analytics-chart">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={points} syncId="session-analytics" margin={{ top: 12, right: 18, left: 6, bottom: 4 }}>
              <CartesianGrid stroke="#e4e8ee" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="ts"
                tickFormatter={formatTime}
                stroke="#8290a3"
                tick={{ fill: '#687589', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                minTickGap={36}
              />
              <YAxis
                tickFormatter={format}
                stroke="#8290a3"
                tick={{ fill: '#687589', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={66}
              />
              <Tooltip content={<MetricTooltip formatter={format} />} cursor={{ stroke: '#9ba7b8', strokeDasharray: '3 3' }} />
              <Line
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={metric.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="analytics-chart-empty">此场次没有可用的{metric.label}采样数据。</div>
      )}
    </section>
  );
}

function AnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId') || '';
  const [sessions, setSessions] = useState([]);
  const [liveRoom, setLiveRoom] = useState(null);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectionMode, setSelectionMode] = useState('auto-live');
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
  const sessionDropdownRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const [points, setPoints] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState('');
  const activeLiveSessionId = liveRoom?.liveStatus === 1 && liveRoom?.currentSessionId
    ? String(liveRoom.currentSessionId)
    : '';
  const isSelectedSessionLive = Boolean(activeLiveSessionId && selectedSession === activeLiveSessionId);
  const sessionOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    if (activeLiveSessionId) {
      options.push({ id: activeLiveSessionId, isLive: true });
      seen.add(activeLiveSessionId);
    }

    sessions.forEach((sessionId) => {
      const id = String(sessionId);
      if (!seen.has(id)) {
        seen.add(id);
        options.push({ id, isLive: false });
      }
    });

    return options;
  }, [activeLiveSessionId, sessions]);

  const refreshSessionMetadata = useCallback(async () => {
    if (!roomId) return null;

    const [historyResponse, monitoredResponse] = await Promise.all([
      getHistorySessions(roomId),
      getMonitoredRooms()
    ]);
    const nextSessions = historyResponse.sessions || [];
    const nextLiveRoom = (monitoredResponse.rooms || []).find((room) => String(room.roomId) === String(roomId)) || null;

    setSessions(nextSessions);
    setLiveRoom(nextLiveRoom);
    return nextLiveRoom;
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      setLoadingSessions(false);
      return;
    }

    let cancelled = false;

    const loadSessions = async () => {
      setLoadingSessions(true);
      setError('');
      try {
        const nextLiveRoom = await refreshSessionMetadata();
        if (cancelled) return;

        const nextLiveSessionId = nextLiveRoom?.liveStatus === 1 && nextLiveRoom?.currentSessionId
          ? String(nextLiveRoom.currentSessionId)
          : '';
        setSelectedSession(nextLiveSessionId || '');
        setSelectionMode('auto-live');
      } catch (loadError) {
        if (!cancelled) {
          console.error('加载直播场次失败:', loadError);
          setError('无法加载该直播间的历史场次。');
        }
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    };

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [roomId, refreshSessionMetadata]);

  useEffect(() => {
    if (!selectedSession && sessionOptions[0]) {
      setSelectedSession(sessionOptions[0].id);
    }
  }, [selectedSession, sessionOptions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sessionDropdownRef.current && !sessionDropdownRef.current.contains(event.target)) {
        setIsSessionDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsSessionDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const loadAnalytics = useCallback(async ({ preserveDataOnError = false } = {}) => {
    if (!roomId || !selectedSession) return;

    setLoadingAnalytics(true);
    setError('');
    try {
      const [metricsResponse, summaryResponse] = await Promise.all([
        getSessionMetrics(roomId, selectedSession),
        getSessionAnalyticsSummary(roomId, selectedSession)
      ]);
      const fansMetric = metricsResponse.data?.fansMetric || 'followerCount';
      const nextPoints = (metricsResponse.data?.points || []).map((point) => ({
        ...point,
        fansCount: point[fansMetric]
      }));
      setPoints(nextPoints);
      setSummary({
        ...(summaryResponse.data || {}),
        fansMetric
      });
    } catch (loadError) {
      console.error('加载直播分析失败:', loadError);
      setError('无法加载该场直播的分析数据。');
      if (!preserveDataOnError) {
        setPoints([]);
        setSummary(null);
      }
    } finally {
      setLoadingAnalytics(false);
    }
  }, [roomId, selectedSession]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!roomId || !isSelectedSessionLive) return undefined;

    const refreshLiveAnalytics = async () => {
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;

      try {
        const nextLiveRoom = await refreshSessionMetadata();
        const nextLiveSessionId = nextLiveRoom?.liveStatus === 1 && nextLiveRoom?.currentSessionId
          ? String(nextLiveRoom.currentSessionId)
          : '';

        if (selectionMode === 'auto-live' && nextLiveSessionId && nextLiveSessionId !== selectedSession) {
          setSelectedSession(nextLiveSessionId);
          return;
        }

        if (nextLiveSessionId === selectedSession) {
          await loadAnalytics({ preserveDataOnError: true });
        }
      } catch (refreshError) {
        console.error('刷新实时直播分析失败:', refreshError);
        setError('实时分析刷新失败，将在下个采样周期重试。');
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(refreshLiveAnalytics, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [isSelectedSessionLive, loadAnalytics, refreshSessionMetadata, roomId, selectedSession, selectionMode]);

  const handleSessionSelect = (sessionId) => {
    setSelectedSession(sessionId);
    setSelectionMode(sessionId === activeLiveSessionId ? 'auto-live' : 'manual');
    setIsSessionDropdownOpen(false);
  };

  const fansLabel = summary?.fansMetric === 'fansClubCount' ? '粉丝团' : '粉丝';
  const displayMetrics = useMemo(() => METRICS.map((metric) => (
    metric.key === 'fansCount' ? { ...metric, label: fansLabel } : metric
  )), [fansLabel]);

  if (!roomId) {
    return (
      <main className="analytics-page analytics-page--message">
        <h1>未选择直播间</h1>
        <p>请从控制台首页输入直播间号后进入直播分析。</p>
        <button onClick={() => navigate('/dashboard')}>返回首页</button>
      </main>
    );
  }

  return (
    <main className="analytics-page">
      <header className="analytics-header">
        <div>
          <button className="analytics-back" onClick={() => navigate('/dashboard')}>← 返回首页</button>
          <p className="analytics-eyebrow">直播场次分析</p>
          <h1>直播间 {roomId}</h1>
          <p className="analytics-description">按场次回看房间指标变化；数据从功能启用后的直播开始采样。</p>
        </div>
        <div className="analytics-session-select">
          <span>直播场次</span>
          <div className="custom-select-container" ref={sessionDropdownRef}>
            <button
              type="button"
              className={`custom-select-trigger ${isSessionDropdownOpen ? 'active' : ''}`}
              onClick={() => setIsSessionDropdownOpen((open) => !open)}
              disabled={loadingSessions || !sessionOptions.length}
              aria-haspopup="listbox"
              aria-expanded={isSessionDropdownOpen}
              aria-controls="analytics-session-options"
            >
              <span className="analytics-session-trigger-label">
                {selectedSession ? formatSession(selectedSession) : '请选择直播场次'}
                {isSelectedSessionLive ? <em>进行中</em> : null}
              </span>
              <svg className="custom-select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isSessionDropdownOpen ? (
              <div className="custom-select-options" id="analytics-session-options" role="listbox" aria-label="直播场次">
                {sessionOptions.map((session) => (
                  <button
                    type="button"
                    key={session.id}
                    role="option"
                    aria-selected={selectedSession === session.id}
                    className={`custom-select-option ${selectedSession === session.id ? 'selected' : ''}`}
                    onClick={() => handleSessionSelect(session.id)}
                  >
                    <span>{formatSession(session.id)}</span>
                    {session.isLive ? <em>进行中</em> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {loadingSessions || loadingAnalytics ? <div className="analytics-state">正在加载分析数据...</div> : null}
      {error ? <div className="analytics-state analytics-state--error">{error}</div> : null}
      {!loadingSessions && !error && sessions.length === 0 ? (
        <div className="analytics-state">该直播间还没有可分析的历史场次。</div>
      ) : null}
      {!loadingAnalytics && !error && selectedSession && points.length === 0 ? (
        <div className="analytics-state">该场次在指标采样功能上线前结束，暂无可用的趋势数据。</div>
      ) : null}

      {points.length > 0 ? (
        <>
          <section className="analytics-summary-grid">
            {displayMetrics.map((metric) => {
              const format = metric.format || formatNumber;
              const metricKey = metric.key === 'fansCount' ? summary?.fansMetric : metric.key;
              const data = summary?.[metricKey] || {};
              return (
                <article className="analytics-summary-card" key={metric.key}>
                  <span>{metric.label}</span>
                  <strong>{format(data.end)}</strong>
                  <small>起始 {format(data.start)} · 峰值 {format(data.max)}</small>
                </article>
              );
            })}
          </section>

          <section className="analytics-charts" aria-label="直播指标趋势图">
            {displayMetrics.map((metric) => <MetricChart key={metric.key} metric={metric} points={points} summary={summary} />)}
          </section>
        </>
      ) : null}
    </main>
  );
}

export default AnalyticsPage;
