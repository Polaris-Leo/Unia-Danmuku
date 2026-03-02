import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getCaptains, getCaptainStats, importCaptainHistory, getMonitoredRooms, getHistorySessions } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import XLSX from 'xlsx-js-style';
import './CaptainPage.css';

const CaptainPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const roomId = searchParams.get('roomId');
    
    const [captains, setCaptains] = useState([]);
    const [stats, setStats] = useState({ totalRecords: 0, uniqueCaptains: 0 });
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [streamerInfo, setStreamerInfo] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
    const sessionDropdownRef = useRef(null);
    
    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (sessionDropdownRef.current && !sessionDropdownRef.current.contains(event.target)) {
                setIsSessionDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const [filters, setFilters] = useState({
        username: '',
        uid: '',
        levels: [], 
        startDate: '',
        endDate: '',
        sessionId: '', // Add sessionId filter
        page: 1,
        limit: 20,
    });
    const [totalItems, setTotalItems] = useState(0);

    const EXPORT_COLUMNS = [
        { key: 'index', label: '序号', width: 8 },
        { key: 'source_stream_id', label: '直播场次', width: 22 },
        { key: 'timestamp', label: '时间', width: 22 },
        { key: 'uid', label: 'UID', width: 15 },
        { key: 'username', label: '用户名', width: 20 },
        { key: 'guard_level', label: '大航海等级', width: 12 },
        { key: 'num', label: '数量', width: 10 }
    ];

    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState(EXPORT_COLUMNS.map(c => c.key));

    // Filter sessions based on date range
    const filteredSessions = sessions.filter(sid => {
        const sessionTime = parseInt(sid) * 1000;
        
        let start = null;
        let end = null;

        if (filters.startDate) {
            // Treat input as local time YYYY-MM-DD 00:00:00
            start = new Date(filters.startDate + 'T00:00:00').getTime();
            // Fallback if Date parsing fails (e.g. old browser), though unlikely for standard input
            if (isNaN(start)) start = new Date(filters.startDate).getTime(); 
        }

        if (filters.endDate) {
            // Treat input as local time YYYY-MM-DD 23:59:59
            end = new Date(filters.endDate + 'T23:59:59.999').getTime();
            if (isNaN(end)) end = new Date(filters.endDate).getTime() + 86400000 - 1;
        }

        if (start && sessionTime < start) return false;
        if (end && sessionTime > end) return false;

        return true;
    });

    const levels = {
        1: { name: '总督', className: 'level-1' },
        2: { name: '提督', className: 'level-2' },
        3: { name: '舰长', className: 'level-3' },
    };

    /**
     * Parse date input to timestamp
     */
    const toTimestamp = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).getTime();
    };

    useEffect(() => {
        const fetchStreamerInfo = async () => {
            if (!roomId) return;
            try {
                // Fetch room info for header
                const res = await getMonitoredRooms();
                if (res.rooms && Array.isArray(res.rooms)) {
                    const info = res.rooms.find(r => String(r.roomId) === String(roomId));
                    if (info) setStreamerInfo(info);
                }
                
                // Fetch available sessions for filter
                const historyRes = await getHistorySessions(roomId);
                if (historyRes.success && Array.isArray(historyRes.sessions)) {
                    // Sort nearest first
                    setSessions(historyRes.sessions.sort((a,b) => b - a));
                }
            } catch (err) {
                console.error("Failed to load streamer info or sessions:", err);
            }
        };
        fetchStreamerInfo();
    }, [roomId]);

    const fetchStats = async () => {
        try {
            const res = await getCaptainStats(roomId);
            if (res.success) setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [roomId]); // Refresh stats when room changes

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                username: filters.username,
                uid: filters.uid,
                levels: filters.levels.join(','), // Send as CSV
                startDate: toTimestamp(filters.startDate),
                endDate: filters.endDate ? toTimestamp(filters.endDate) + 86400000 - 1 : null, 
                source_stream_id: filters.sessionId,
                page: filters.page,
                limit: filters.limit,
                room_id: roomId // Use from URL
            };
            const res = await getCaptains(params);
            if (res.success) {
                setCaptains(res.data.items);
                setTotalItems(res.data.total);
            }
        } catch (error) {
            console.error('Failed to fetch captains:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, roomId]); // Depend on roomId

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        // Fetch when page/limit/levels/sessionId changes including mount
        fetchData();
    }, [filters.page, filters.limit, filters.levels, filters.sessionId, roomId]);

    const handleSearch = (e) => {
        e.preventDefault();
        setFilters(prev => ({ ...prev, page: 1 }));
        fetchData();
    };

    const handleReset = () => {
        setFilters({
            username: '',
            uid: '',
            levels: [],
            sessionId: '',
            startDate: '',
            endDate: '',
            page: 1,
            limit: 20
        });
        setTimeout(fetchData, 0); // Re-fetch
    };

    const handleLevelToggle = (level) => {
        setFilters(prev => {
            const current = new Set(prev.levels);
            if (current.has(level)) {
                current.delete(level);
            } else {
                current.add(level);
            }
            return { ...prev, levels: Array.from(current) };
        });
    };


    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= Math.ceil(totalItems / filters.limit)) {
            setFilters(prev => ({ ...prev, page: newPage }));
            setTimeout(fetchData, 0);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleImport = async () => {
        // Simple confirmation with clearer options
        const mode = window.confirm(
            '【导入模式选择】\n\n' +
            '点击「确定」：增量导入（仅添加新数据，速度快，不影响现有标签）\n' +
            '点击「取消」：强制覆盖导入（清除并重建所有数据，用于修复“缺失直播场次”等问题）'
        );
        
        if (mode) {
             // Incremental
             doImport(false);
        } else {
             // Force re-import
             if (window.confirm('警告：强制重导会清除当前的舰长列表并从历史日志重新生成。\n\n确定要继续吗？')) {
                 doImport(true);
             }
        }
    };

    const doImport = async (force) => {
        setImporting(true);
        try {
            const res = await importCaptainHistory(force);
            if (res.success) {
                if (force) {
                     alert(`数据已重置并重新导入！共导入 ${res.data.added} 条记录。`);
                } else {
                     alert(`增量导入完成！新增 ${res.data.added} 条记录，跳过 ${res.data.skipped} 条。`);
                }
                fetchData();
                fetchStats();
            } else {
                alert('导入失败');
            }
        } catch (error) {
            console.error('Import failed:', error);
            alert('导入过程中发生错误');
        } finally {
            setImporting(false);
        }
    };

    const handleExport = () => {
        if (!captains.length) return alert('当前没有数据可导出');
        setShowExportModal(true);
    }

    const confirmExport = async () => {
        setExporting(true);
        setShowExportModal(false);

        try {
            // Re-fetch all matching data
            const res = await getCaptains({
                username: filters.username,
                uid: filters.uid,
                levels: filters.levels || [],
                startDate: filters.startDate ? toTimestamp(filters.startDate) : null,
                endDate: filters.endDate ? toTimestamp(filters.endDate) + 86400000 - 1 : null,
                room_id: roomId,
                source_stream_id: filters.sessionId,
                page: 1,
                limit: 100000 // Large limit to get all
            });

            if (!res || !res.success || !res.data || !res.data.items) {
                alert('导出失败: 获取数据失败');
                return;
            }

            const items = res.data.items;

            // Define column map for data extraction
            const columnMap = {
                'index': (item, index) => index + 1,
                'source_stream_id': (item) => item.source_stream_id ? formatDate(parseInt(item.source_stream_id) * 1000) : '-',
                'timestamp': (item) => formatDate(item.timestamp),
                'uid': (item) => item.uid,
                'username': (item) => item.username,
                'guard_level': (item) => levels[item.guard_level]?.name || '未知',
                'num': (item) => item.num ? `${item.num}个月` : '-'
            };

            // Filter active columns
            const activeCols = EXPORT_COLUMNS.filter(col => selectedColumns.includes(col.key));
            
            // Prepare headers
            const headers = activeCols.map(col => col.label);
            
            // Prepare data rows
            const excelData = items.map((item, index) => {
                return activeCols.map(col => columnMap[col.key](item, index));
            });

            // Add headers
            excelData.unshift(headers);

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Set column widths
            const wscols = activeCols.map(col => ({wch: col.width}));
            ws['!cols'] = wscols;

            // Add styles to header row
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_cell({ r: 0, c: C }); // Row 0 is header
                if (!ws[address]) continue;
                ws[address].s = {
                    font: {
                        name: "宋体",
                        sz: 11,
                        bold: true,
                        color: { rgb: "000000" }
                    },
                    alignment: {
                        horizontal: "center",
                        vertical: "center"
                    },
                    fill: {
                        fgColor: { rgb: "EFEFEF" } // Light gray background like before
                    }
                };
            }

            // Create workbook and add worksheet
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

            // Write file
            XLSX.writeFile(wb, `captain_export_${streamerInfo?.uname || 'unknown'}_${new Date().toISOString().slice(0,10)}.xlsx`);

        } catch (err) {
            console.error(err);
            alert('导出发生错误');
        } finally {
            setExporting(false);
        }
    };

    const formatDate = (ts) => {
        return new Date(ts).toLocaleString();
    };

    return (
        <div className="captain-container">
            {/* Export Modal */}
            {showExportModal && (
                <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">导出选项</h3>
                            <button className="modal-close" onClick={() => setShowExportModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <h4 style={{marginBottom: '10px', fontSize: '14px', color: '#4b5563'}}>选择导出列：</h4>
                            <div className="column-selector">
                                {EXPORT_COLUMNS.map(col => (
                                    <label key={col.key} className="column-checkbox">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedColumns.includes(col.key)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedColumns([...selectedColumns, col.key]);
                                                } else {
                                                    // Prevent deselecting all
                                                    if (selectedColumns.length > 1) {
                                                        setSelectedColumns(selectedColumns.filter(k => k !== col.key));
                                                    }
                                                }
                                            }}
                                        />
                                        <span>{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-modern outline" onClick={() => setShowExportModal(false)}>取消</button>
                            <button className="btn-modern primary" onClick={confirmExport}>确认导出</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <header className="page-header">
                <div className="header-content">
                    {streamerInfo && streamerInfo.face && (
                        <img src={streamerInfo.face} alt={streamerInfo.uname} className="streamer-face" />
                    )}
                    <div className="header-text">
                        <h1>{streamerInfo ? streamerInfo.uname : '舰长信息'} {roomId && <span className="header-room-id">({roomId})</span>}</h1>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-modern secondary" onClick={handleExport} disabled={exporting}>
                        <i className="icon-export"></i> {exporting ? '导出中...' : '导出表格'}
                    </button>
                    <button className="btn-modern secondary" onClick={handleImport} disabled={importing}>
                        <i className="icon-import"></i> {importing ? '导入中...' : '导入历史数据'}
                    </button>
                    <button className="btn-modern outline" onClick={() => navigate('/dashboard')}>
                        返回首页
                    </button>
                </div>
            </header>

            {/* Page Content Wrapper */}
            <div className="page-content-wrapper">
                {/* Left Sidebar - Filters */}
                <aside className="filter-sidebar">
                    {/* Stats Overview */}
                    <div className="stats-mini-grid">
                        <div className="stat-mini-card">
                            <div className="stat-content">
                                <span className="stat-label">总记录数</span>
                                <span className="stat-number">{stats.totalRecords.toLocaleString()}</span>
                            </div>
                            <div className="stat-icon bg-blue small">📊</div>
                        </div>
                        <div className="stat-mini-card">
                            <div className="stat-content">
                                <span className="stat-label">舰长数</span>
                                <span className="stat-number">{stats.uniqueCaptains.toLocaleString()}</span>
                            </div>
                            <div className="stat-icon bg-green small">👥</div>
                        </div>
                    </div>

                    <div className="search-panel">
                        <h3 className="panel-title">筛选条件</h3>
                        <form onSubmit={handleSearch} className="filter-form vertical">
                            {/* Session Filter Custom Dropdown */}
                            <div className="input-group" style={{zIndex: 51}}>
                                <label>直播场次</label>
                                <div 
                                    className="custom-select-container" 
                                    ref={sessionDropdownRef}
                                >
                                    <div 
                                        className={`custom-select-trigger ${isSessionDropdownOpen ? 'active' : ''}`}
                                        onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
                                    >
                                        <span>
                                            {filters.sessionId 
                                                ? formatDate(parseInt(filters.sessionId) * 1000) 
                                                : "所有场次"
                                            }
                                        </span>
                                        <svg className="custom-select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    
                                    {isSessionDropdownOpen && (
                                        <div className="custom-select-options">
                                            <div 
                                                className={`custom-select-option ${!filters.sessionId ? 'selected' : ''}`}
                                                onClick={() => {
                                                    handleInputChange({ target: { name: 'sessionId', value: '' } });
                                                    setIsSessionDropdownOpen(false);
                                                }}
                                            >
                                                所有场次
                                            </div>
                                            {filteredSessions.map(sid => (
                                                <div 
                                                    key={sid} 
                                                    className={`custom-select-option ${filters.sessionId === sid ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        handleInputChange({ target: { name: 'sessionId', value: sid } });
                                                        setIsSessionDropdownOpen(false);
                                                    }}
                                                >
                                                    {formatDate(parseInt(sid) * 1000)}
                                                </div>
                                            ))}
                                            {filteredSessions.length === 0 && (
                                                <div className="custom-select-option disabled" style={{cursor: 'default', color: '#9ca3af', textAlign: 'center'}}>
                                                    无符合日期范围的直播场次
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="input-group">
                                <label>UID</label>
                                <input
                                    type="text"
                                    name="uid"
                                    className="modern-input full-width"
                                    placeholder="请输入 UID"
                                    value={filters.uid}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="input-group">
                                <label>用户名</label>
                                <input
                                    type="text"
                                    name="username"
                                    className="modern-input full-width"
                                    placeholder="请输入用户名"
                                    value={filters.username}
                                    onChange={handleInputChange}
                                />
                            </div>
                            
                            <div className="input-group">
                                <label>等级筛选</label>
                                <div className="checkbox-group horizontal">
                                    <label className={`checkbox-item ${filters.levels.includes('3') ? 'active' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={filters.levels.includes('3')} 
                                            onChange={() => handleLevelToggle('3')} 
                                        /> 舰长
                                    </label>
                                    <label className={`checkbox-item ${filters.levels.includes('2') ? 'active' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={filters.levels.includes('2')} 
                                            onChange={() => handleLevelToggle('2')} 
                                        /> 提督
                                    </label>
                                    <label className={`checkbox-item ${filters.levels.includes('1') ? 'active' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={filters.levels.includes('1')} 
                                            onChange={() => handleLevelToggle('1')} 
                                        /> 总督
                                    </label>
                                </div>
                            </div>
                            
                            <div className="input-group">
                                <label>日期范围</label>
                                <div className="date-inputs-vertical">
                                    <input
                                        type="date"
                                        name="startDate"
                                        className="modern-input full-width"
                                        value={filters.startDate}
                                        onChange={handleInputChange}
                                        placeholder="开始日期"
                                    />
                                    <span className="date-seperator-vertical">至</span>
                                    <input
                                        type="date"
                                        name="endDate"
                                        className="modern-input full-width"
                                        value={filters.endDate}
                                        onChange={handleInputChange}
                                        placeholder="结束日期"
                                    />
                                </div>
                            </div>
                            
                            <div className="action-buttons full-width-actions">
                                <button type="button" className="btn-modern outline" onClick={handleReset}>重置</button>
                                <button type="submit" className="btn-modern primary">查询</button>
                            </div>
                        </form>
                    </div>
                </aside>

                {/* Right Content - Stats & Table */}
                <main className="main-content">
                    <div className="captain-table-container">
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>正在加载数据...</p>
                            </div>
                        ) : captains.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <p>没有找到符合条件的记录</p>
                            </div>
                        ) : (
                            <>
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>直播场次</th>
                                            <th>时间</th>
                                            <th>UID</th>
                                            <th>用户名</th>
                                            <th>大航海等级</th>
                                            <th>数量</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {captains.map((item, index) => (
                                            <tr key={item.id || item.timestamp + item.uid}>
                                                <td>{((filters.page - 1) * filters.limit) + index + 1}</td>
                                                <td>
                                                    {item.source_stream_id ? formatDate(parseInt(item.source_stream_id) * 1000) : '-'}
                                                </td>
                                                <td>{formatDate(item.timestamp)}</td>
                                                <td>{item.uid}</td>
                                                <td>{item.username}</td>
                                                <td>
                                                    <span className={`level-badge ${levels[item.guard_level]?.className || ''}`}>
                                                        {levels[item.guard_level]?.name || '未知'}
                                                    </span>
                                                </td>
                                                <td>{item.num ? `${item.num}个月` : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="pagination">
                                    <button 
                                        className="page-btn" 
                                        disabled={filters.page <= 1}
                                        onClick={() => handlePageChange(filters.page - 1)}
                                    >
                                        上一页
                                    </button>
                                    <span className="page-info">
                                        第 {filters.page} 页 / 共 {Math.ceil(totalItems / filters.limit) || 1} 页
                                    </span>
                                    <button 
                                        className="page-btn" 
                                        disabled={filters.page >= Math.ceil(totalItems / filters.limit)}
                                        onClick={() => handlePageChange(filters.page + 1)}
                                    >
                                        下一页
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CaptainPage;
