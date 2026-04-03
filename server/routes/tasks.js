const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { checkRoles } = require('../middleware/checkRole');
const logActivity = require('../utils/activityLogger');

const canManage = checkRoles('Admin', 'President');

// @route   GET /api/tasks/stats
// @desc    Task counts by status and priority
// @access  Admin, President
router.get('/stats', auth, canManage, async (req, res) => {
  try {
    const { academicYear } = req.query;
    const match = academicYear ? { academicYear } : {};

    const [byStatus, byPriority] = await Promise.all([
      Task.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: match },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({ byStatus, byPriority });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   GET /api/tasks
// @desc    Get tasks — Admin/President see all; others see only their own
// @access  All authenticated users
router.get('/', auth, async (req, res) => {
  try {
    const { academicYear, status, priority, assignedTo } = req.query;
    const isManager = ['Admin', 'President'].includes(req.user.role);

    const query = {};
    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (isManager) {
      if (assignedTo) query.assignedTo = assignedTo;
    } else {
      query.assignedTo = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name role')
      .populate('assignedBy', 'name role')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   POST /api/tasks
// @desc    Create a task
// @access  Admin, President
router.post('/', auth, canManage, async (req, res) => {
  try {
    const { title, description, priority, status, assignedTo, dueDate, academicYear } = req.body;

    if (!title || !assignedTo || !academicYear) {
      return res.status(400).json({ message: 'Title, assignee, and academic year are required.' });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      assignedTo,
      assignedBy: req.user._id,
      dueDate: dueDate || null,
      academicYear,
      completedAt: status === 'Done' ? new Date() : null,
    });

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name role' },
      { path: 'assignedBy', select: 'name role' },
    ]);

    await logActivity(req.user._id, 'CREATE', 'Tasks',
      `Created task "${task.title}" assigned to ${populated.assignedTo?.name}`,
      { taskId: task._id, assignedTo: task.assignedTo }
    );

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task — managers get full edit; assignees can only update status
// @access  Admin, President (full) | Assignee (status only)
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isManager = ['Admin', 'President'].includes(req.user.role);
    const isAssignee = task.assignedTo.toString() === req.user._id.toString();

    if (!isManager && !isAssignee) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    if (isManager) {
      // Full update
      const { title, description, priority, status, assignedTo, dueDate } = req.body;
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (priority !== undefined) task.priority = priority;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
      if (dueDate !== undefined) task.dueDate = dueDate || null;
      if (status !== undefined) {
        task.status = status;
        task.completedAt = status === 'Done' ? (task.completedAt || new Date()) : null;
      }
    } else {
      // Assignee: status only
      const { status } = req.body;
      if (status !== undefined) {
        task.status = status;
        task.completedAt = status === 'Done' ? (task.completedAt || new Date()) : null;
      }
    }

    await task.save();

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name role' },
      { path: 'assignedBy', select: 'name role' },
    ]);

    await logActivity(req.user._id, 'UPDATE', 'Tasks',
      `Updated task "${task.title}"`,
      { taskId: task._id, status: task.status }
    );

    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Admin, President
router.delete('/:id', auth, canManage, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await logActivity(req.user._id, 'DELETE', 'Tasks',
      `Deleted task "${task.title}"`,
      { taskId: req.params.id }
    );

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;