const mongoose = require('mongoose');

const toNoteItemSchema = new mongoose.Schema({
  title:   { type: String, default: '' },
  bullets: [{ type: String }],
}, { _id: false });

const meetingDetailSchema = new mongoose.Schema({
  agendaTitle: { type: String, default: '' },
  toDoItems:   [{ type: String }],
  toNoteItems: [toNoteItemSchema],
}, { _id: false });

const attendeeSchema = new mongoose.Schema({
  name:   { type: String, default: '' },
  status: { type: String, enum: ['Present', 'Absent'], default: 'Present' },
}, { _id: false });

const meetingMinutesSchema = new mongoose.Schema({
  title:           { type: String, required: true, trim: true },
  eventDetails:    { type: String, trim: true },
  date:            { type: Date, required: true },
  timeStarted:     { type: String, trim: true },
  timeEnded:       { type: String, trim: true },
  venue:           { type: String, trim: true },
  agendaItems:     [{ type: String }],
  meetingDetails:  [meetingDetailSchema],
  additionalNotes: [{ type: String }],
  attendance:      [attendeeSchema],
  preparedBy:      { type: String, trim: true },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MeetingMinutes', meetingMinutesSchema);
