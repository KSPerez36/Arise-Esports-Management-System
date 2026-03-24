const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { checkRoles } = require('../middleware/checkRole');

const canView  = checkRoles('Admin', 'Treasurer', 'Auditor');
const canWrite = checkRoles('Admin', 'Treasurer');

// e.g. "2024-2025" → { start: 2024-08-01, end: 2025-08-01 }
function fyDateRange(academicYear) {
  if (!academicYear) return null;
  const [startYr] = academicYear.split('-').map(Number);
  return { start: new Date(startYr, 7, 1), end: new Date(startYr + 1, 7, 1) };
}

// ── Summary ──────────────────────────────────────────────────────────────────
router.get('/summary', auth, canView, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const budgetQuery = academicYear ? { academicYear } : {};
    const budgets = await Budget.find(budgetQuery);
    const totalBudget = budgets.reduce((sum, b) => sum + b.totalAmount, 0);

    const range = fyDateRange(academicYear);
    const txMatch = range ? { date: { $gte: range.start, $lt: range.end } } : {};

    const incomeAgg = await Transaction.aggregate([
      { $match: { type: 'Income', ...txMatch } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const expenseAgg = await Transaction.aggregate([
      { $match: { type: 'Expense', ...txMatch } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalIncome  = incomeAgg[0]?.total  || 0;
    const totalExpense = expenseAgg[0]?.total || 0;

    res.json({ totalBudget, totalIncome, totalExpense, balance: totalIncome - totalExpense });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Budgets ───────────────────────────────────────────────────────────────────
router.get('/budgets', auth, canView, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const query = academicYear ? { academicYear } : {};
    const budgets = await Budget.find(query).sort({ createdAt: -1 });
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/budgets', auth, canWrite, async (req, res) => {
  try {
    const budget = await Budget.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(budget);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/budgets/:id', auth, canWrite, async (req, res) => {
  try {
    const budget = await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    res.json(budget);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/budgets/:id', auth, canWrite, async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Budget not found' });
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Transactions ──────────────────────────────────────────────────────────────
router.get('/transactions', auth, canView, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const range = fyDateRange(academicYear);
    const query = range ? { date: { $gte: range.start, $lt: range.end } } : {};
    const transactions = await Transaction.find(query)
      .populate('budgetId', 'title academicYear')
      .sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/transactions', auth, canWrite, async (req, res) => {
  try {
    const tx = await Transaction.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/transactions/:id', auth, canWrite, async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json(tx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/transactions/:id', auth, canWrite, async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

// ── Monthly Summary (Admin only) ──────────────────────────────────────────────
router.get('/monthly-summary', auth, canView, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const range = fyDateRange(academicYear);
    const start = range ? range.start : new Date(new Date().getFullYear(), 0, 1);
    const end   = range ? range.end   : new Date(new Date().getFullYear() + 1, 0, 1);
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const agg = await Transaction.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: { month: { $month: '$date' }, type: '$type' }, total: { $sum: '$amount' } } }
    ]);

    const map = {};
    agg.forEach(({ _id, total }) => {
      if (!map[_id.month]) map[_id.month] = { income: 0, expense: 0 };
      if (_id.type === 'Income')  map[_id.month].income  = total;
      if (_id.type === 'Expense') map[_id.month].expense = total;
    });

    const result = MONTH_NAMES.map((name, i) => ({
      month:   name,
      income:  map[i + 1]?.income  || 0,
      expense: map[i + 1]?.expense || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
