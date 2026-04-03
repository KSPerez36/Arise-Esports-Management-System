import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClockRotateLeft, faFilter, faRotateRight,
  faChevronLeft, faChevronRight, faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import './ActivityLogs.css';

const API_URL = 'http://127.0.0.1:8080/api';

const ACTION_COLORS = {
  CREATE:  'action-create',
  UPDATE:  'action-update',
  DELETE:  'action-delete',
  LOGIN:   'action-login',
  PAYMENT: 'action-payment',
  IMPORT:  'action-import',
  RESET:   'action-reset',
};

const MODULE_COLORS = {
  Members:         'mod-members',
  Events:          'mod-events',
  Finances:        'mod-finances',
  Officers:        'mod-officers',
  OfficerDirectory:'mod-dir',
  Reports:         'mod-reports',
  Auth:            'mod-auth',
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
};

const ActivityLogs = () => {
  const { user } = useContext(AuthContext);

  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    module: '', action: '', search: '', startDate: '', endDate: '',
  });
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 50, ...filters };
      // Strip empty params
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const res = await axios.get(`${API_URL}/activity-logs`, { params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="activity-page">
        <div className="activity-access-denied">
          <FontAwesomeIcon icon={faShieldHalved} />
          <p>Access restricted to Admins only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-page">

      {/* Header */}
      <div className="activity-header">
        <div>
          <h1 className="activity-title">
            <FontAwesomeIcon icon={faClockRotateLeft} />
            Activity Logs
          </h1>
          <p className="activity-sub">{total} total records</p>
        </div>
        <button className="btn btn-secondary activity-refresh" onClick={fetchLogs}>
          <FontAwesomeIcon icon={faRotateRight} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="activity-filters">
        <FontAwesomeIcon icon={faFilter} className="activity-filter-icon" />

        <select
          value={filters.module}
          onChange={e => handleFilterChange('module', e.target.value)}
          className="activity-select"
        >
          <option value="">All Modules</option>
          {['Members','Events','Finances','Officers','OfficerDirectory','Reports','Auth'].map(m => (
            <option key={m} value={m}>{m === 'OfficerDirectory' ? 'Officer Directory' : m}</option>
          ))}
        </select>

        <select
          value={filters.action}
          onChange={e => handleFilterChange('action', e.target.value)}
          className="activity-select"
        >
          <option value="">All Actions</option>
          {['CREATE','UPDATE','DELETE','LOGIN','PAYMENT','IMPORT','RESET'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={e => handleFilterChange('startDate', e.target.value)}
          className="activity-date"
          title="From date"
        />
        <span className="activity-date-sep">—</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={e => handleFilterChange('endDate', e.target.value)}
          className="activity-date"
          title="To date"
        />

        <input
          type="text"
          value={filters.search}
          onChange={e => handleFilterChange('search', e.target.value)}
          placeholder="Search by user name..."
          className="activity-search"
        />

        {(filters.module || filters.action || filters.startDate || filters.endDate || filters.search) && (
          <button
            className="activity-clear"
            onClick={() => { setFilters({ module:'', action:'', search:'', startDate:'', endDate:'' }); setPage(1); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="activity-card">
        {loading ? (
          <div className="activity-loading">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="activity-empty">
            <FontAwesomeIcon icon={faClockRotateLeft} />
            <p>No activity logs found.</p>
          </div>
        ) : (
          <table className="activity-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Module</th>
                <th>Action</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id}>
                  <td className="activity-ts">{formatDate(log.createdAt)}</td>
                  <td>
                    <div className="activity-user">
                      <span className="activity-user-name">{log.user?.name || '—'}</span>
                      <span className="activity-user-role">{log.user?.role || ''}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`activity-badge ${MODULE_COLORS[log.module] || ''}`}>
                      {log.module === 'OfficerDirectory' ? 'Officer Dir.' : log.module}
                    </span>
                  </td>
                  <td>
                    <span className={`activity-badge ${ACTION_COLORS[log.action] || ''}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="activity-desc">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="activity-pagination">
          <button
            className="activity-page-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <span className="activity-page-info">Page {page} of {pages}</span>
          <button
            className="activity-page-btn"
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      )}

    </div>
  );
};

export default ActivityLogs;
