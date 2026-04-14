const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const OfficerDirectory = require('../models/OfficerDirectory');
const auth = require('../middleware/auth');
const { checkAdmin } = require('../middleware/checkRole');
const logActivity = require('../utils/activityLogger');

// Compute current academic year (Aug–Jul cycle)
function currentAcademicYear() {
  const now = new Date();
  const yr = now.getFullYear();
  const start = now.getMonth() >= 7 ? yr : yr - 1;
  return `${start}-${start + 1}`;
}

// All routes require authentication and Admin role
router.use(auth);
router.use(checkAdmin);

// @route   GET /api/officers
// @desc    Get all officers
// @access  Admin only
router.get('/', async (req, res) => {
  try {
    const officers = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(officers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/officers/stats
// @desc    Get officers statistics
// @access  Admin only
router.get('/stats', async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const activeCount = await User.countDocuments({ isActive: true });
    const inactiveCount = await User.countDocuments({ isActive: false });
    const totalCount = await User.countDocuments();

    res.json({
      byRole: stats,
      activeOfficers: activeCount,
      inactiveOfficers: inactiveCount,
      totalOfficers: totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/officers
// @desc    Create new officer account
// @access  Admin only
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['President', 'Treasurer', 'Secretary', 'Auditor']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, role } = req.body;

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new officer
      user = new User({
        name,
        email,
        password: hashedPassword,
        role,
        isActive: true
      });

      await user.save();

      // Auto-create linked OfficerDirectory entry
      await OfficerDirectory.create({
        name: user.name,
        position: user.role,
        email: user.email,
        academicYear: currentAcademicYear(),
        status: 'Active',
        userId: user._id,
      });

      await logActivity(req.user._id, 'CREATE', 'Officers',
        `Created officer account for ${user.name} (${user.role})`,
        { officerId: user._id, role: user.role }
      );

      res.status(201).json({
        message: 'Officer account created successfully',
        officer: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/officers/:id
// @desc    Update officer account
// @access  Admin only
router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('role').optional().isIn(['President', 'Treasurer', 'Secretary', 'Auditor']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, role, isActive } = req.body;

      // Check if officer exists
      let officer = await User.findById(req.params.id);
      if (!officer) {
        return res.status(404).json({ message: 'Officer not found' });
      }

      // Prevent Admin from editing their own account through this route
      if (officer.role === 'Admin') {
        return res.status(403).json({ message: 'Cannot edit Admin account through this route' });
      }

      // If email is being changed, check if it's already in use
      if (email && email !== officer.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      // Update fields
      if (name) officer.name = name;
      if (email) officer.email = email;
      if (role) officer.role = role;
      if (typeof isActive !== 'undefined') officer.isActive = isActive;

      await officer.save();

      // Sync linked OfficerDirectory entry if it exists
      await OfficerDirectory.findOneAndUpdate(
        { userId: officer._id },
        {
          name: officer.name,
          position: officer.role,
          email: officer.email,
          status: officer.isActive ? 'Active' : 'Inactive',
        }
      );

      await logActivity(req.user._id, 'UPDATE', 'Officers',
        `Updated officer account for ${officer.name} (${officer.role})`,
        { officerId: officer._id }
      );

      res.json({
        message: 'Officer updated successfully',
        officer: {
          id: officer._id,
          name: officer.name,
          email: officer.email,
          role: officer.role,
          isActive: officer.isActive
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/officers/:id/password
// @desc    Reset officer password
// @access  Admin only
router.put(
  '/:id/password',
  [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const officer = await User.findById(req.params.id);
      if (!officer) {
        return res.status(404).json({ message: 'Officer not found' });
      }

      // Prevent Admin from resetting Admin password through this route
      if (officer.role === 'Admin') {
        return res.status(403).json({ message: 'Cannot reset Admin password through this route' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      officer.password = await bcrypt.hash(req.body.password, salt);

      await officer.save();

      await logActivity(req.user._id, 'RESET', 'Officers',
        `Reset password for officer ${officer.name} (${officer.role})`,
        { officerId: officer._id }
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/officers/:id
// @desc    Delete officer account
// @access  Admin only
router.delete('/:id', async (req, res) => {
  try {
    const officer = await User.findById(req.params.id);
    if (!officer) {
      return res.status(404).json({ message: 'Officer not found' });
    }

    // Prevent deleting Admin accounts
    if (officer.role === 'Admin') {
      return res.status(403).json({ message: 'Cannot delete Admin account' });
    }

    await User.findByIdAndDelete(req.params.id);

    // Remove linked OfficerDirectory entry
    await OfficerDirectory.findOneAndDelete({ userId: officer._id });

    await logActivity(req.user._id, 'DELETE', 'Officers',
      `Deleted officer account for ${officer.name} (${officer.role})`,
      { officerId: req.params.id, role: officer.role }
    );

    res.json({ message: 'Officer account deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;