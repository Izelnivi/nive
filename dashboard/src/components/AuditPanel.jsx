import { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';

export default function AuditPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const query = search.toLowerCase();
    const matchesSearch = !query || 
      (log.userName || '').toLowerCase().includes(query) ||
      (log.action || '').toLowerCase().includes(query) ||
      (log.details || '').toLowerCase().includes(query);

    const matchesAction = !actionFilter || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  // Unique actions for filters
  const actions = Array.from(new Set(logs.map(log => log.action)));

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-content animate-fade-in">
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>System Audit Roster</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>A read-only log tracking clocks, requests, and updates across the system.</p>
          </div>
          <button className="btn btn-secondary" onClick={loadLogs} title="Refresh logs">
            🔄 Refresh Logs
          </button>
        </div>

        {/* Filters bar */}
        <div className="filter-toolbar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 250px' }}>
            <input
              type="text"
              className="input-control"
              placeholder="🔍 Search name, action, details..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <select
              className="select-dropdown"
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%' }}
            >
              <option value="">All Actions</option>
              {actions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="table-responsive">
          <table className="custom-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Employee</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No audit logs matching selection.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <code>{new Date(log.timestamp).toLocaleString()}</code>
                    </td>
                    <td>
                      <strong>{log.userName}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {log.userId}</div>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: log.action.includes('Clock') 
                          ? 'rgba(59, 130, 246, 0.12)' 
                          : log.action.includes('Leave') 
                          ? 'rgba(245, 158, 11, 0.12)' 
                          : 'rgba(16, 185, 129, 0.12)',
                        color: log.action.includes('Clock') 
                          ? 'var(--info)' 
                          : log.action.includes('Leave') 
                          ? 'var(--warning)' 
                          : 'var(--success)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="pagination-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <div className="pagination-stats" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
            </div>
            <div className="pagination-buttons" style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                ◀ Prev
              </button>
              <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', padding: '0 0.5rem', color: 'var(--text-muted)' }}>
                Page {activePage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
