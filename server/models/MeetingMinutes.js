const mongoose = require('mongoose');

const meetingMinutesSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  venue: { type: String, trim: true },
  agenda: { type: String, trim: true },
  attendees: { type: String, trim: true },
  discussions: { type: String, trim: true },
  resolutions: { type: String, trim: true },
  preparedBy: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MeetingMinutes', meetingMinutesSchema);