import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FiscalYearContext } from '../context/FiscalYearContext';
import { useToast } from '../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faListCheck, faPlus, faTableColumns, faList,
  faPenToSquare, faTrash, faCircleCheck, faFlag,
  faCalendarDay, faUserCircle, faFilter, faBullseye,
} from '@fortawesome/free-solid-svg-icons';
import './Tasks.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8080/api';

const STATUSES = ['To Do', 'In Progress', 'Under Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const PRIORITY_META = {
  Low:    { color: 'low',    label: 'Low' },
  Medium: { color: 'medium', label: 'Medium' },
  High:   { color: 'high',   label: 'High' },
  Urgent: { color: 'urgent', label: 'Urgent' },
};

const STATUS_META = {
  'To Do':        { color: 'todo' },
  'In Progress':  { color: 'inprogress' },
  'Under Review': { color: 'review' },
  'Done':         { color: 'done' },
};

const emptyForm = {
  title: '', description: '', priority: 'Medium',
  status: 'To Do', assignedTo: '', dueDate: '',
};

const formatDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isOverdue = (task) => {
  if (!task.dueDate || task.status === 'Done') return false;
  return new Date(task.dueDate) < new Date();
};

const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

const Tasks = () => {
  const { user } = useContext(AuthContext);
  const { academicYear } = useContext(FiscalYearContext);
  const { showToast } = useToast();

  const isManager = ['Admin', 'President'].includes(user?.role);

  const [tasks, setTasks]         = useState([]);
  const [officers, setOfficers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [viewMode, setViewMode]   = useState('board'); // 'board' | 'list'
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  // Filters (for list view / board filter)
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const [editTask, setEditTask]     = useState(null);
  const [formData, setFormData]     = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = { academicYear };
      if (filterStatus)   params.status   = filterStatus;
      if (filterPriority) params.priority  = filterPriority;
      if (filterAssignee) params.assignedTo = filterAssignee;
      const res = await axios.get(`${API_URL}/tasks`, { params });
      setTasks(res.data);
    } catch {
      showToast('error', 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }, [academicYear, filterStatus, filterPriority, filterAssignee, showToast]);

  const fetchOfficers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/officer-directory`, {
        params: { academicYear },
      });
      setOfficers(res.data);
    } catch {
      // silently fail — officers list is optional enhancement
    }
  }, [academicYear]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (isManager) fetchOfficers(); }, [isManager, fetchOfficers]);

  // ── Derived task list ────────────────────────────────────────────────────────
  const displayedTasks = myTasksOnly
    ? tasks.filter(t => t.assignedTo?._id === user?._id || t.assignedTo?._id?.toString() === user?._id?.toString())
    : tasks;

  const tasksByStatus = (status) => displayedTasks.filter(t => t.status === status);

  // ── Modal helpers ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTask(null);
    setFormData({ ...emptyForm, academicYear });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setFormData({
      title:       task.title,
      description: task.description || '',
      priority:    task.priority,
      status:      task.status,
      assignedTo:  task.assignedTo?._id || '',
      dueDate:     task.dueDate ? task.dueDate.slice(0, 10) : '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditTask(null); };

  const handleChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return showToast('warning', 'Title is required.');
    if (isManager && !formData.assignedTo) return showToast('warning', 'Please select an assignee.');
    setSaving(true);
    try {
      const payload = { ...formData, academicYear };
      if (editTask) {
        await axios.put(`${API_URL}/tasks/${editTask._id}`, payload);
        showToast('success', 'Task updated.');
      } else {
        await axios.post(`${API_URL}/tasks`, payload);
        showToast('success', 'Task created.');
      }
      closeModal();
      fetchTasks();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  // Quick status update (for non-managers or kanban drag-less update)
  const quickStatus = async (task, status) => {
    try {
      await axios.put(`${API_URL}/tasks/${task._id}`, { status });
      fetchTasks();
    } catch {
      showToast('error', 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/tasks/${deleteTarget._id}`);
      showToast('success', 'Task deleted.');
      setDeleteTarget(null);
      fetchTasks();
    } catch {
      showToast('error', 'Failed to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Task Card ────────────────────────────────────────────────────────────────
  const TaskCard = ({ task }) => {
    const overdue = isOverdue(task);
    return (
      <div className={`task-card${overdue ? ' task-overdue' : ''} priority-border-${PRIORITY_META[task.priority]?.color}`}>
        <div className="task-card-top">
          <span className={`task-badge priority-${PRIORITY_META[task.priority]?.color}`}>
            <FontAwesomeIcon icon={faFlag} /> {task.priority}
          </span>
          {overdue && <span className="task-badge task-badge-overdue">Overdue</span>}
          {isManager && (
            <div className="task-card-actions">
              <button className="task-icon-btn" onClick={() => openEdit(task)} title="Edit">
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>
              <button className="task-icon-btn danger" onClick={() => setDeleteTarget(task)} title="Delete">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          )}
        </div>

        <p className="task-card-title" onClick={() => openEdit(task)}>{task.title}</p>

        {task.description && (
          <p className="task-card-desc">{task.description}</p>
        )}

        <div className="task-card-meta">
          <div className="task-assignee">
            <div className="task-avatar">{getInitials(task.assignedTo?.name)}</div>
            <div>
              <span className="task-assignee-name">{task.assignedTo?.name || '—'}</span>
              <span className="task-assignee-role">{task.assignedTo?.position}</span>
            </div>
          </div>

          {task.dueDate && (
            <span className={`task-due${overdue ? ' overdue' : ''}`}>
              <FontAwesomeIcon icon={faCalendarDay} />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Non-manager quick status update */}
        {!isManager && task.status !== 'Done' && (
          <button
            className="task-done-btn"
            onClick={() => quickStatus(task, 'Done')}
          >
            <FontAwesomeIcon icon={faCircleCheck} /> Mark as Done
          </button>
        )}

        {/* Manager: quick next-status button */}
        {isManager && task.status !== 'Done' && (
          <div className="task-status-row">
            {STATUSES.filter(s => s !== task.status).map(s => (
              <button
                key={s}
                className="task-status-chip"
                onClick={() => quickStatus(task, s)}
                title={`Move to ${s}`}
              >
                → {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="tasks-page">

      {/* Header */}
      <div className="tasks-header">
        <div>
          <h1 className="tasks-title">
            <FontAwesomeIcon icon={faListCheck} />
            Task Management
          </h1>
          <p className="tasks-sub">{tasks.length} task{tasks.length !== 1 ? 's' : ''} · {academicYear}</p>
        </div>
        <div className="tasks-header-actions">
          <div className="tasks-view-toggle">
            <button
              className={`view-btn${viewMode === 'board' ? ' active' : ''}`}
              onClick={() => setViewMode('board')}
              title="Board view"
            >
              <FontAwesomeIcon icon={faTableColumns} />
            </button>
            <button
              className={`view-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <FontAwesomeIcon icon={faList} />
            </button>
          </div>
          {isManager && (
            <button className="btn btn-primary tasks-add-btn" onClick={openAdd}>
              <FontAwesomeIcon icon={faPlus} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="tasks-filters">
        <FontAwesomeIcon icon={faFilter} className="tasks-filter-icon" />

        <button
          className={`tasks-my-toggle${myTasksOnly ? ' active' : ''}`}
          onClick={() => setMyTasksOnly(v => !v)}
        >
          <FontAwesomeIcon icon={faUserCircle} /> My Tasks
        </button>

        {isManager && (
          <select
            className="tasks-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <select
          className="tasks-select"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {isManager && (
          <select
            className="tasks-select"
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
          >
            <option value="">All Assignees</option>
            {officers.map(o => (
              <option key={o._id} value={o._id}>{o.name} — {o.position}</option>
            ))}
          </select>
        )}

        {(filterStatus || filterPriority || filterAssignee || myTasksOnly) && (
          <button className="tasks-clear" onClick={() => {
            setFilterStatus(''); setFilterPriority('');
            setFilterAssignee(''); setMyTasksOnly(false);
          }}>
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="tasks-loading">Loading tasks...</div>
      ) : viewMode === 'board' ? (

        /* ── Board View ── */
        <div className="task-board">
          {STATUSES.map(status => (
            <div key={status} className="task-column">
              <div className={`task-column-header status-header-${STATUS_META[status].color}`}>
                <span className="task-column-title">{status}</span>
                <span className="task-column-count">{tasksByStatus(status).length}</span>
              </div>
              <div className="task-column-body">
                {tasksByStatus(status).length === 0 ? (
                  <div className="task-column-empty">No tasks</div>
                ) : (
                  tasksByStatus(status).map(task => (
                    <TaskCard key={task._id} task={task} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* ── List View ── */
        <div className="task-list">
          {displayedTasks.length === 0 ? (
            <div className="tasks-empty">
              <FontAwesomeIcon icon={faListCheck} />
              <p>No tasks found.</p>
            </div>
          ) : (
            displayedTasks.map(task => {
              const overdue = isOverdue(task);
              return (
                <div
                  key={task._id}
                  className={`task-list-row${overdue ? ' task-overdue' : ''} priority-border-${PRIORITY_META[task.priority]?.color}`}
                >
                  <div className="task-list-left">
                    <span className={`task-badge priority-${PRIORITY_META[task.priority]?.color}`}>
                      <FontAwesomeIcon icon={faBullseye} /> {task.priority}
                    </span>
                    <span className={`task-badge status-${STATUS_META[task.status]?.color}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="task-list-main">
                    <p className="task-list-title">{task.title}</p>
                    {task.description && <p className="task-list-desc">{task.description}</p>}
                  </div>
                  <div className="task-list-right">
                    <div className="task-assignee">
                      <div className="task-avatar">{getInitials(task.assignedTo?.name)}</div>
                      <div>
                        <span className="task-assignee-name">{task.assignedTo?.name || '—'}</span>
                        <span className="task-assignee-role">{task.assignedTo?.position}</span>
                      </div>
                    </div>
                    {task.dueDate && (
                      <span className={`task-due${overdue ? ' overdue' : ''}`}>
                        <FontAwesomeIcon icon={faCalendarDay} />
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                    {isManager && (
                      <div className="task-card-actions">
                        <button className="task-icon-btn" onClick={() => openEdit(task)} title="Edit">
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button className="task-icon-btn danger" onClick={() => setDeleteTarget(task)} title="Delete">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="task-modal-overlay" onClick={closeModal}>
          <div className="task-modal" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h2>{editTask ? 'Edit Task' : 'New Task'}</h2>
              <button className="task-modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="task-modal-body">

              <div className="task-form-group">
                <label>Title <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Task title"
                  disabled={!isManager}
                  required
                />
              </div>

              <div className="task-form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Optional details..."
                  rows={3}
                  disabled={!isManager}
                />
              </div>

              {isManager && (
                <div className="task-form-group">
                  <label>Assignee <span className="required">*</span></label>
                  <select
                    value={formData.assignedTo}
                    onChange={e => handleChange('assignedTo', e.target.value)}
                    required
                  >
                    <option value="">Select an officer...</option>
                    {officers.map(o => (
                      <option key={o._id} value={o._id}>
                        {o.name} — {o.position}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="task-form-row">
                <div className="task-form-group">
                  <label>Priority</label>
                  <div className="task-pill-group">
                    {PRIORITIES.map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`task-pill priority-pill-${PRIORITY_META[p].color}${formData.priority === p ? ' active' : ''}`}
                        onClick={() => isManager && handleChange('priority', p)}
                        disabled={!isManager}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="task-form-group">
                  <label>Status</label>
                  <div className="task-pill-group">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`task-pill status-pill-${STATUS_META[s].color}${formData.status === s ? ' active' : ''}`}
                        onClick={() => handleChange('status', s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isManager && (
                <div className="task-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => handleChange('dueDate', e.target.value)}
                  />
                </div>
              )}

              <div className="task-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="task-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="task-modal task-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h2>Delete Task</h2>
              <button className="task-modal-close" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="task-modal-body">
              <p>Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>? This cannot be undone.</p>
            </div>
            <div className="task-modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Tasks;