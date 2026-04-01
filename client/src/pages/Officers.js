import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FiscalYearContext } from '../context/FiscalYearContext';
import { useToast } from '../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus, faEdit, faKey, faTrash, faUserCheck, faUserXmark,
  faUsers, faUserTie, faFileCsv, faPlus, faDownload, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import './Officers.css';

const API_URL = 'http://127.0.0.1:8080/api';

const POSITIONS = [
  'President', 'Vice President Internal', 'Vice President External',
  'Secretary', 'Treasurer', 'Auditor',
  'Head Marshal', 'Marshal',
  'Creatives Head Director', 'Layout Artist',
  'Social Media Manager', 'Captioner', 'Adviser',
];

const OFFICER_DIR_HEADERS = ['name','position','studentId','course','yearLevel','email','academicYear','status'];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

function downloadTemplate(headers, filename) {
  const blob = new Blob([headers.join(',') + '\n'], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

const emptyDirForm = { name: '', position: '', studentId: '', course: '', yearLevel: '', email: '', academicYear: '', status: 'Active' };

const Officers = () => {
  const { user } = useContext(AuthContext);
  const { academicYear } = useContext(FiscalYearContext);
  const isAdmin = user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'accounts' : 'directory');
  const { showToast } = useToast();
  const showMsg = (type, text) => showToast(type, text);

  // ── System Accounts state ────────────────────────────────────────────────────
  const [officers, setOfficers]         = useState([]);
  const [stats, setStats]               = useState(null);
  const [loadingAccts, setLoadingAccts] = useState(false);
  const [showAcctModal, setShowAcctModal] = useState(false);
  const [showPwdModal, setShowPwdModal]   = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [acctForm, setAcctForm]         = useState({ name: '', email: '', password: '', role: 'Treasurer' });
  const [newPassword, setNewPassword]   = useState('');

  // ── Officer Directory state ─────────────────────────────────────────────────
  const [directory, setDirectory]         = useState([]);
  const [loadingDir, setLoadingDir]       = useState(false);
  const [showDirModal, setShowDirModal]   = useState(false);
  const [selectedDir, setSelectedDir]     = useState(null);
  const [dirForm, setDirForm]             = useState({ ...emptyDirForm, academicYear });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows]       = useState([]);
  const [importing, setImporting]         = useState(false);
  const fileRef = useRef();

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchAccounts = async () => {
    if (!isAdmin) return;
    try {
      setLoadingAccts(true);
      const [accts, st] = await Promise.all([
        axios.get(`${API_URL}/officers`),
        axios.get(`${API_URL}/officers/stats`),
      ]);
      setOfficers(accts.data);
      setStats(st.data);
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to load officer accounts.');
    } finally {
      setLoadingAccts(false);
    }
  };

  const fetchDirectory = async () => {
    try {
      setLoadingDir(true);
      const res = await axios.get(`${API_URL}/officer-directory?academicYear=${academicYear}`);
      setDirectory(res.data);
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to load officer directory.');
    } finally {
      setLoadingDir(false);
    }
  };

  useEffect(() => { if (isAdmin) fetchAccounts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDirectory(); }, [academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── System Accounts handlers ─────────────────────────────────────────────────
  const handleAcctSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedOfficer) {
        await axios.put(`${API_URL}/officers/${selectedOfficer._id}`, { name: acctForm.name, email: acctForm.email, role: acctForm.role });
        showMsg('success', 'Officer account updated.');
      } else {
        await axios.post(`${API_URL}/officers`, acctForm);
        showMsg('success', 'Officer account created.');
      }
      setShowAcctModal(false);
      setSelectedOfficer(null);
      setAcctForm({ name: '', email: '', password: '', role: 'Treasurer' });
      fetchAccounts();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Operation failed.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/officers/${selectedOfficer._id}/password`, { password: newPassword });
      showMsg('success', 'Password reset successfully.');
      setShowPwdModal(false);
      setNewPassword('');
      setSelectedOfficer(null);
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to reset password.');
    }
  };

  const handleToggleActive = async (o) => {
    try {
      await axios.put(`${API_URL}/officers/${o._id}`, { isActive: !o.isActive });
      showMsg('success', `Officer ${!o.isActive ? 'activated' : 'deactivated'}.`);
      fetchAccounts();
    } catch (err) {
      showMsg('error', 'Failed to update officer status.');
    }
  };

  const handleDeleteAcct = async (id) => {
    if (!window.confirm('Delete this officer account? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/officers/${id}`);
      showMsg('success', 'Officer account deleted.');
      fetchAccounts();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to delete officer.');
    }
  };

  // ── Officer Directory handlers ──────────────────────────────────────────────
  const openAddDir = () => {
    setSelectedDir(null);
    setDirForm({ ...emptyDirForm, academicYear });
    setShowDirModal(true);
  };

  const openEditDir = (o) => {
    setSelectedDir(o);
    setDirForm({ name: o.name, position: o.position, studentId: o.studentId || '', course: o.course || '', yearLevel: o.yearLevel || '', email: o.email || '', academicYear: o.academicYear, status: o.status });
    setShowDirModal(true);
  };

  const handleDirSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDir) {
        await axios.put(`${API_URL}/officer-directory/${selectedDir._id}`, dirForm);
        showMsg('success', 'Officer updated.');
      } else {
        await axios.post(`${API_URL}/officer-directory`, dirForm);
        showMsg('success', 'Officer added to directory.');
      }
      setShowDirModal(false);
      setSelectedDir(null);
      fetchDirectory();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to save officer.');
    }
  };

  const handleDeleteDir = async (id) => {
    if (!window.confirm('Remove this officer from the directory?')) return;
    try {
      await axios.delete(`${API_URL}/officer-directory/${id}`);
      showMsg('success', 'Officer removed.');
      fetchDirectory();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to delete officer.');
    }
  };

  // ── CSV Import ───────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportRows(parseCSV(ev.target.result));
      setShowImportModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    try {
      const res = await axios.post(`${API_URL}/officer-directory/bulk-import`, { officers: importRows });
      showMsg('success', `Import done: ${res.data.created} added, ${res.data.skipped} skipped.`);
      setShowImportModal(false);
      setImportRows([]);
      fetchDirectory();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const activeCount   = directory.filter(o => o.status === 'Active').length;
  const inactiveCount = directory.filter(o => o.status === 'Inactive').length;

  return (
    <div className="off-page">
      <div className="off-header">
        <div>
          <h1 className="off-title">Officers</h1>
          <p className="off-sub">Manage system accounts and the organizational officer directory</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="off-tabs">
        {isAdmin && (
          <button className={`off-tab${activeTab === 'accounts' ? ' off-tab-active' : ''}`} onClick={() => setActiveTab('accounts')}>
            <FontAwesomeIcon icon={faUserTie} /> System Accounts
          </button>
        )}
        <button className={`off-tab${activeTab === 'directory' ? ' off-tab-active' : ''}`} onClick={() => setActiveTab('directory')}>
          <FontAwesomeIcon icon={faUsers} /> Officer Directory
        </button>
      </div>

      {/* ════════ SYSTEM ACCOUNTS ════════ */}
      {activeTab === 'accounts' && isAdmin && (
        <div>
          {stats && (
            <div className="off-stats-row">
              {[
                { label: 'Total Accounts', value: stats.totalOfficers, color: '#3366FF', bg: '#eff6ff' },
                { label: 'Active', value: stats.activeOfficers, color: '#059669', bg: '#ecfdf5' },
                { label: 'Inactive', value: stats.inactiveOfficers, color: '#ef4444', bg: '#fef2f2' },
              ].map(s => (
                <div key={s.label} className="off-stat-card" style={{ borderTopColor: s.color }}>
                  <div className="off-stat-icon" style={{ background: s.bg, color: s.color }}><FontAwesomeIcon icon={faUserTie} /></div>
                  <div>
                    <div className="off-stat-num" style={{ color: s.color }}>{s.value}</div>
                    <div className="off-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="off-toolbar">
            <div />
            <button className="off-add-btn" onClick={() => { setSelectedOfficer(null); setAcctForm({ name: '', email: '', password: '', role: 'Treasurer' }); setShowAcctModal(true); }}>
              <FontAwesomeIcon icon={faUserPlus} /> Add Officer Account
            </button>
          </div>
          {loadingAccts ? (
            <div className="off-empty"><FontAwesomeIcon icon={faSpinner} spin /> Loading…</div>
          ) : (
            <div className="off-table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {officers.length === 0 ? (
                    <tr><td colSpan={6} className="off-empty">No officer accounts found.</td></tr>
                  ) : officers.map(o => (
                    <tr key={o._id}>
                      <td>{o.name}</td>
                      <td>{o.email}</td>
                      <td><span className={`off-badge ${o.role === 'Admin' ? 'off-badge-admin' : 'off-badge-role'}`}>{o.role}</span></td>
                      <td><span className={`off-badge ${o.isActive ? 'off-badge-active' : 'off-badge-inactive'}`}>{o.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>
                        {o.role === 'Admin' ? <span className="off-protected">Protected</span> : (
                          <div className="off-actions">
                            <button className="off-action-btn off-action-edit" onClick={() => { setSelectedOfficer(o); setAcctForm({ name: o.name, email: o.email, password: '', role: o.role }); setShowAcctModal(true); }} title="Edit"><FontAwesomeIcon icon={faEdit} /></button>
                            <button className="off-action-btn off-action-key" onClick={() => { setSelectedOfficer(o); setNewPassword(''); setShowPwdModal(true); }} title="Reset Password"><FontAwesomeIcon icon={faKey} /></button>
                            <button className={`off-action-btn ${o.isActive ? 'off-action-deactivate' : 'off-action-activate'}`} onClick={() => handleToggleActive(o)} title={o.isActive ? 'Deactivate' : 'Activate'}><FontAwesomeIcon icon={o.isActive ? faUserXmark : faUserCheck} /></button>
                            <button className="off-action-btn off-action-delete" onClick={() => handleDeleteAcct(o._id)} title="Delete"><FontAwesomeIcon icon={faTrash} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════ OFFICER DIRECTORY ════════ */}
      {activeTab === 'directory' && (
        <div>
          <div className="off-stats-row">
            {[
              { label: 'Total Officers', value: directory.length, color: '#3366FF', bg: '#eff6ff' },
              { label: 'Active', value: activeCount, color: '#059669', bg: '#ecfdf5' },
              { label: 'Inactive', value: inactiveCount, color: '#ef4444', bg: '#fef2f2' },
            ].map(s => (
              <div key={s.label} className="off-stat-card" style={{ borderTopColor: s.color }}>
                <div className="off-stat-icon" style={{ background: s.bg, color: s.color }}><FontAwesomeIcon icon={faUsers} /></div>
                <div>
                  <div className="off-stat-num" style={{ color: s.color }}>{s.value}</div>
                  <div className="off-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="off-toolbar">
            <span className="off-year-badge">{academicYear}</span>
            <div className="off-toolbar-right">
              <button className="off-export-btn" onClick={() => downloadTemplate(OFFICER_DIR_HEADERS, 'officers_template.csv')}>
                <FontAwesomeIcon icon={faDownload} /> Template
              </button>
              <button className="off-export-btn" onClick={() => fileRef.current.click()}>
                <FontAwesomeIcon icon={faFileCsv} /> Import CSV
              </button>
              <input type="file" accept=".csv" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange} />
              <button className="off-add-btn" onClick={openAddDir}>
                <FontAwesomeIcon icon={faPlus} /> Add Officer
              </button>
            </div>
          </div>

          {loadingDir ? (
            <div className="off-empty"><FontAwesomeIcon icon={faSpinner} spin /> Loading…</div>
          ) : directory.length === 0 ? (
            <div className="off-empty">No officers for {academicYear}. Add one or import a CSV.</div>
          ) : (
            <div className="off-table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Position</th><th>Student ID</th><th>Course</th><th>Year</th><th>Email</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr>
                </thead>
                <tbody>
                  {directory.map(o => (
                    <tr key={o._id}>
                      <td><strong>{o.name}</strong></td>
                      <td><span className="off-position-badge">{o.position}</span></td>
                      <td>{o.studentId || '—'}</td>
                      <td>{o.course || '—'}</td>
                      <td>{o.yearLevel || '—'}</td>
                      <td>{o.email || '—'}</td>
                      <td><span className={`off-badge ${o.status === 'Active' ? 'off-badge-active' : 'off-badge-inactive'}`}>{o.status}</span></td>
                      {isAdmin && (
                        <td>
                          <div className="off-actions">
                            <button className="off-action-btn off-action-edit" onClick={() => openEditDir(o)} title="Edit"><FontAwesomeIcon icon={faEdit} /></button>
                            <button className="off-action-btn off-action-delete" onClick={() => handleDeleteDir(o._id)} title="Delete"><FontAwesomeIcon icon={faTrash} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════ MODAL: Add/Edit System Account ════════ */}
      {showAcctModal && (
        <div className="off-overlay" onClick={() => setShowAcctModal(false)}>
          <div className="off-modal" onClick={e => e.stopPropagation()}>
            <div className="off-modal-header">
              <h2 className="off-modal-title">{selectedOfficer ? 'Edit Officer Account' : 'Add Officer Account'}</h2>
              <button className="off-modal-close" onClick={() => setShowAcctModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAcctSubmit}>
              <div className="off-form-group"><label>Name *</label><input required value={acctForm.name} onChange={e => setAcctForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
              <div className="off-form-group"><label>Email *</label><input type="email" required value={acctForm.email} onChange={e => setAcctForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></div>
              {!selectedOfficer && (
                <div className="off-form-group"><label>Password *</label><input type="password" required minLength={6} value={acctForm.password} onChange={e => setAcctForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" /></div>
              )}
              <div className="off-form-group">
                <label>Role *</label>
                <select value={acctForm.role} onChange={e => setAcctForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="President">President</option>
                  <option value="Secretary">Secretary</option>
                  <option value="Treasurer">Treasurer</option>
                  <option value="Auditor">Auditor</option>
                </select>
              </div>
              <div className="off-modal-footer">
                <button type="button" className="off-btn-cancel" onClick={() => setShowAcctModal(false)}>Cancel</button>
                <button type="submit" className="off-btn-save">{selectedOfficer ? 'Update' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ MODAL: Reset Password ════════ */}
      {showPwdModal && (
        <div className="off-overlay" onClick={() => setShowPwdModal(false)}>
          <div className="off-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="off-modal-header">
              <h2 className="off-modal-title">Reset Password</h2>
              <button className="off-modal-close" onClick={() => setShowPwdModal(false)}>✕</button>
            </div>
            <p className="off-modal-sub">Resetting password for <strong>{selectedOfficer?.name}</strong></p>
            <form onSubmit={handleResetPassword}>
              <div className="off-form-group"><label>New Password *</label><input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" /></div>
              <div className="off-modal-footer">
                <button type="button" className="off-btn-cancel" onClick={() => setShowPwdModal(false)}>Cancel</button>
                <button type="submit" className="off-btn-save">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ MODAL: Add/Edit Officer Directory ════════ */}
      {showDirModal && (
        <div className="off-overlay" onClick={() => setShowDirModal(false)}>
          <div className="off-modal" onClick={e => e.stopPropagation()}>
            <div className="off-modal-header">
              <h2 className="off-modal-title">{selectedDir ? 'Edit Officer' : 'Add Officer'}</h2>
              <button className="off-modal-close" onClick={() => setShowDirModal(false)}>✕</button>
            </div>
            <form onSubmit={handleDirSubmit}>
              <div className="off-form-row">
                <div className="off-form-group"><label>Name *</label><input required value={dirForm.name} onChange={e => setDirForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
                <div className="off-form-group"><label>Academic Year *</label><input required value={dirForm.academicYear} onChange={e => setDirForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="e.g. 2025-2026" /></div>
              </div>
              <div className="off-form-group">
                <label>Position *</label>
                <input required list="off-positions" value={dirForm.position} onChange={e => setDirForm(f => ({ ...f, position: e.target.value }))} placeholder="Select or type a position" />
                <datalist id="off-positions">{POSITIONS.map(p => <option key={p} value={p} />)}</datalist>
              </div>
              <div className="off-form-row">
                <div className="off-form-group"><label>Student ID</label><input value={dirForm.studentId} onChange={e => setDirForm(f => ({ ...f, studentId: e.target.value }))} placeholder="e.g. 2021-00001" /></div>
                <div className="off-form-group"><label>Email</label><input type="email" value={dirForm.email} onChange={e => setDirForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" /></div>
              </div>
              <div className="off-form-row">
                <div className="off-form-group"><label>Course</label><input value={dirForm.course} onChange={e => setDirForm(f => ({ ...f, course: e.target.value }))} placeholder="e.g. BSIT" /></div>
                <div className="off-form-group">
                  <label>Year Level</label>
                  <select value={dirForm.yearLevel} onChange={e => setDirForm(f => ({ ...f, yearLevel: e.target.value }))}>
                    <option value="">— Select —</option>
                    {['1st Year','2nd Year','3rd Year','4th Year','5th Year'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="off-form-group">
                <label>Status</label>
                <select value={dirForm.status} onChange={e => setDirForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="off-modal-footer">
                <button type="button" className="off-btn-cancel" onClick={() => setShowDirModal(false)}>Cancel</button>
                <button type="submit" className="off-btn-save">{selectedDir ? 'Update Officer' : 'Add Officer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════ MODAL: CSV Import Preview ════════ */}
      {showImportModal && (
        <div className="off-overlay" onClick={() => setShowImportModal(false)}>
          <div className="off-modal off-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="off-modal-header">
              <h2 className="off-modal-title">Import Preview — {importRows.length} row{importRows.length !== 1 ? 's' : ''}</h2>
              <button className="off-modal-close" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <p className="off-modal-sub">Rows highlighted in red are missing required fields (name, position, academicYear) and will be skipped.</p>
            <div className="off-import-table-wrap">
              <table>
                <thead><tr>{OFFICER_DIR_HEADERS.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {importRows.slice(0, 50).map((row, i) => {
                    const invalid = !row.name || !row.position || !row.academicYear;
                    return (
                      <tr key={i} className={invalid ? 'off-import-row-error' : ''}>
                        {OFFICER_DIR_HEADERS.map(h => <td key={h}>{row[h] || '—'}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {importRows.length > 50 && <p className="off-import-note">Showing first 50 of {importRows.length} rows.</p>}
            </div>
            <div className="off-modal-footer">
              <button type="button" className="off-btn-cancel" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button className="off-btn-save" onClick={handleImport} disabled={importing}>
                {importing ? <><FontAwesomeIcon icon={faSpinner} spin /> Importing…</> : `Import ${importRows.length} Rows`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Officers;
