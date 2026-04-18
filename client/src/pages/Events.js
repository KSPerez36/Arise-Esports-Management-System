import React, { useState, useEffect, useContext } from 'react';
import { FiscalYearContext } from '../context/FiscalYearContext';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarPlus, faEdit, faTrash, faChevronLeft, faChevronRight,
  faCalendarDays, faLocationDot, faAlignLeft, faCalendarCheck,
  faSpinner, faBan, faClipboardList, faHourglass, faLightbulb,
  faArrowRight, faCheck, faCheckDouble, faXmark, faUserCheck, faUsers
} from '@fortawesome/free-solid-svg-icons';
import './Events.css';

const API_URL = 'http://127.0.0.1:8080/api';

const STATUS_META = {
  Planning:  { color: '#8b5cf6', bg: '#f5f3ff', icon: faClipboardList },
  Upcoming:  { color: '#3366FF', bg: '#eff6ff', icon: faHourglass },
  Ongoing:   { color: '#059669', bg: '#ecfdf5', icon: faSpinner },
  Completed: { color: '#6b7280', bg: '#f9fafb', icon: faCalendarCheck },
  Cancelled: { color: '#ef4444', bg: '#fef2f2', icon: faBan },
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const emptyForm = { title: '', date: '', venue: '', description: '', status: 'Planning' };

// Returns today if today falls within the academic year, otherwise the start of that year
function smartDate(academicYear) {
  const [startYr] = academicYear.split('-').map(Number);
  const now = new Date();
  const start = new Date(startYr, 7, 1); // Aug 1
  const end   = new Date(startYr + 1, 7, 1);
  const d = (now >= start && now < end) ? now : start;
  return d.toISOString().split('T')[0];
}

const Events = () => {
  const { academicYear } = useContext(FiscalYearContext);
  const { user } = useContext(AuthContext);
  const canMarkAttendance = ['Admin', 'President', 'Secretary'].includes(user?.role);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedDay, setSelectedDay] = useState(null);

  // Attendance modal state
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [attSearch, setAttSearch] = useState('');
  const [attLoading, setAttLoading] = useState(false);

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => { fetchEvents(); fetchSuggestions(); }, [academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_URL}/events?academicYear=${academicYear}`);
      setEvents(res.data);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await axios.get(`${API_URL}/ai/status-suggestions`);
      setSuggestions(res.data);
      setShowSuggestions(res.data.length > 0);
    } catch {
      // silently ignore
    }
  };

  const applySuggestion = async (suggestion) => {
    try {
      await axios.put(`${API_URL}/events/${suggestion._id}`, { status: suggestion.suggestedStatus });
      setSuggestions(prev => prev.filter(s => s._id !== suggestion._id));
      fetchEvents();
      showMessage('success', `"${suggestion.title}" updated to ${suggestion.suggestedStatus}.`);
    } catch {
      showMessage('error', 'Failed to apply suggestion.');
    }
  };

  const applyAllSuggestions = async () => {
    try {
      await Promise.all(
        suggestions.map(s => axios.put(`${API_URL}/events/${s._id}`, { status: s.suggestedStatus }))
      );
      setSuggestions([]);
      setShowSuggestions(false);
      fetchEvents();
      showMessage('success', 'All status suggestions applied.');
    } catch {
      showMessage('error', 'Failed to apply some suggestions.');
    }
  };

  const showMessage = (type, text) => showToast(type, text);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEvent) {
        await axios.put(`${API_URL}/events/${selectedEvent._id}`, formData);
        showMessage('success', 'Event updated successfully.');
      } else {
        await axios.post(`${API_URL}/events`, formData);
        showMessage('success', 'Event created successfully.');
      }
      fetchEvents();
      setShowModal(false);
      setFormData(emptyForm);
      setSelectedEvent(null);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Operation failed.');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/events/${selectedEvent._id}`);
      showMessage('success', 'Event deleted.');
      fetchEvents();
      setShowDeleteModal(false);
      setSelectedEvent(null);
    } catch (err) {
      showMessage('error', 'Failed to delete event.');
    }
  };

  const openAttendanceModal = async (ev) => {
    setAttendanceEvent(ev);
    setAttSearch('');
    setAttLoading(true);
    setShowAttendanceModal(true);
    try {
      const res = await axios.get(`${API_URL}/members?status=Official Member&academicYear=${academicYear}`);
      setAllMembers(res.data);
      // Pre-check saved attendees
      const saved = new Set((ev.attendees || []).map(id => String(id)));
      setCheckedIds(saved);
    } catch {
      showMessage('error', 'Failed to load members.');
    } finally {
      setAttLoading(false);
    }
  };

  const toggleMember = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const saveAttendance = async () => {
    try {
      const res = await axios.put(`${API_URL}/events/${attendanceEvent._id}/attendance`, {
        attendeeIds: [...checkedIds],
      });
      // Update local event attendees so re-opening shows correct state
      setEvents(prev => prev.map(ev =>
        ev._id === attendanceEvent._id ? { ...ev, attendees: [...checkedIds] } : ev
      ));
      showMessage('success', `Attendance saved — ${res.data.attendeeCount} members present.`);
      setShowAttendanceModal(false);
    } catch {
      showMessage('error', 'Failed to save attendance.');
    }
  };

  const openAddModal = () => {
    setSelectedEvent(null);
    setFormData({ ...emptyForm, date: smartDate(academicYear) });
    setShowModal(true);
  };

  const openEditModal = (ev) => {
    setSelectedEvent(ev);
    setFormData({
      title: ev.title,
      date: ev.date.slice(0, 10),
      venue: ev.venue,
      description: ev.description || '',
      status: ev.status,
    });
    setShowModal(true);
  };

  const openDeleteModal = (ev) => {
    setSelectedEvent(ev);
    setShowDeleteModal(true);
  };

  // Calendar helpers
  const daysInMonth  = (m, y) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (m, y) => new Date(y, m, 1).getDay();

  const eventsByDay = {};
  events.forEach(ev => {
    const d = new Date(ev.date);
    if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const eventsOnDay = (day) =>
    events.filter(ev => {
      const d = new Date(ev.date);
      return d.getDate() === day && d.getMonth() === calMonth && d.getFullYear() === calYear;
    });

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Stats
  const stats = Object.keys(STATUS_META).map(s => ({
    label: s,
    count: events.filter(ev => ev.status === s).length,
    ...STATUS_META[s],
  }));

  // Filtered list
  let displayedEvents = [...events];
  if (selectedDay !== null) {
    displayedEvents = eventsOnDay(selectedDay);
  } else if (filterStatus !== 'All') {
    displayedEvents = events.filter(ev => ev.status === filterStatus);
  }

  if (loading) {
    return (
      <div className="events-loading">
        <FontAwesomeIcon icon={faCalendarDays} className="events-loading-icon" />
        <p>Loading events...</p>
      </div>
    );
  }

  const totalDays = daysInMonth(calMonth, calYear);
  const startPad  = firstDayOfMonth(calMonth, calYear);

  return (
    <div className="events-page">

      {/* ── Page Header ── */}
      <div className="events-page-header">
        <div className="events-page-title-group">
          <h1 className="events-page-title">Event Coordination</h1>
          <p className="events-page-sub">Plan, track, and manage your organization's yearly calendar of events</p>
        </div>
        <button className="ev-add-btn" onClick={openAddModal}>
          <FontAwesomeIcon icon={faCalendarPlus} />
          <span>Add Event</span>
        </button>
      </div>

      {/* ── Smart Status Suggestions Banner ── */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="ev-suggestions-banner">
          <div className="ev-suggestions-header">
            <div className="ev-suggestions-title">
              <FontAwesomeIcon icon={faLightbulb} className="ev-suggestions-icon" />
              <span>Smart Status Updates — {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available</span>
            </div>
            <div className="ev-suggestions-actions">
              <button className="ev-apply-all-btn" onClick={applyAllSuggestions}>
                <FontAwesomeIcon icon={faCheckDouble} /> Apply All
              </button>
              <button className="ev-dismiss-btn" onClick={() => setShowSuggestions(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>
          <div className="ev-suggestions-list">
            {suggestions.map(s => (
              <div key={s._id} className="ev-suggestion-row">
                <span className="ev-suggestion-title">{s.title}</span>
                <span className="ev-suggestion-change">
                  <span className="ev-suggestion-from" style={{ color: STATUS_META[s.currentStatus]?.color }}>{s.currentStatus}</span>
                  <FontAwesomeIcon icon={faArrowRight} className="ev-suggestion-arrow" />
                  <span className="ev-suggestion-to" style={{ color: STATUS_META[s.suggestedStatus]?.color }}>{s.suggestedStatus}</span>
                </span>
                <button className="ev-apply-btn" onClick={() => applySuggestion(s)}>
                  <FontAwesomeIcon icon={faCheck} /> Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="ev-stats-row">
        <div className="ev-stat-card ev-stat-total">
          <div className="ev-stat-num">{events.length}</div>
          <div className="ev-stat-label">Total Events</div>
        </div>
        {stats.map(s => (
          <div key={s.label} className="ev-stat-card" style={{ borderTopColor: s.color }}>
            <div className="ev-stat-icon" style={{ background: s.bg, color: s.color }}>
              <FontAwesomeIcon icon={s.icon} />
            </div>
            <div>
              <div className="ev-stat-num" style={{ color: s.color }}>{s.count}</div>
              <div className="ev-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div className="events-layout">

        {/* ── Calendar ── */}
        <div className="ev-calendar-card">
          <div className="cal-header">
            <button className="cal-nav-btn" onClick={prevMonth}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="cal-month-label">
              <span className="cal-month-name">{MONTH_NAMES[calMonth]}</span>
              <span className="cal-year">{calYear}</span>
            </div>
            <button className="cal-nav-btn" onClick={nextMonth}>
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <div className="cal-grid">
            {DAY_NAMES.map(d => (
              <div key={d} className="cal-day-name">{d}</div>
            ))}
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="cal-cell cal-cell-empty" />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
              const dayEvents = eventsByDay[day] || [];
              const isSelected = selectedDay === day;
              const firstStatus = dayEvents[0]?.status;
              return (
                <div
                  key={day}
                  className={`cal-cell ${isToday ? 'cal-today' : ''} ${dayEvents.length > 0 ? 'cal-has-event' : ''} ${isSelected ? 'cal-selected' : ''}`}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  title={dayEvents.map(e => e.title).join(', ')}
                >
                  <span className="cal-day-num">{day}</span>
                  {dayEvents.length > 0 && (
                    <span
                      className="cal-dot"
                      style={{ background: isSelected ? '#fff' : (STATUS_META[firstStatus]?.color || '#3366FF') }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="cal-legend">
            {Object.entries(STATUS_META).map(([label, meta]) => (
              <div key={label} className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: meta.color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Events List ── */}
        <div className="ev-list-panel">
          <div className="ev-list-toolbar">
            <div className="ev-list-title-group">
              <h2 className="ev-list-title">
                {selectedDay
                  ? `${MONTH_NAMES[calMonth]} ${selectedDay}, ${calYear}`
                  : 'All Events'}
              </h2>
              <span className="ev-count-chip">{displayedEvents.length} event{displayedEvents.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="ev-toolbar-right">
              {selectedDay ? (
                <button className="ev-clear-btn" onClick={() => setSelectedDay(null)}>
                  ← Back to all
                </button>
              ) : (
                <div className="ev-filter-pills">
                  {['All', ...Object.keys(STATUS_META)].map(s => (
                    <button
                      key={s}
                      className={`ev-pill ${filterStatus === s ? 'ev-pill-active' : ''}`}
                      style={filterStatus === s && s !== 'All' ? {
                        background: STATUS_META[s].bg,
                        color: STATUS_META[s].color,
                        borderColor: STATUS_META[s].color,
                      } : {}}
                      onClick={() => setFilterStatus(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ev-list">
            {displayedEvents.length === 0 ? (
              <div className="ev-empty">
                <div className="ev-empty-icon-wrap">
                  <FontAwesomeIcon icon={faCalendarDays} />
                </div>
                <h3>No events found</h3>
                <p>{selectedDay ? 'No events are scheduled for this day.' : 'Start by adding your first event.'}</p>
                {!selectedDay && (
                  <button className="ev-add-btn ev-add-btn-sm" onClick={openAddModal}>
                    <FontAwesomeIcon icon={faCalendarPlus} /> Add Event
                  </button>
                )}
              </div>
            ) : (
              displayedEvents.map(event => {
                const d = new Date(event.date);
                const meta = STATUS_META[event.status];
                return (
                  <div key={event._id} className="ev-item">
                    <div className="ev-item-date" style={{ background: meta.bg, borderColor: meta.color + '33' }}>
                      <span className="ev-item-day" style={{ color: meta.color }}>{d.getDate()}</span>
                      <span className="ev-item-mon">{MONTH_NAMES[d.getMonth()].slice(0, 3).toUpperCase()}</span>
                      <span className="ev-item-yr">{d.getFullYear()}</span>
                    </div>

                    <div className="ev-item-body">
                      <div className="ev-item-top">
                        <h4 className="ev-item-title">{event.title}</h4>
                        <span
                          className="ev-status-pill"
                          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}
                        >
                          <FontAwesomeIcon icon={meta.icon} />
                          {event.status}
                        </span>
                      </div>
                      <div className="ev-item-venue">
                        <FontAwesomeIcon icon={faLocationDot} />
                        {event.venue}
                      </div>
                      {event.description && (
                        <div className="ev-item-desc">
                          <FontAwesomeIcon icon={faAlignLeft} />
                          {event.description}
                        </div>
                      )}
                    </div>

                    <div className="ev-item-actions">
                      {canMarkAttendance && ['Completed', 'Ongoing'].includes(event.status) && (
                        <button
                          className="ev-action-btn ev-action-attendance"
                          onClick={() => openAttendanceModal(event)}
                          title={`Attendance${event.attendees?.length ? ` (${event.attendees.length})` : ''}`}
                        >
                          <FontAwesomeIcon icon={faUserCheck} />
                          {event.attendees?.length > 0 && (
                            <span className="ev-att-count">{event.attendees.length}</span>
                          )}
                        </button>
                      )}
                      <button className="ev-action-btn ev-action-edit" onClick={() => openEditModal(event)} title="Edit">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="ev-action-btn ev-action-delete" onClick={() => openDeleteModal(event)} title="Delete">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="ev-overlay" onClick={() => setShowModal(false)}>
          <div className="ev-modal" onClick={e => e.stopPropagation()}>
            <div className="ev-modal-top">
              <div className="ev-modal-title-group">
                <div className="ev-modal-icon">
                  <FontAwesomeIcon icon={faCalendarDays} />
                </div>
                <div>
                  <h2>{selectedEvent ? 'Edit Event' : 'New Event'}</h2>
                  <p>{selectedEvent ? 'Update the event details below.' : 'Fill in the details for your new event.'}</p>
                </div>
              </div>
              <button className="ev-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="ev-form">
              <div className="ev-form-group">
                <label>Event Name <span className="ev-required">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Intramurals 2026"
                  required
                />
              </div>

              <div className="ev-form-row">
                <div className="ev-form-group">
                  <label>Date <span className="ev-required">*</span></label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="ev-form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    {Object.keys(STATUS_META).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ev-form-group">
                <label>Venue <span className="ev-required">*</span></label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={e => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="e.g. University Gymnasium"
                  required
                />
              </div>

              <div className="ev-form-group">
                <label>Description / Notes</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional agenda, details, or remarks..."
                />
              </div>

              <div className="ev-form-actions">
                <button type="submit" className="ev-submit-btn">
                  {selectedEvent ? 'Save Changes' : 'Create Event'}
                </button>
                <button type="button" className="ev-cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Attendance Modal ── */}
      {showAttendanceModal && (
        <div className="ev-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="ev-modal ev-modal-attendance" onClick={e => e.stopPropagation()}>
            <div className="ev-modal-top">
              <div className="ev-modal-title-group">
                <div className="ev-modal-icon">
                  <FontAwesomeIcon icon={faUserCheck} />
                </div>
                <div>
                  <h2>Attendance</h2>
                  <p>{attendanceEvent?.title} — <strong>{checkedIds.size}</strong> of {allMembers.length} present</p>
                </div>
              </div>
              <button className="ev-modal-close" onClick={() => setShowAttendanceModal(false)}>×</button>
            </div>

            <div className="ev-att-search-wrap">
              <input
                type="text"
                className="ev-att-search"
                placeholder="Search by name or student ID..."
                value={attSearch}
                onChange={e => setAttSearch(e.target.value)}
              />
            </div>

            {attLoading ? (
              <div className="ev-att-loading"><FontAwesomeIcon icon={faSpinner} spin /> Loading members...</div>
            ) : allMembers.length === 0 ? (
              <div className="ev-att-empty">
                <FontAwesomeIcon icon={faUsers} />
                <p>No official members found for {academicYear}.</p>
              </div>
            ) : (
              <div className="ev-att-list">
                {allMembers
                  .filter(m => {
                    const q = attSearch.toLowerCase();
                    return !q ||
                      m.firstName.toLowerCase().includes(q) ||
                      m.lastName.toLowerCase().includes(q) ||
                      m.studentId.toLowerCase().includes(q);
                  })
                  .map(m => (
                    <label key={m._id} className={`ev-att-row${checkedIds.has(m._id) ? ' ev-att-row-checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checkedIds.has(m._id)}
                        onChange={() => toggleMember(m._id)}
                      />
                      <span className="ev-att-name">{m.lastName}, {m.firstName}</span>
                      <span className="ev-att-id">{m.studentId}</span>
                      <span className="ev-att-meta">{m.yearLevel}</span>
                    </label>
                  ))
                }
              </div>
            )}

            <div className="ev-form-actions">
              <button className="ev-submit-btn" onClick={saveAttendance} disabled={attLoading}>
                <FontAwesomeIcon icon={faCheck} /> Save Attendance
              </button>
              <button className="ev-cancel-btn" onClick={() => setShowAttendanceModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="ev-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="ev-modal ev-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="ev-delete-icon-wrap">
              <FontAwesomeIcon icon={faTrash} />
            </div>
            <h2 className="ev-delete-title">Delete Event?</h2>
            <p className="ev-delete-msg">
              <strong>{selectedEvent?.title}</strong> will be permanently removed. This action cannot be undone.
            </p>
            <div className="ev-form-actions ev-form-actions-center">
              <button className="ev-danger-btn" onClick={handleDelete}>Yes, Delete</button>
              <button className="ev-cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;