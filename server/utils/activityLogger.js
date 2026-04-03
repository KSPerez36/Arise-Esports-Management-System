const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity to the database.
 * Never throws — a log failure must never break the main request.
 *
 * @param {ObjectId|string} userId  - req.user._id
 * @param {string} action           - 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'PAYMENT' | 'IMPORT' | 'RESET'
 * @param {string} module           - 'Members' | 'Events' | 'Finances' | 'Officers' | 'OfficerDirectory' | 'Reports' | 'Auth'
 * @param {string} description      - Human-readable description of the action
 * @param {object} [metadata={}]    - Optional extra context (IDs, amounts, etc.)
 */
const logActivity = async (userId, action, module, description, metadata = {}) => {
  try {
    await ActivityLog.create({ user: userId, action, module, description, metadata });
  } catch (err) {
    console.error('[ActivityLog] Failed to write log:', err.message);
  }
};

module.exports = logActivity;
