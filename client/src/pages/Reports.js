import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { FiscalYearContext } from '../context/FiscalYearContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileAlt, faUsers, faCalendarDays, faWallet, faClipboardList,
  faFileCsv, faFilePdf, faPlus, faEdit, faTrash, faSpinner,
  faFileLines, faTableList,
} from '@fortawesome/free-solid-svg-icons';
import './Reports.css';

const API_URL = 'http://127.0.0.1:8080/api';

const STATUS_META = {
  Planning:  { color: '#8b5cf6', bg: '#f5f3ff' },
  Upcoming:  { color: '#3366FF', bg: '#eff6ff' },
  Ongoing:   { color: '#059669', bg: '#ecfdf5' },
  Completed: { color: '#6b7280', bg: '#f9fafb' },
  Cancelled: { color: '#ef4444', bg: '#fef2f2' },
};

const fmt = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const todayStr = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const emptyMinuteForm = {
  title: '', eventDetails: '', date: '', timeStarted: '', timeEnded: '', venue: '',
  agendaItems: [''],
  meetingDetails: [{ agendaTitle: '', toDoItems: [''], toNoteItems: [{ title: '', bullets: [''] }] }],
  additionalNotes: [''],
  attendance: [{ name: '', status: 'Present' }],
};

// ── PDF Helpers ────────────────────────────────────────────────────────────────

function pdfHeader(doc, title) {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ARISE ESPORTS', 14, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 26);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${todayStr()}`, 14, 32);
  doc.setTextColor(0, 0, 0);
  return 40;
}

function exportMembersPDF(members, stats) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = pdfHeader(doc, 'Member Report');
  doc.setFontSize(9);
  doc.text(`Total: ${stats.total}   Paid: ${stats.paid}   Unpaid: ${stats.unpaid}`, 14, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [['Student ID', 'Name', 'Course', 'Year Level', 'Status', 'Payment']],
    body: members.map(m => [
      m.studentId,
      `${m.lastName}, ${m.firstName}`,
      m.course,
      m.yearLevel,
      m.status,
      m.hasPaid ? 'Paid' : 'Unpaid',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 102, 255] },
  });
  doc.save(`members_report_${Date.now()}.pdf`);
}

function exportEventsPDF(events, stats) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = pdfHeader(doc, 'Event Report');
  doc.setFontSize(9);
  const statusLine = Object.entries(stats.byStatus || {}).map(([k, v]) => `${k}: ${v}`).join('   ');
  doc.text(`Total: ${stats.total}   ${statusLine}`, 14, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    head: [['Title', 'Date', 'Venue', 'Status']],
    body: events.map(e => [e.title, fmtDate(e.date), e.venue || '—', e.status]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 102, 255] },
  });
  doc.save(`events_report_${Date.now()}.pdf`);
}

function exportFinancePDF(summary, budgets, transactions) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = pdfHeader(doc, 'Financial Report');
  doc.setFontSize(9);
  doc.text(`Total Budget: ${fmt(summary.totalBudget)}   Income: ${fmt(summary.totalIncome)}   Expenses: ${fmt(summary.totalExpense)}   Balance: ${fmt(summary.balance)}`, 14, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Budgets', 14, y);
  doc.setFont('helvetica', 'normal');
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [['Title', 'Academic Year', 'Total Amount', 'Notes']],
    body: budgets.map(b => [b.title, b.academicYear, fmt(b.totalAmount), b.notes || '—']),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 102, 255] },
  });
  const afterBudgets = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Transactions', 14, afterBudgets);
  doc.setFont('helvetica', 'normal');
  autoTable(doc, {
    startY: afterBudgets + 4,
    head: [['Date', 'Description', 'Type', 'Category', 'Amount']],
    body: transactions.map(t => [fmtDate(t.date), t.description || '—', t.type, t.category, fmt(t.amount)]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 102, 255] },
  });
  doc.save(`finance_report_${Date.now()}.pdf`);
}

