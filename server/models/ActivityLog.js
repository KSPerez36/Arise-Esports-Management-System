const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PAYMENT', 'IMPORT', 'RESET', 'BACKUP', 'RESTORE', 'WIPE'],
      required: true,
    },
    module: {
      type: String,
      enum: ['Members', 'Events', 'Finances', 'Officers', 'OfficerDirectory', 'Reports', 'Auth', 'Tasks', 'Database'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
