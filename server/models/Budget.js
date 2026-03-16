const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  academicYear: { type: String, required: true, trim: true },
  totalAmount: { type: Number, required: true, min: 0 },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Budget', budgetSchema);