function exportMinutePDF(minute) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const indent1 = margin + 8;
  const indent2 = margin + 14;
  const contentW = pageW - margin * 2;
  const contentW1 = pageW - indent1 - margin;
  const contentW2 = pageW - indent2 - margin;
  let y = 18;

  const checkPage = (needed = 6) => { if (y + needed > 272) { doc.addPage(); y = 18; } };
  const writeLine = (text, x, w, opts = {}) => {
    const lines = doc.splitTextToSize(text, w || contentW);
    lines.forEach(line => { checkPage(); doc.text(line, x, y, opts); y += 5; });
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ARISE ESPORTS', pageW / 2, y, { align: 'center' });
  y += 9;
  doc.setDrawColor(51, 102, 255);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageW - margin, y);
  y += 9;

  // ── Meeting Title ────────────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  writeLine(minute.title || '', margin, contentW);
  y += 2;

  // ── Event Details (italic) ───────────────────────────────────────────────────
  if (minute.eventDetails) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Event Details: ', margin, y);
    const labelW = doc.getTextWidth('Event Details: ');
    doc.setFont('helvetica', 'italic');
    const detailLines = doc.splitTextToSize(minute.eventDetails, contentW - labelW);
    detailLines.forEach((line, idx) => {
      checkPage();
      doc.text(line, idx === 0 ? margin + labelW : margin, y);
      y += 5;
    });
    y += 2;
  }

  // ── Meta info ────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Date: ', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(fmtDate(minute.date), margin + doc.getTextWidth('Date: '), y);
  y += 5;

  if (minute.timeStarted) {
    doc.setFont('helvetica', 'bold');
    doc.text('Time Started: ', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(minute.timeStarted, margin + doc.getTextWidth('Time Started: '), y);
    if (minute.timeEnded) {
      doc.setFont('helvetica', 'bold');
      doc.text('Time Ended: ', pageW / 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(minute.timeEnded, pageW / 2 + doc.getTextWidth('Time Ended: '), y);
    }
    y += 5;
  }

  if (minute.venue) {
    doc.setFont('helvetica', 'bold');
    doc.text('Venue: ', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(minute.venue, margin + doc.getTextWidth('Venue: '), y);
    y += 5;
  }

  y += 4;

  // ── Agenda (list) ────────────────────────────────────────────────────────────
  const agendaItems = minute.agendaItems || [];
  if (agendaItems.length > 0) {
    checkPage(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Agenda (list)', margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    agendaItems.forEach((item, i) => {
      checkPage();
      writeLine(`${i + 1}. ${item}`, indent1, contentW1);
    });
    y += 4;
  }

  // ── Meeting Details ──────────────────────────────────────────────────────────
  const meetingDetails = minute.meetingDetails || [];
  if (meetingDetails.some(d => d.toDoItems?.length || d.toNoteItems?.length)) {
    checkPage(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Meeting Details', margin, y);
    y += 7;

    meetingDetails.forEach((detail, i) => {
      checkPage(10);
      // Agenda sub-header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bolditalic');
      writeLine(`Agenda ${i + 1}:  ${detail.agendaTitle || ''}`, margin, contentW);
      y += 2;

      // To Do
      const todos = (detail.toDoItems || []).filter(Boolean);
      if (todos.length > 0) {
        checkPage(6);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('To do:', indent1, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        todos.forEach((item, j) => {
          checkPage();
          writeLine(`${j + 1}. ${item}`, indent2, contentW2);
        });
        y += 2;
      }

      // To Note
      const notes = (detail.toNoteItems || []).filter(n => n.title || n.bullets?.some(Boolean));
      if (notes.length > 0) {
        checkPage(6);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('To note', indent1, y);
        y += 5;
        notes.forEach((note, j) => {
          checkPage();
          doc.setFont('helvetica', 'bold');
          writeLine(`${j + 1}. ${note.title || ''}`, indent2, contentW2);
          const bullets = (note.bullets || []).filter(Boolean);
          if (bullets.length > 0) {
            doc.setFont('helvetica', 'normal');
            bullets.forEach(b => {
              checkPage();
              writeLine(`\u2022 ${b}`, indent2 + 4, contentW2 - 4);
            });
          }
        });
        y += 2;
      }

      y += 3;
    });
  }

  // ── Additional Notes ─────────────────────────────────────────────────────────
  const addNotes = (minute.additionalNotes || []).filter(Boolean);
  if (addNotes.length > 0) {
    checkPage(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Additional Notes:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    addNotes.forEach(note => {
      checkPage();
      writeLine(`\u2022 ${note}`, indent1, contentW1);
    });
    y += 4;
  }

  // ── Attendance ───────────────────────────────────────────────────────────────
  const attendance = minute.attendance || [];
  if (attendance.length > 0) {
    checkPage(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Attendance:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    attendance.forEach(a => {
      checkPage();
      doc.text(`${a.name} \u2013 ${a.status}`, margin, y);
      y += 5;
    });
  }

  doc.save(`minutes_${(minute.title || 'meeting').replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

function exportAttendancePDF(event, members) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ARISE ESPORTS', pageW / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(12);
  doc.text('ATTENDANCE SHEET', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setDrawColor(51, 102, 255);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Event: ${event.title}`, margin, y);
  y += 5;
  doc.text(`Date: ${fmtDate(event.date)}`, margin, y);
  doc.text(`Venue: ${event.venue || '—'}`, pageW / 2, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [['No.', 'Student ID', 'Full Name', 'Course', 'Year Level', 'Signature']],
    body: members.map((m, i) => [
      i + 1,
      m.studentId,
      `${m.lastName}, ${m.firstName}`,
      m.course,
      m.yearLevel,
      '',
    ]),
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 28 },
      2: { cellWidth: 52 },
      3: { cellWidth: 38 },
      4: { cellWidth: 20 },
      5: { cellWidth: 34 },
    },
    styles: { fontSize: 8, cellPadding: 4, minCellHeight: 10 },
    headStyles: { fillColor: [51, 102, 255], fontStyle: 'bold' },
  });

  doc.save(`attendance_${event.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

// ── CSV Helper ─────────────────────────────────────────────────────────────────
function downloadCSV(headers, rows, filename) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(f => `"${f ?? ''}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Main Component ─────────────────────────────────────────────────────────────
const Reports = () => {
  const { academicYear } = useContext(FiscalYearContext);
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [memberData, setMemberData] = useState({ stats: {}, members: [] });
  const [eventData, setEventData] = useState({ stats: {}, events: [] });
  const [financeData, setFinanceData] = useState({ summary: {}, budgets: [], transactions: [] });
  const [minutes, setMinutes] = useState([]);

  // Member tab filters
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPayFilter, setMemberPayFilter] = useState('All');

  // Event tab filters
  const [eventStatusFilter, setEventStatusFilter] = useState('All');

  // Finance tab filters
  const [txTypeFilter, setTxTypeFilter] = useState('All');

  // Meeting Minutes modal state
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMinute, setSelectedMinute] = useState(null);
  const [minuteToDelete, setMinuteToDelete] = useState(null);
  const [minuteForm, setMinuteForm] = useState(emptyMinuteForm);

  // Venue sub-state (UI only — minuteForm.venue holds the assembled string)
  const [venueType, setVenueType] = useState('');
  const [venueBuilding, setVenueBuilding] = useState('');
  const [venueRoom, setVenueRoom] = useState('');

  const emptyTimeParts = { hour: '', minute: '00', period: 'AM' };
  const [timeStartedParts, setTimeStartedParts] = useState(emptyTimeParts);
  const [timeEndedParts, setTimeEndedParts] = useState(emptyTimeParts);

  // Attendance tab
  const [selectedEventId, setSelectedEventId] = useState('');

  const loaded = useRef({ members: false, events: false, finances: false, minutes: false });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const fetchMembers = async (year) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/reports/members?academicYear=${year}`);
      setMemberData(res.data);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Failed to load member data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (year) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/reports/events?academicYear=${year}`);
      setEventData(res.data);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Failed to load event data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinances = async (year) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/reports/finances?academicYear=${year}`);
      setFinanceData(res.data);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Failed to load financial data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMinutes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/reports/meeting-minutes`);
      setMinutes(res.data);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Failed to load meeting minutes.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'members' && !loaded.current.members) { loaded.current.members = true; fetchMembers(academicYear); }
    if ((tab === 'events' || tab === 'attendance') && !loaded.current.events) { loaded.current.events = true; fetchEvents(academicYear); }
    if (tab === 'finances' && !loaded.current.finances) { loaded.current.finances = true; fetchFinances(academicYear); }
    if (tab === 'minutes' && !loaded.current.minutes) { loaded.current.minutes = true; fetchMinutes(); }
  };

  // Load initial tab on mount
  useEffect(() => { loaded.current.members = true; fetchMembers(academicYear); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch all loaded tabs when academic year changes
  useEffect(() => {
    loaded.current = { members: false, events: false, finances: false, minutes: false };
    if (activeTab === 'members')    { loaded.current.members  = true; fetchMembers(academicYear); }
    if (activeTab === 'events' || activeTab === 'attendance') { loaded.current.events = true; fetchEvents(academicYear); }
    if (activeTab === 'finances')   { loaded.current.finances = true; fetchFinances(academicYear); }
    if (activeTab === 'minutes')    { loaded.current.minutes  = true; fetchMinutes(); }
  }, [academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Venue helpers ──────────────────────────────────────────────────────────
  const buildVenueString = (type, building, room) => {
    if (type === 'Google Meet') return 'Google Meet';
    if (type === 'School' && building) {
      return room ? `School - ${building}, Room ${room}` : `School - ${building}`;
    }
    return '';
  };

  const parseVenueString = (venue) => {
    if (!venue) return { type: '', building: '', room: '' };
    if (venue === 'Google Meet') return { type: 'Google Meet', building: '', room: '' };
    if (venue.startsWith('School - ')) {
      const rest = venue.slice(9); // e.g. "JMC, Room 101" or "JMC"
      const [building, roomPart] = rest.split(', Room ');
      return { type: 'School', building: building || '', room: roomPart || '' };
    }
    return { type: '', building: '', room: '' };
  };

  const handleVenueType = (type) => {
    setVenueType(type);
    setVenueBuilding('');
    setVenueRoom('');
    setMinuteForm(f => ({ ...f, venue: type === 'Google Meet' ? 'Google Meet' : '' }));
  };

  const handleVenueBuilding = (building) => {
    setVenueBuilding(building);
    setVenueRoom('');
    setMinuteForm(f => ({ ...f, venue: buildVenueString('School', building, '') }));
  };

  const handleVenueRoom = (room) => {
    setVenueRoom(room);
    setMinuteForm(f => ({ ...f, venue: buildVenueString('School', venueBuilding, room) }));
  };

  // ── Time picker helpers ────────────────────────────────────────────────────
  const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];
  const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));

  const buildTimeString = ({ hour, minute, period }) =>
    hour ? `${hour}:${minute} ${period}` : '';

  const parseTimeString = (str) => {
    if (!str) return emptyTimeParts;
    const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return emptyTimeParts;
    return { hour: m[1], minute: m[2], period: m[3].toUpperCase() };
  };

  const updateTimePart = (setter, formKey, parts, field, val) => {
    const next = { ...parts, [field]: val };
    setter(next);
    setMinuteForm(f => ({ ...f, [formKey]: buildTimeString(next) }));
  };

  // ── Meeting Minutes CRUD ───────────────────────────────────────────────────
  const openAddMinute = () => {
    setSelectedMinute(null);
    setMinuteForm(emptyMinuteForm);
    setVenueType('');
    setVenueBuilding('');
    setVenueRoom('');
    setTimeStartedParts(emptyTimeParts);
    setTimeEndedParts(emptyTimeParts);
    setShowMinutesModal(true);
  };

  const openEditMinute = (m) => {
    setSelectedMinute(m);
    const { type, building, room } = parseVenueString(m.venue || '');
    setVenueType(type);
    setVenueBuilding(building);
    setVenueRoom(room);
    setMinuteForm({
      title: m.title || '',
      eventDetails: m.eventDetails || '',
      date: m.date ? m.date.slice(0, 10) : '',
      timeStarted: m.timeStarted || '',
      timeEnded:   m.timeEnded || '',
      venue: m.venue || '',
      agendaItems: m.agendaItems?.length ? m.agendaItems : [''],
      meetingDetails: m.meetingDetails?.length ? m.meetingDetails : [{ agendaTitle: '', toDoItems: [''], toNoteItems: [{ title: '', bullets: [''] }] }],
      additionalNotes: m.additionalNotes?.length ? m.additionalNotes : [''],
      attendance: m.attendance?.length ? m.attendance : [{ name: '', status: 'Present' }],
    });
    setTimeStartedParts(parseTimeString(m.timeStarted));
    setTimeEndedParts(parseTimeString(m.timeEnded));
    setShowMinutesModal(true);
  };

  // ── Minute form mutation helpers ───────────────────────────────────────────
  const addAgendaItem = () => setMinuteForm(f => ({
    ...f,
    agendaItems: [...f.agendaItems, ''],
    meetingDetails: [...f.meetingDetails, { agendaTitle: '', toDoItems: [''], toNoteItems: [{ title: '', bullets: [''] }] }],
  }));
  const removeAgendaItem = (i) => setMinuteForm(f => ({
    ...f,
    agendaItems: f.agendaItems.filter((_, idx) => idx !== i),
    meetingDetails: f.meetingDetails.filter((_, idx) => idx !== i),
  }));
  const updateAgendaItem = (i, val) => setMinuteForm(f => {
    const agendaItems = f.agendaItems.map((a, idx) => idx === i ? val : a);
    const meetingDetails = f.meetingDetails.map((d, idx) => idx === i ? { ...d, agendaTitle: val } : d);
    return { ...f, agendaItems, meetingDetails };
  });

  const updateMD = (i, updater) => setMinuteForm(f => ({
    ...f,
    meetingDetails: f.meetingDetails.map((d, idx) => idx === i ? updater(d) : d),
  }));
  const addToDoItem = (i) => updateMD(i, d => ({ ...d, toDoItems: [...d.toDoItems, ''] }));
  const removeToDoItem = (i, j) => updateMD(i, d => ({ ...d, toDoItems: d.toDoItems.filter((_, idx) => idx !== j) }));
  const updateToDoItem = (i, j, val) => updateMD(i, d => ({ ...d, toDoItems: d.toDoItems.map((t, idx) => idx === j ? val : t) }));
  const addToNoteItem = (i) => updateMD(i, d => ({ ...d, toNoteItems: [...d.toNoteItems, { title: '', bullets: [''] }] }));
  const removeToNoteItem = (i, j) => updateMD(i, d => ({ ...d, toNoteItems: d.toNoteItems.filter((_, idx) => idx !== j) }));
  const updateToNoteTitle = (i, j, val) => updateMD(i, d => ({
    ...d, toNoteItems: d.toNoteItems.map((n, idx) => idx === j ? { ...n, title: val } : n),
  }));
  const addNoteBullet = (i, j) => updateMD(i, d => ({
    ...d, toNoteItems: d.toNoteItems.map((n, idx) => idx === j ? { ...n, bullets: [...n.bullets, ''] } : n),
  }));
  const removeNoteBullet = (i, j, k) => updateMD(i, d => ({
    ...d, toNoteItems: d.toNoteItems.map((n, idx) => idx === j ? { ...n, bullets: n.bullets.filter((_, bidx) => bidx !== k) } : n),
  }));
  const updateNoteBullet = (i, j, k, val) => updateMD(i, d => ({
    ...d, toNoteItems: d.toNoteItems.map((n, idx) => idx === j ? { ...n, bullets: n.bullets.map((b, bidx) => bidx === k ? val : b) } : n),
  }));

  const addAdditionalNote = () => setMinuteForm(f => ({ ...f, additionalNotes: [...f.additionalNotes, ''] }));
  const removeAdditionalNote = (i) => setMinuteForm(f => ({ ...f, additionalNotes: f.additionalNotes.filter((_, idx) => idx !== i) }));
  const updateAdditionalNote = (i, val) => setMinuteForm(f => ({ ...f, additionalNotes: f.additionalNotes.map((n, idx) => idx === i ? val : n) }));

  const addAttendee = () => setMinuteForm(f => ({ ...f, attendance: [...f.attendance, { name: '', status: 'Present' }] }));
  const removeAttendee = (i) => setMinuteForm(f => ({ ...f, attendance: f.attendance.filter((_, idx) => idx !== i) }));
  const updateAttendee = (i, field, val) => setMinuteForm(f => ({
    ...f, attendance: f.attendance.map((a, idx) => idx === i ? { ...a, [field]: val } : a),
  }));

  const handleSaveMinute = async (e) => {
    e.preventDefault();
    try {
      if (selectedMinute) {
        await axios.put(`${API_URL}/reports/meeting-minutes/${selectedMinute._id}`, minuteForm);
        showMessage('success', 'Meeting minutes updated.');
      } else {
        await axios.post(`${API_URL}/reports/meeting-minutes`, minuteForm);
        showMessage('success', 'Meeting minutes saved.');
      }
      setShowMinutesModal(false);
      setSelectedMinute(null);
      fetchMinutes();
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Failed to save meeting minutes.');
    }
  };

  const confirmDeleteMinute = (m) => {
    setMinuteToDelete(m);
    setShowDeleteModal(true);
  };

  const handleDeleteMinute = async () => {
    try {
      await axios.delete(`${API_URL}/reports/meeting-minutes/${minuteToDelete._id}`);
      showMessage('success', 'Meeting minutes deleted.');
      setShowDeleteModal(false);
      setMinuteToDelete(null);
      fetchMinutes();
    } catch (err) {
      showMessage('error', 'Failed to delete meeting minutes.');
    }
  };

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredMembers = memberData.members.filter(m => {
    const matchSearch = !memberSearch ||
      `${m.firstName} ${m.lastName} ${m.studentId}`.toLowerCase().includes(memberSearch.toLowerCase());
    const matchPay = memberPayFilter === 'All' ||
      (memberPayFilter === 'Paid' ? m.hasPaid : !m.hasPaid);
    return matchSearch && matchPay;
  });

  const filteredEvents = eventData.events.filter(e =>
    eventStatusFilter === 'All' || e.status === eventStatusFilter
  );

  const filteredTransactions = financeData.transactions.filter(t =>
    txTypeFilter === 'All' || t.type === txTypeFilter
  );

  const selectedEvent = eventData.events.find(e => e._id === selectedEventId);

  const tabs = [
    { id: 'members',    label: 'Member Report',    icon: faUsers },
    { id: 'events',     label: 'Event Report',     icon: faCalendarDays },
    { id: 'finances',   label: 'Financial Report', icon: faWallet },
    { id: 'minutes',    label: 'Meeting Minutes',  icon: faClipboardList },
    { id: 'attendance', label: 'Attendance Sheet', icon: faTableList },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rep-page">
      {/* ── Page Header ── */}
      <div className="rep-page-header">
        <div>
          <h1 className="rep-page-title">Reports & Documentation</h1>
          <p className="rep-page-sub">Generate reports, export data, and manage meeting records</p>
        </div>
      </div>

      {/* ── Toast ── */}
      {message.text && (
        <div className={`rep-toast rep-toast-${message.type}`}>{message.text}</div>
      )}

      {/* ── Tabs ── */}
      <div className="rep-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`rep-tab${activeTab === t.id ? ' rep-tab-active' : ''}`}
            onClick={() => switchTab(t.id)}
          >
            <FontAwesomeIcon icon={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB: MEMBER REPORT
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'members' && (
        <div>
          {/* Stats */}
          <div className="rep-stats-row">
            <div className="rep-stat-card" style={{ borderTopColor: '#3366FF' }}>
              <div className="rep-stat-icon" style={{ background: '#eff6ff', color: '#3366FF' }}>
                <FontAwesomeIcon icon={faUsers} />
              </div>
              <div>
                <div className="rep-stat-num">{memberData.stats.total ?? '—'}</div>
                <div className="rep-stat-label">Total Members</div>
              </div>
            </div>
            <div className="rep-stat-card" style={{ borderTopColor: '#22c55e' }}>
              <div className="rep-stat-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>
                <FontAwesomeIcon icon={faFileAlt} />
              </div>
              <div>
                <div className="rep-stat-num" style={{ color: '#15803d' }}>{memberData.stats.paid ?? '—'}</div>
                <div className="rep-stat-label">Paid</div>
              </div>
            </div>
            <div className="rep-stat-card" style={{ borderTopColor: '#ef4444' }}>
              <div className="rep-stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                <FontAwesomeIcon icon={faFileAlt} />
              </div>
              <div>
                <div className="rep-stat-num" style={{ color: '#dc2626' }}>{memberData.stats.unpaid ?? '—'}</div>
                <div className="rep-stat-label">Unpaid</div>
              </div>
            </div>
            {memberData.stats.byYearLevel && Object.entries(memberData.stats.byYearLevel).sort().map(([yr, cnt]) => (
              <div key={yr} className="rep-stat-card" style={{ borderTopColor: '#6B2FBF' }}>
                <div className="rep-stat-icon" style={{ background: '#f5f3ff', color: '#6B2FBF' }}>
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <div>
                  <div className="rep-stat-num" style={{ color: '#6B2FBF' }}>{cnt}</div>
                  <div className="rep-stat-label">{yr}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="rep-toolbar">
            <div className="rep-toolbar-left">
              <input
                className="rep-search"
                placeholder="Search by name or ID…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
              <div className="rep-pills">
                {['All', 'Paid', 'Unpaid'].map(f => (
                  <button key={f} className={`rep-pill${memberPayFilter === f ? ' rep-pill-active' : ''}`}
                    onClick={() => setMemberPayFilter(f)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="rep-toolbar-right">
              <button className="rep-export-btn rep-export-csv" onClick={() => {
                downloadCSV(
                  ['Student ID', 'First Name', 'Last Name', 'Email', 'Course', 'Year Level', 'Academic Year', 'Status', 'Paid'],
                  filteredMembers.map(m => [m.studentId, m.firstName, m.lastName, m.email, m.course, m.yearLevel, m.academicYear, m.status, m.hasPaid ? 'Yes' : 'No']),
                  `members_report_${Date.now()}.csv`
                );
              }}>
                <FontAwesomeIcon icon={faFileCsv} /> Export CSV
              </button>
              <button className="rep-export-btn rep-export-pdf" onClick={() => exportMembersPDF(filteredMembers, memberData.stats)}>
                <FontAwesomeIcon icon={faFilePdf} /> Export PDF
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="rep-empty"><FontAwesomeIcon icon={faSpinner} spin /> Loading…</div>
          ) : (
            <div className="rep-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th><th>Name</th><th>Course</th>
                    <th>Year Level</th><th>Status</th><th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr><td colSpan={6} className="rep-empty">No members found.</td></tr>
                  ) : filteredMembers.map(m => (
                    <tr key={m._id}>
                      <td>{m.studentId}</td>
                      <td>{m.lastName}, {m.firstName}</td>
                      <td>{m.course}</td>
                      <td>{m.yearLevel}</td>
                      <td>{m.status}</td>
                      <td>
                        <span className={`rep-badge ${m.hasPaid ? 'rep-paid' : 'rep-unpaid'}`}>
                          {m.hasPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: EVENT REPORT
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'events' && (
        <div>
          {/* Stats */}
          <div className="rep-stats-row">
            <div className="rep-stat-card" style={{ borderTopColor: '#3366FF' }}>
              <div className="rep-stat-icon" style={{ background: '#eff6ff', color: '#3366FF' }}>
                <FontAwesomeIcon icon={faCalendarDays} />
              </div>
              <div>
                <div className="rep-stat-num">{eventData.stats.total ?? '—'}</div>
                <div className="rep-stat-label">Total Events</div>
              </div>
            </div>
            {Object.entries(STATUS_META).map(([status, meta]) => (
              <div key={status} className="rep-stat-card" style={{ borderTopColor: meta.color }}>
                <div className="rep-stat-icon" style={{ background: meta.bg, color: meta.color }}>
                  <FontAwesomeIcon icon={faCalendarDays} />
                </div>
                <div>
                  <div className="rep-stat-num" style={{ color: meta.color }}>
                    {eventData.stats.byStatus?.[status] ?? 0}
                  </div>
                  <div className="rep-stat-label">{status}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="rep-toolbar">
            <div className="rep-toolbar-left">
              <div className="rep-pills">
                {['All', ...Object.keys(STATUS_META)].map(f => (
                  <button key={f} className={`rep-pill${eventStatusFilter === f ? ' rep-pill-active' : ''}`}
                    onClick={() => setEventStatusFilter(f)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="rep-toolbar-right">
              <button className="rep-export-btn rep-export-csv" onClick={() => {
                downloadCSV(
                  ['Title', 'Date', 'Venue', 'Status', 'Description'],
                  filteredEvents.map(e => [e.title, fmtDate(e.date), e.venue || '', e.status, e.description || '']),
                  `events_report_${Date.now()}.csv`
                );
              }}>
                <FontAwesomeIcon icon={faFileCsv} /> Export CSV
              </button>
              <button className="rep-export-btn rep-export-pdf" onClick={() => exportEventsPDF(filteredEvents, eventData.stats)}>
                <FontAwesomeIcon icon={faFilePdf} /> Export PDF
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="rep-empty"><FontAwesomeIcon icon={faSpinner} spin /> Loading…</div>
          ) : (
            <div className="rep-table-wrap">
              <table>
                <thead>
                  <tr><th>Title</th><th>Date</th><th>Venue</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 ? (
                    <tr><td colSpan={4} className="rep-empty">No events found.</td></tr>
                  ) : filteredEvents.map(e => (
                    <tr key={e._id}>
                      <td>{e.title}</td>
                      <td>{fmtDate(e.date)}</td>
                      <td>{e.venue || '—'}</td>
                      <td>
                        <span className="rep-badge" style={{
                          background: STATUS_META[e.status]?.bg || '#f9fafb',
                          color: STATUS_META[e.status]?.color || '#6b7280',
                        }}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: FINANCIAL REPORT
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'finances' && (
        <div className="rep-finance-layout">
          {/* Summary Cards */}
          <div className="rep-stats-row">
            {[
              { label: 'Total Budget', value: fmt(financeData.summary.totalBudget), color: '#3366FF', bg: '#eff6ff' },
              { label: 'Total Income', value: fmt(financeData.summary.totalIncome), color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Total Expenses', value: fmt(financeData.summary.totalExpense), color: '#ef4444', bg: '#fef2f2' },
              { label: 'Net Balance', value: fmt(financeData.summary.balance), color: '#6B2FBF', bg: '#f5f3ff' },
            ].map(c => (
              <div key={c.label} className="rep-stat-card" style={{ borderTopColor: c.color }}>
                <div className="rep-stat-icon" style={{ background: c.bg, color: c.color }}>
                  <FontAwesomeIcon icon={faWallet} />
                </div>
                <div>
                  <div className="rep-stat-num" style={{ color: c.color, fontSize: '1.1rem' }}>{c.value}</div>
                  <div className="rep-stat-label">{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="rep-export-btn rep-export-csv" onClick={() => {
              downloadCSV(
                ['Title', 'Academic Year', 'Total Amount', 'Notes'],
                financeData.budgets.map(b => [b.title, b.academicYear, b.totalAmount, b.notes || '']),
                `budgets_${Date.now()}.csv`
              );
            }}><FontAwesomeIcon icon={faFileCsv} /> Export Budgets CSV</button>
            <button className="rep-export-btn rep-export-csv" onClick={() => {
              downloadCSV(
                ['Date', 'Description', 'Type', 'Category', 'Amount'],
                financeData.transactions.map(t => [fmtDate(t.date), t.description || '', t.type, t.category, t.amount]),
                `transactions_${Date.now()}.csv`
              );
            }}><FontAwesomeIcon icon={faFileCsv} /> Export Transactions CSV</button>
            <button className="rep-export-btn rep-export-pdf" onClick={() => exportFinancePDF(financeData.summary, financeData.budgets, financeData.transactions)}>
              <FontAwesomeIcon icon={faFilePdf} /> Export Full PDF
            </button>
          </div>

          {/* Budgets Table */}
          <div>
            <p className="rep-section-title">Budgets</p>
            {loading ? (
              <div className="rep-empty"><FontAwesomeIcon icon={faSpinner} spin /> Loading…</div>
            ) : (
              <div className="rep-table-wrap">
                <table>
                  <thead>
                    <tr><th>Title</th><th>Academic Year</th><th>Total Amount</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {financeData.budgets.length === 0 ? (
                      <tr><td colSpan={4} className="rep-empty">No budgets found.</td></tr>
                    ) : financeData.budgets.map(b => (
                      <tr key={b._id}>
                        <td>{b.title}</td>
                        <td>{b.academicYear}</td>
                        <td>{fmt(b.totalAmount)}</td>
                        <td>{b.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transactions Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <p className="rep-section-title" style={{ margin: 0 }}>Transactions</p>
              <div className="rep-pills">
                {['All', 'Income', 'Expense'].map(f => (
                  <button key={f} className={`rep-pill${txTypeFilter === f ? ' rep-pill-active' : ''}`}
                    onClick={() => setTxTypeFilter(f)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="rep-table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Type</th><th>Category</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan={5} className="rep-empty">No transactions found.</td></tr>
                  ) : filteredTransactions.map(t => (
                    <tr key={t._id}>
                      <td>{fmtDate(t.date)}</td>
                      <td>{t.description || '—'}</td>
                      <td>
                        <span className={`rep-badge ${t.type === 'Income' ? 'rep-paid' : 'rep-unpaid'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td>{t.category}</td>
                      <td>{fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: MEETING MINUTES
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'minutes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="rep-add-btn" onClick={openAddMinute}>
              <FontAwesomeIcon icon={faPlus} /> Add Meeting Minutes
            </button>
          </div>

          {loading ? (
            <div className="rep-empty"><FontAwesomeIcon icon={faSpinner} spin /> Loading…</div>
          ) : minutes.length === 0 ? (
            <div className="rep-empty">
              <FontAwesomeIcon icon={faFileLines} style={{ fontSize: '2rem', marginBottom: 8, display: 'block', color: '#cbd5e1' }} />
              No meeting minutes yet. Click "Add Meeting Minutes" to create one.
            </div>
          ) : (
            <div className="rep-minutes-list">
              {minutes.map(m => (
                <div key={m._id} className="rep-minute-card">
                  <div className="rep-minute-info">
                    <p className="rep-minute-title">{m.title}</p>
                    <div className="rep-minute-meta">
                      <span>{fmtDate(m.date)}{m.timeStarted ? ` · ${m.timeStarted}${m.timeEnded ? `–${m.timeEnded}` : ''}` : ''}</span>
                      {m.venue && <span>📍 {m.venue}</span>}
                      {(m.agendaItems?.length > 0) && <span>{m.agendaItems.length} agenda item{m.agendaItems.length !== 1 ? 's' : ''}</span>}
                      {(m.attendance?.length > 0) && <span>{m.attendance.filter(a => a.status === 'Present').length} present</span>}
                      {m.preparedBy && <span>Prepared by: {m.preparedBy}</span>}
                    </div>
                  </div>
                  <div className="rep-minute-actions">
                    <button className="rep-action-btn rep-action-btn-edit" onClick={() => openEditMinute(m)}>
                      <FontAwesomeIcon icon={faEdit} /> Edit
                    </button>
                    <button className="rep-action-btn rep-action-btn-pdf" onClick={() => exportMinutePDF(m)}>
                      <FontAwesomeIcon icon={faFilePdf} /> PDF
                    </button>
                    <button className="rep-action-btn rep-action-btn-delete" onClick={() => confirmDeleteMinute(m)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: ATTENDANCE SHEET
      ════════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div className="rep-attendance-panel">
          <h3>Generate Attendance Sheet</h3>
          <p>Select an event to generate a printable PDF attendance sheet with a signature column for all registered members.</p>

          <select
            className="rep-select"
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
          >
            <option value="">— Select an event —</option>
            {eventData.events.map(e => (
              <option key={e._id} value={e._id}>{e.title} ({fmtDate(e.date)})</option>
            ))}
          </select>

          {selectedEventId && memberData.members.length > 0 && (
            <div className="rep-attendance-info">
              {memberData.members.length} member{memberData.members.length !== 1 ? 's' : ''} will appear on the attendance sheet.
            </div>
          )}

          <button
            className="rep-add-btn"
            disabled={!selectedEventId || !selectedEvent}
            style={{ opacity: (!selectedEventId || !selectedEvent) ? 0.5 : 1 }}
            onClick={() => {
              if (selectedEvent && memberData.members.length > 0) {
                exportAttendancePDF(selectedEvent, memberData.members);
              }
            }}
          >
            <FontAwesomeIcon icon={faFilePdf} /> Generate Attendance Sheet PDF
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MEETING MINUTES MODAL (Add / Edit)
      ════════════════════════════════════════════════════════════ */}
      {showMinutesModal && (
        <div className="rep-overlay" onClick={() => setShowMinutesModal(false)}>
          <div className="rep-modal rep-modal-large" onClick={e => e.stopPropagation()}>
            <div className="rep-modal-header">
              <h2 className="rep-modal-title">{selectedMinute ? 'Edit Meeting Minutes' : 'New Meeting Minutes'}</h2>
              <button className="rep-modal-close" onClick={() => setShowMinutesModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveMinute} className="rep-minute-form">

              {/* ── Section 1: Basic Info ── */}
              <div className="rep-form-section">
                <div className="rep-form-row">
                  <div className="rep-form-group">
                    <label>Title *</label>
                    <input required value={minuteForm.title}
                      onChange={e => setMinuteForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. ARISE: SILAKBO 2026" />
                  </div>
                  <div className="rep-form-group">
                    <label>Date *</label>
                    <input type="date" required value={minuteForm.date}
                      onChange={e => setMinuteForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
                <div className="rep-form-row">
                  <div className="rep-form-group">
                    <label>Time Started</label>
                    <div className="rep-time-picker">
                      <select className="rep-time-select"
                        value={timeStartedParts.hour}
                        onChange={e => updateTimePart(setTimeStartedParts, 'timeStarted', timeStartedParts, 'hour', e.target.value)}>
                        <option value="">--</option>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="rep-time-colon">:</span>
                      <select className="rep-time-select"
                        value={timeStartedParts.minute}
                        onChange={e => updateTimePart(setTimeStartedParts, 'timeStarted', timeStartedParts, 'minute', e.target.value)}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <div className="rep-time-period">
                        {['AM','PM'].map(p => (
                          <label key={p} className="rep-radio-label">
                            <input type="radio" name="timeStartedPeriod" value={p}
                              checked={timeStartedParts.period === p}
                              onChange={() => updateTimePart(setTimeStartedParts, 'timeStarted', timeStartedParts, 'period', p)} />
                            {p}
                          </label>
                        ))}
                      </div>
                    </div>
                    {minuteForm.timeStarted && <div className="rep-time-preview">{minuteForm.timeStarted}</div>}
                  </div>
                  <div className="rep-form-group">
                    <label>Time Ended</label>
                    <div className="rep-time-picker">
                      <select className="rep-time-select"
                        value={timeEndedParts.hour}
                        onChange={e => updateTimePart(setTimeEndedParts, 'timeEnded', timeEndedParts, 'hour', e.target.value)}>
                        <option value="">--</option>
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="rep-time-colon">:</span>
                      <select className="rep-time-select"
                        value={timeEndedParts.minute}
                        onChange={e => updateTimePart(setTimeEndedParts, 'timeEnded', timeEndedParts, 'minute', e.target.value)}>
                        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <div className="rep-time-period">
                        {['AM','PM'].map(p => (
                          <label key={p} className="rep-radio-label">
                            <input type="radio" name="timeEndedPeriod" value={p}
                              checked={timeEndedParts.period === p}
                              onChange={() => updateTimePart(setTimeEndedParts, 'timeEnded', timeEndedParts, 'period', p)} />
                            {p}
                          </label>
                        ))}
                      </div>
                    </div>
                    {minuteForm.timeEnded && <div className="rep-time-preview">{minuteForm.timeEnded}</div>}
                  </div>
                </div>
                <div className="rep-form-group">
                  <label>Venue</label>
                  <select className="rep-venue-select" value={venueType} onChange={e => handleVenueType(e.target.value)}>
                    <option value="">— Select venue —</option>
                    <option value="Google Meet">Google Meet</option>
                    <option value="School">School</option>
                  </select>
                  {venueType === 'School' && (
                    <select className="rep-venue-select rep-venue-select-indent" value={venueBuilding} onChange={e => handleVenueBuilding(e.target.value)}>
                      <option value="">— Select building —</option>
                      <option value="JMC">JMC</option>
                      <option value="RIZAL">RIZAL</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  )}
                  {venueType === 'School' && venueBuilding && (
                    <input className="rep-venue-room" value={venueRoom}
                      onChange={e => handleVenueRoom(e.target.value)}
                      placeholder="Room number (e.g. 101)" />
                  )}
                  {minuteForm.venue && <div className="rep-venue-preview">📍 {minuteForm.venue}</div>}
                </div>
                <div className="rep-form-group">
                  <label>Event Details</label>
                  <textarea rows={2} value={minuteForm.eventDetails}
                    onChange={e => setMinuteForm(f => ({ ...f, eventDetails: e.target.value }))}
                    placeholder="Brief summary of what the meeting was about…" />
                </div>
              </div>

              {/* ── Section 2: Agenda Items ── */}
              <div className="rep-form-section">
                <div className="rep-form-section-header">
                  <span className="rep-section-label">Agenda</span>
                  <button type="button" className="rep-add-item-btn" onClick={addAgendaItem}>+ Add Item</button>
                </div>
                {minuteForm.agendaItems.map((item, i) => (
                  <div key={i} className="rep-dynamic-row">
                    <span className="rep-item-num">{i + 1}.</span>
                    <input value={item} onChange={e => updateAgendaItem(i, e.target.value)}
                      placeholder={`Agenda item ${i + 1}`} />
                    {minuteForm.agendaItems.length > 1 && (
                      <button type="button" className="rep-remove-btn" onClick={() => removeAgendaItem(i)}>×</button>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Section 3: Meeting Details (per agenda item) ── */}
              <div className="rep-form-section">
                <div className="rep-form-section-header">
                  <span className="rep-section-label">Meeting Details</span>
                </div>
                {minuteForm.meetingDetails.map((detail, i) => (
                  <div key={i} className="rep-agenda-detail">
                    <p className="rep-agenda-detail-title">Agenda {i + 1}: {minuteForm.agendaItems[i] || '(untitled)'}</p>

                    {/* To Do */}
                    <div className="rep-sub-section">
                      <div className="rep-sub-section-header">
                        <span className="rep-sub-label">To do:</span>
                        <button type="button" className="rep-add-item-btn rep-add-item-btn-sm" onClick={() => addToDoItem(i)}>+ Add</button>
                      </div>
                      {detail.toDoItems.map((item, j) => (
                        <div key={j} className="rep-dynamic-row rep-indent">
                          <span className="rep-item-num">{j + 1}.</span>
                          <input value={item} onChange={e => updateToDoItem(i, j, e.target.value)}
                            placeholder="To-do item…" />
                          {detail.toDoItems.length > 1 && (
                            <button type="button" className="rep-remove-btn" onClick={() => removeToDoItem(i, j)}>×</button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* To Note */}
                    <div className="rep-sub-section">
                      <div className="rep-sub-section-header">
                        <span className="rep-sub-label">To note:</span>
                        <button type="button" className="rep-add-item-btn rep-add-item-btn-sm" onClick={() => addToNoteItem(i)}>+ Add Note</button>
                      </div>
                      {detail.toNoteItems.map((note, j) => (
                        <div key={j} className="rep-note-block rep-indent">
                          <div className="rep-dynamic-row">
                            <span className="rep-item-num">{j + 1}.</span>
                            <input value={note.title} onChange={e => updateToNoteTitle(i, j, e.target.value)}
                              placeholder="Note heading…" />
                            {detail.toNoteItems.length > 1 && (
                              <button type="button" className="rep-remove-btn" onClick={() => removeToNoteItem(i, j)}>×</button>
                            )}
                          </div>
                          {note.bullets.map((bullet, k) => (
                            <div key={k} className="rep-dynamic-row rep-indent">
                              <span className="rep-bullet-dot">•</span>
                              <input value={bullet} onChange={e => updateNoteBullet(i, j, k, e.target.value)}
                                placeholder="Sub-item…" />
                              {note.bullets.length > 1 && (
                                <button type="button" className="rep-remove-btn" onClick={() => removeNoteBullet(i, j, k)}>×</button>
                              )}
                            </div>
                          ))}
                          <button type="button" className="rep-add-item-btn rep-add-item-btn-xs rep-indent" onClick={() => addNoteBullet(i, j)}>+ Add bullet</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Section 4: Additional Notes ── */}
              <div className="rep-form-section">
                <div className="rep-form-section-header">
                  <span className="rep-section-label">Additional Notes</span>
                  <button type="button" className="rep-add-item-btn" onClick={addAdditionalNote}>+ Add Note</button>
                </div>
                {minuteForm.additionalNotes.map((note, i) => (
                  <div key={i} className="rep-dynamic-row">
                    <span className="rep-bullet-dot">•</span>
                    <input value={note} onChange={e => updateAdditionalNote(i, e.target.value)}
                      placeholder="Additional note…" />
                    {minuteForm.additionalNotes.length > 1 && (
                      <button type="button" className="rep-remove-btn" onClick={() => removeAdditionalNote(i)}>×</button>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Section 5: Attendance ── */}
              <div className="rep-form-section">
                <div className="rep-form-section-header">
                  <span className="rep-section-label">Attendance</span>
                  <button type="button" className="rep-add-item-btn" onClick={addAttendee}>+ Add Attendee</button>
                </div>
                {minuteForm.attendance.map((a, i) => (
                  <div key={i} className="rep-dynamic-row">
                    <input value={a.name} onChange={e => updateAttendee(i, 'name', e.target.value)}
                      placeholder="Full name…" style={{ flex: 2 }} />
                    <select value={a.status} onChange={e => updateAttendee(i, 'status', e.target.value)}
                      className="rep-attendee-status">
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                    </select>
                    {minuteForm.attendance.length > 1 && (
                      <button type="button" className="rep-remove-btn" onClick={() => removeAttendee(i)}>×</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="rep-modal-footer">
                <button type="button" className="rep-btn-cancel" onClick={() => setShowMinutesModal(false)}>Cancel</button>
                <button type="submit" className="rep-btn-save">Save Minutes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && minuteToDelete && (
        <div className="rep-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="rep-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="rep-modal-header">
              <h2 className="rep-modal-title">Delete Minutes</h2>
              <button className="rep-modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#636e72', margin: '0 0 22px' }}>
              Are you sure you want to delete <strong>"{minuteToDelete.title}"</strong>? This action cannot be undone.
            </p>
            <div className="rep-modal-footer">
              <button className="rep-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="rep-btn-save" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
                onClick={handleDeleteMinute}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;