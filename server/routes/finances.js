const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { checkRoles } = require('../middleware/checkRole');

const canView  = checkRoles('Admin', 'Treasurer', 'Auditor');
const canWrite = checkRoles('Admin', 'Treasurer');

// ── Summary ──────────────────────────────────────────────────────────────────
router.get('/summary', auth, canView, async (req, res) => {
  try {
    const budgets = await Budget.find();
    const totalBudget = budgets.reduce((sum, b) => sum + b.totalAmount, 0);

    const incomeAgg = await Transaction.aggregate([
      { $match: { type: 'Income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const expenseAgg = await Transaction.aggregate([
      { $match: { type: 'Expense' } },
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
    const budgets = await Budget.find().sort({ createdAt: -1 });
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
    const transactions = await Transaction.find()
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