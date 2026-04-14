const mongoose = require('mongoose');

const officerDirectorySchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  position:     { type: String, required: true, trim: true },
  studentId:    { type: String, trim: true },
  course:       { type: String, trim: true },
  yearLevel:    { type: String, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  academicYear: { type: String, required: true },
  status:       { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('OfficerDirectory', officerDirectorySchema);
