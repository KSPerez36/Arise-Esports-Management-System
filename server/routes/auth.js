const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/emailService');
const logActivity = require('../utils/activityLogger');

// @route   POST /api/auth/register
// @desc    Register a new user (admin)
// @access  Public (in production, this should be protected or done via admin panel)
router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['Admin', 'President', 'Treasurer', 'Secretary', 'Auditor']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, role } = req.body;

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      user = new User({
        name,
        email,
        password: hashedPassword,
        role
      });

      await user.save();

      // Create JWT token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Create JWT token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      await logActivity(user._id, 'LOGIN', 'Auth',
        `${user.name} (${user.role}) logged in`,
        { role: user.role }
      );

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/forgot-password
// @desc    Generate OTP and send to email
// @access  Public
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Please enter a valid email')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'No account found with that email' });
      }

      const otp = crypto.randomInt(100000, 999999).toString();
      const salt = await bcrypt.genSalt(10);
      user.resetOTP = await bcrypt.hash(otp, salt);
      user.resetOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      await sendOTPEmail(email, otp);

      res.json({ message: 'OTP sent to your email' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }
  }
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and return a short-lived reset token
// @access  Public
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('otp').notEmpty().withMessage('OTP is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, otp } = req.body;
      const user = await User.findOne({ email });
      if (!user || !user.resetOTP || !user.resetOTPExpiry) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      if (new Date() > user.resetOTPExpiry) {
        user.resetOTP = null;
        user.resetOTPExpiry = null;
        await user.save();
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }

      const isMatch = await bcrypt.compare(otp, user.resetOTP);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect OTP' });
      }

      // Issue a short-lived reset token (5 min)
      const resetToken = jwt.sign(
        { userId: user._id, purpose: 'reset' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      // Clear OTP after successful verification
      user.resetOTP = null;
      user.resetOTPExpiry = null;
      await user.save();

      res.json({ resetToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/reset-password
// @desc    Reset password using the verified reset token
// @access  Public (reset token required)
router.post(
  '/reset-password',
  [body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { resetToken, newPassword } = req.body;
      if (!resetToken) {
        return res.status(400).json({ message: 'Reset token is required' });
      }

      let decoded;
      try {
        decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      } catch {
        return res.status(400).json({ message: 'Reset session expired. Please start over.' });
      }

      if (decoded.purpose !== 'reset') {
        return res.status(400).json({ message: 'Invalid reset token' });
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      await logActivity(user._id, 'RESET', 'Auth',
        `${user.name} (${user.role}) reset their password via OTP`,
        { role: user.role }
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;