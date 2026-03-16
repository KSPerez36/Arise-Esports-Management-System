const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  category: {
    type: String,
    enum: ['Membership Fee', 'Sponsorship', 'Event Expense', 'Equipment', 'Utilities', 'Miscellaneous'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0.01 },
  description: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  reference: { type: String, trim: true },
  budgetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);