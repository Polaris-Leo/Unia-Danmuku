import React, { useState, useEffect, useCallback } from 'react';
import { getCaptains, getCaptainStats, importCaptainHistory, getMonitoredRooms } from '../services/api';
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

    const [filters, setFilters] = useState({
        username: '',
        uid: '',
        levels: [], 
        startDate: '',
        endDate: '',
        page: 1,
        limit: 20,
    });
    const [totalItems, setTotalItems] = useState(0);

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
                const res = await getMonitoredRooms();
                if (res.rooms && Array.isArray(res.rooms)) {
                    const info = res.rooms.find(r => String(r.roomId) === String(roomId));
                    if (info) setStreamerInfo(info);
                }
            } catch (err) {
                console.error("Failed to load streamer info:", err);
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
        // Fetch when page/limit/levels changes including mount
        fetchData();
    }, [filters.page, filters.limit, filters.levels, roomId]);

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
        if (!window.confirm('确定要扫描所有历史文件并导入舰长记录吗？这可能需要几分钟。')) return;
        
        setImporting(true);
        try {
            const res = await importCaptainHistory();
            if (res.success) {
                alert(`导入完成！新增 ${res.data.added} 条记录，跳过 ${res.data.skipped} 条。`);
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

    const handleExport = async () => {
        if (!captains.length) return alert('当前没有数据可导出');
        setExporting(true);

        try {
            // Re-fetch all matching data
            const res = await getCaptains({
                username: filters.username,
                uid: filters.uid,
                levels: filters.levels || [],
                startDate: filters.startDate ? toTimestamp(filters.startDate) : null,
                endDate: filters.endDate ? toTimestamp(filters.endDate) + 86400000 - 1 : null,
                room_id: roomId,
                page: 1,
                limit: 100000 // Large limit to get all
            });

            if (!res || !res.success || !res.data || !res.data.items) {
                alert('导出失败: 获取数据失败');
                return;
            }

            const items = res.data.items;

            // Prepare data for Excel
            const headers = ['序号', '时间', 'UID', '用户名', '大航海等级', '数量'];
            const excelData = items.map((item, index) => {
                const levelName = levels[item.guard_level]?.name || '未知';
                const quantity = item.num ? `${item.num}个月` : '-';
                return [
                    index + 1,
                    formatDate(item.timestamp),
                    item.uid,
                    item.username,
                    levelName,
                    quantity
                ];
            });

            // Add headers
            excelData.unshift(headers);

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(excelData);

            // Set column widths
            const wscols = [
                {wch: 8},  // 序号
                {wch: 22}, // 时间
                {wch: 15}, // UID
                {wch: 20}, // 用户名
                {wch: 12}, // 等级
                {wch: 10}  // 数量
            ];
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
