const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRoles } = require('../middleware/checkRole');
const Member = require('../models/Member');
const Event = require('../models/Event');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const MeetingMinutes = require('../models/MeetingMinutes');
const logActivity = require('../utils/activityLogger');

const canAccess = checkRoles('Admin', 'Secretary');

function fyDateRange(academicYear) {
  if (!academicYear) return null;
  const [startYr] = academicYear.split('-').map(Number);
  return { start: new Date(startYr, 7, 1), end: new Date(startYr + 1, 7, 1) };
}

// ── Member Report ─────────────────────────────────────────────────────────────
router.get('/members', auth, canAccess, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const query = academicYear ? { academicYear } : {};
    const members = await Member.find(query).sort({ lastName: 1 });
    const total = members.length;
    const paid = members.filter(m => m.hasPaid).length;
    const unpaid = total - paid;
    const byYearLevel = {};
    members.forEach(m => {
      byYearLevel[m.yearLevel] = (byYearLevel[m.yearLevel] || 0) + 1;
    });
    res.json({ stats: { total, paid, unpaid, byYearLevel }, members });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Event Report ──────────────────────────────────────────────────────────────
router.get('/events', auth, canAccess, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const range = fyDateRange(academicYear);
    const query = range ? { date: { $gte: range.start, $lt: range.end } } : {};
    const events = await Event.find(query).sort({ date: -1 });
    const byStatus = {};
    events.forEach(e => {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    });
    res.json({ stats: { total: events.length, byStatus }, events });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Finance Report ────────────────────────────────────────────────────────────
router.get('/finances', auth, canAccess, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const range = fyDateRange(academicYear);
    const budgetQuery = academicYear ? { academicYear } : {};
    const txQuery = range ? { date: { $gte: range.start, $lt: range.end } } : {};
    const [budgets, transactions] = await Promise.all([
      Budget.find(budgetQuery).sort({ createdAt: -1 }),
      Transaction.find(txQuery).populate('budgetId', 'title academicYear').sort({ date: -1 }),
    ]);
    const totalBudget = budgets.reduce((s, b) => s + b.totalAmount, 0);
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    res.json({
      summary: { totalBudget, totalIncome, totalExpense, balance: totalIncome - totalExpense },
      budgets,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Meeting Minutes ───────────────────────────────────────────────────────────
router.get('/meeting-minutes', auth, canAccess, async (req, res) => {
  try {
    const minutes = await MeetingMinutes.find().sort({ date: -1 });
    res.json(minutes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/meeting-minutes', auth, canAccess, async (req, res) => {
  try {
    const {
      title, eventDetails, date, timeStarted, timeEnded, venue,
      agendaItems, meetingDetails, additionalNotes, attendance,
    } = req.body;
    const doc = await MeetingMinutes.create({
      title, eventDetails, date, timeStarted, timeEnded, venue,
      agendaItems, meetingDetails, additionalNotes, attendance,
      preparedBy: req.user.name,
      createdBy: req.user._id,
    });
    await logActivity(req.user._id, 'CREATE', 'Reports',
      `Created meeting minutes: "${doc.title}"`,
      { minutesId: doc._id }
    );
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/meeting-minutes/:id', auth, canAccess, async (req, res) => {
  try {
    const {
      title, eventDetails, date, timeStarted, timeEnded, venue,
      agendaItems, meetingDetails, additionalNotes, attendance,
    } = req.body;
    const doc = await MeetingMinutes.findByIdAndUpdate(
      req.params.id,
      { title, eventDetails, date, timeStarted, timeEnded, venue,
        agendaItems, meetingDetails, additionalNotes, attendance },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Minutes not found' });
    await logActivity(req.user._id, 'UPDATE', 'Reports',
      `Updated meeting minutes: "${doc.title}"`,
      { minutesId: doc._id }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/meeting-minutes/:id', auth, canAccess, async (req, res) => {
  try {
    const doc = await MeetingMinutes.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Minutes not found' });
    await logActivity(req.user._id, 'DELETE', 'Reports',
      `Deleted meeting minutes: "${doc.title}"`,
      { minutesId: req.params.id }
    );
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;