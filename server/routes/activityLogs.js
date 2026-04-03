const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const auth = require('../middleware/auth');
const { checkRoles } = require('../middleware/checkRole');

// @route   GET /api/activity-logs
// @desc    Get activity logs with optional filters
// @access  Admin only
router.get('/', auth, checkRoles('Admin'), async (req, res) => {
  try {
    const { module, action, userId, startDate, endDate, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (module) query.module = module;
    if (action) query.action = action;
    if (userId) query.user = userId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let logsQuery = ActivityLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const [logs, total] = await Promise.all([
      logsQuery,
      ActivityLog.countDocuments(query),
    ]);

    // Apply search filter on populated user name (post-query)
    const filtered = search
      ? logs.filter(l => l.user?.name?.toLowerCase().includes(search.toLowerCase()))
      : logs;

    res.json({
      logs: filtered,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
