import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDatabase,
  faDownload,
  faCloudArrowUp,
  faRotateLeft,
  faTrash,
  faTriangleExclamation,
  faAlarmClock,
  faServer,
  faFileImport,
  faCircleCheck,
  faBoxOpen,
} from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../context/ToastContext';
import './Database.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const COLLECTION_LABELS = {
  members:          'Members',
  events:           'Events',
  budgets:          'Budgets',
  transactions:     'Transactions',
  tasks:            'Tasks',
  officerDirectory: 'Officer Directory',
  meetingMinutes:   'Meeting Minutes',
  users:            'Users (Officers)',
};

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(d) {
  return new Date(d).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Database() {
  const { showToast } = useToast();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ── Saved backups ──
  const [backups, setBackups]           = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [savingBackup, setSavingBackup] = useState(false);
  const [downloading, setDownloading]   = useState(false);

  // ── Schedule ──
  const [schedule, setSchedule]         = useState({ enabled: false, frequency: 'daily', time: '02:00', dayOfWeek: 0 });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // ── Restore ──
  const [restoreFile, setRestoreFile]   = useState(null);
  const [restoreData, setRestoreData]   = useState(null);
  const [restoring, setRestoring]       = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const [dragover, setDragover]         = useState(false);
  const fileInputRef = useRef(null);

  // ── Wipe ──
  const [wipeCollection, setWipeCollection] = useState('members');
  const [wiping, setWiping]             = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');

  const WIPE_SAFE = ['members', 'events', 'tasks', 'budgets', 'transactions', 'officerDirectory', 'meetingMinutes'];

  // ── Load saved backups & schedule on mount ──
  useEffect(() => {
    fetchBackups();
    fetchSchedule();
  }, []);

  async function fetchBackups() {
    setLoadingBackups(true);
    try {
      const { data } = await axios.get(`${API}/api/database/backups`, { headers });
      setBackups(data);
    } catch {
      showToast('Could not load saved backups', 'error');
    } finally {
      setLoadingBackups(false);
    }
  }

  async function fetchSchedule() {
    try {
      const { data } = await axios.get(`${API}/api/database/schedule`, { headers });
      setSchedule(data);
    } catch { /* non-critical */ }
  }

  // ── Download full backup to browser ──
  async function handleDownloadBackup() {
    setDownloading(true);
    try {
      const res = await axios.get(`${API}/api/database/backup`, {
        headers,
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href     = url;
      link.download = `arise-backup-${date}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded successfully', 'success');
    } catch {
      showToast('Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  }

  // ── Save backup to server ──
  async function handleSaveBackup() {
    setSavingBackup(true);
    try {
      await axios.post(`${API}/api/database/backup`, {}, { headers });
      showToast('Backup saved to server', 'success');
      fetchBackups();
    } catch {
      showToast('Save failed', 'error');
    } finally {
      setSavingBackup(false);
    }
  }

  // ── Download a specific stored backup ──
  async function handleDownloadStored(filename) {
    try {
      const res = await axios.get(`${API}/api/database/backups/${filename}`, {
        headers,
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href     = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Download failed', 'error');
    }
  }

  // ── Delete stored backup ──
  async function handleDeleteBackup(filename) {
    try {
      await axios.delete(`${API}/api/database/backups/${filename}`, { headers });
      showToast('Backup deleted', 'success');
      fetchBackups();
    } catch {
      showToast('Delete failed', 'error');
    }
  }

  // ── Save schedule ──
  async function handleSaveSchedule() {
    setSavingSchedule(true);
    try {
      await axios.put(`${API}/api/database/schedule`, schedule, { headers });
      showToast('Schedule saved', 'success');
    } catch {
      showToast('Failed to save schedule', 'error');
    } finally {
      setSavingSchedule(false);
    }
  }

  // ── Restore: parse JSON file ──
  function handleFileSelect(file) {
    if (!file || !file.name.endsWith('.json')) {
      showToast('Please select a valid .json backup file', 'error');
      return;
    }
    setRestoreFile(file);
    setRestoreResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        setRestoreData(parsed);
      } catch {
        showToast('Invalid JSON file', 'error');
        setRestoreData(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleRestore() {
    if (!restoreData) return;
    setRestoring(true);
    setRestoreResult(null);
    try {
      const { data } = await axios.post(
        `${API}/api/database/restore`,
        { data: restoreData },
        { headers, maxContentLength: Infinity, maxBodyLength: Infinity }
      );
      setRestoreResult(data.results);
      showToast('Restore completed', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  }

  // ── Wipe ──
  async function handleWipe() {
    if (wipeConfirmInput !== COLLECTION_LABELS[wipeCollection]) return;
    setWiping(true);
    try {
      const { data } = await axios.delete(
        `${API}/api/database/wipe/${wipeCollection}`,
        { headers, data: { confirm: true } }
      );
      showToast(`${COLLECTION_LABELS[wipeCollection]} wiped — ${data.deleted} records deleted`, 'success');
      setShowWipeConfirm(false);
      setWipeConfirmInput('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Wipe failed', 'error');
    } finally {
      setWiping(false);
    }
  }

  // ── Preview collections from parsed backup ──
  const previewCollections = restoreData
    ? Object.entries(restoreData)
        .filter(([k]) => k !== '_meta')
        .map(([k, v]) => ({ key: k, label: COLLECTION_LABELS[k] || k, count: Array.isArray(v) ? v.length : 0 }))
    : [];

  return (
    <div className="db-page">

      {/* Header */}
      <div className="db-header">
        <div>
          <h1 className="db-title">
            <FontAwesomeIcon icon={faDatabase} style={{ marginRight: 10, fontSize: '1.4rem' }} />
            Database Management
          </h1>
          <p className="db-sub">Backup, restore, schedule, and manage your database collections</p>
        </div>
      </div>

      <div className="db-grid">

        {/* ── Card 1: Backup ── */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon blue"><FontAwesomeIcon icon={faDownload} /></div>
            <div>
              <p className="db-card-title">Backup</p>
              <p className="db-card-desc">Export a full snapshot of all collections</p>
            </div>
          </div>
          <div className="db-backup-actions">
            <button className="db-btn db-btn-primary" onClick={handleDownloadBackup} disabled={downloading}>
              <FontAwesomeIcon icon={faDownload} />
              {downloading ? 'Preparing…' : 'Download Backup'}
            </button>
            <button className="db-btn db-btn-secondary" onClick={handleSaveBackup} disabled={savingBackup}>
              <FontAwesomeIcon icon={faServer} />
              {savingBackup ? 'Saving…' : 'Save to Server'}
            </button>
          </div>
        </div>

        {/* ── Card 2: Schedule ── */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon purple"><FontAwesomeIcon icon={faAlarmClock} /></div>
            <div>
              <p className="db-card-title">Scheduled Backups</p>
              <p className="db-card-desc">Auto-save backups on a recurring schedule</p>
            </div>
          </div>

          <div className="db-toggle-row">
            <span className="db-toggle-label">Enable automatic backups</span>
            <label className="db-toggle">
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={e => setSchedule(s => ({ ...s, enabled: e.target.checked }))}
              />
              <span className="db-toggle-track" />
              <span className="db-toggle-thumb" />
            </label>
          </div>

          {schedule.enabled && (
            <div className="db-schedule-grid">
              <div>
                <div className="db-field-label">Frequency</div>
                <select
                  className="db-select"
                  value={schedule.frequency}
                  onChange={e => setSchedule(s => ({ ...s, frequency: e.target.value }))}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <div className="db-field-label">Time</div>
                <input
                  type="time"
                  className="db-input"
                  value={schedule.time}
                  onChange={e => setSchedule(s => ({ ...s, time: e.target.value }))}
                />
              </div>
              {schedule.frequency === 'weekly' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="db-field-label">Day of Week</div>
                  <select
                    className="db-select"
                    value={schedule.dayOfWeek}
                    onChange={e => setSchedule(s => ({ ...s, dayOfWeek: Number(e.target.value) }))}
                  >
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className={`db-schedule-status ${schedule.enabled ? 'on' : 'off'}`}>
            {schedule.enabled
              ? `Scheduled: ${schedule.frequency === 'weekly' ? `Every ${DAY_NAMES[schedule.dayOfWeek]} at` : 'Daily at'} ${schedule.time}`
              : 'Automatic backups are disabled'}
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="db-btn db-btn-primary" onClick={handleSaveSchedule} disabled={savingSchedule}>
              {savingSchedule ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>
        </div>

        {/* ── Card 3: Saved Backups ── */}
        <div className="db-card db-grid-full">
          <div className="db-card-header">
            <div className="db-card-icon green"><FontAwesomeIcon icon={faServer} /></div>
            <div>
              <p className="db-card-title">Saved Backups</p>
              <p className="db-card-desc">Backup files stored on the server (max 10)</p>
            </div>
          </div>

          {loadingBackups ? (
            <div className="db-empty">Loading…</div>
          ) : backups.length === 0 ? (
            <div className="db-empty">
              <FontAwesomeIcon icon={faBoxOpen} />
              No saved backups yet. Use "Save to Server" above.
            </div>
          ) : (
            <table className="db-backup-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.filename}>
                    <td><span className="db-file-name">{b.filename}</span></td>
                    <td className="db-file-size">{formatBytes(b.size)}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>
                      <div className="db-backup-actions-cell">
                        <button className="db-btn db-btn-ghost" onClick={() => handleDownloadStored(b.filename)} title="Download">
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button className="db-btn db-btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleDeleteBackup(b.filename)} title="Delete">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Card 4: Restore ── */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon amber"><FontAwesomeIcon icon={faFileImport} /></div>
            <div>
              <p className="db-card-title">Restore</p>
              <p className="db-card-desc">Merge records from a backup file (skips duplicates)</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`db-dropzone ${dragover ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={e => { e.preventDefault(); setDragover(false); handleFileSelect(e.dataTransfer.files[0]); }}
          >
            <FontAwesomeIcon icon={faCloudArrowUp} />
            {restoreFile
              ? <p><strong>{restoreFile.name}</strong></p>
              : <p>Click or drag a backup <strong>.json</strong> file here</p>
            }
            <small>Only files exported from this system are supported</small>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => handleFileSelect(e.target.files[0])}
          />

          {/* Preview */}
          {previewCollections.length > 0 && (
            <table className="db-restore-preview">
              <thead>
                <tr><th>Collection</th><th>Records in file</th></tr>
              </thead>
              <tbody>
                {previewCollections.map(c => (
                  <tr key={c.key}>
                    <td>{c.label}</td>
                    <td>{c.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {restoreData && (
            <button
              className="db-btn db-btn-primary"
              onClick={handleRestore}
              disabled={restoring}
            >
              <FontAwesomeIcon icon={faRotateLeft} />
              {restoring ? 'Restoring…' : 'Restore (Merge)'}
            </button>
          )}

          {/* Result */}
          {restoreResult && (
            <div className="db-restore-result">
              <div className="db-restore-result-header">
                <FontAwesomeIcon icon={faCircleCheck} /> Restore Complete
              </div>
              <table>
                <tbody>
                  {Object.entries(restoreResult).map(([key, r]) => (
                    <tr key={key}>
                      <td>{COLLECTION_LABELS[key] || key}</td>
                      <td style={{ color: '#059669' }}>{r.inserted} inserted</td>
                      <td style={{ color: '#94a3b8' }}>{r.skipped} skipped</td>
                      {r.errors > 0 && <td style={{ color: '#ef4444' }}>{r.errors} errors</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Card 5: Collection Wipe ── */}
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-icon red"><FontAwesomeIcon icon={faTriangleExclamation} /></div>
            <div>
              <p className="db-card-title">Collection Wipe</p>
              <p className="db-card-desc">Permanently delete all records in a collection</p>
            </div>
          </div>

          <div className="db-wipe-warning">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span>This action is <strong>irreversible</strong>. All records in the selected collection will be permanently deleted. Create a backup before proceeding.</span>
          </div>

          <div className="db-wipe-row">
            <div>
              <div className="db-field-label">Collection</div>
              <select
                className="db-select"
                value={wipeCollection}
                onChange={e => setWipeCollection(e.target.value)}
              >
                {WIPE_SAFE.map(k => (
                  <option key={k} value={k}>{COLLECTION_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <button
              className="db-btn db-btn-danger"
              style={{ marginBottom: 1, height: 38 }}
              onClick={() => { setShowWipeConfirm(true); setWipeConfirmInput(''); }}
            >
              <FontAwesomeIcon icon={faTrash} /> Wipe Collection
            </button>
          </div>
        </div>

      </div>

      {/* ── Wipe Confirm Modal ── */}
      {showWipeConfirm && (
        <div className="db-confirm-overlay" onClick={() => setShowWipeConfirm(false)}>
          <div className="db-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3><FontAwesomeIcon icon={faTriangleExclamation} /> Confirm Wipe</h3>
            <p>
              You are about to permanently delete <strong>all records</strong> in{' '}
              <strong>{COLLECTION_LABELS[wipeCollection]}</strong>.
              This cannot be undone.
              <br /><br />
              Type <strong>{COLLECTION_LABELS[wipeCollection]}</strong> to confirm:
            </p>
            <input
              className="db-confirm-input"
              type="text"
              placeholder={COLLECTION_LABELS[wipeCollection]}
              value={wipeConfirmInput}
              onChange={e => setWipeConfirmInput(e.target.value)}
              autoFocus
            />
            <div className="db-confirm-actions">
              <button className="db-btn db-btn-secondary" onClick={() => setShowWipeConfirm(false)}>
                Cancel
              </button>
              <button
                className="db-btn db-btn-danger"
                onClick={handleWipe}
                disabled={wiping || wipeConfirmInput !== COLLECTION_LABELS[wipeCollection]}
              >
                {wiping ? 'Wiping…' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
