const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Member = require('../models/Member');
const auth = require('../middleware/auth');
const { checkRoles } = require('../middleware/checkRole');

// @route   GET /api/members
// @desc    Get all members (with filtering options)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { academicYear, hasPaid, status, search } = req.query;
    
    // Build query
    let query = {};
    
    if (academicYear) {
      query.academicYear = academicYear;
    }
    
    if (hasPaid !== undefined) {
      query.hasPaid = hasPaid === 'true';
    }
    
    if (status) {
      query.status = status;
    }
    
    // Search by name or student ID
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const members = await Member.find(query).sort({ registrationDate: -1 });
    
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/members/:id
// @desc    Get member by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }
    
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/members
// @desc    Add a new member
// @access  Admin, Secretary only
router.post(
  '/',
  [
    auth,
    checkRoles('Admin', 'Secretary'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('course').notEmpty().withMessage('Course is required'),
    body('yearLevel').isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']).withMessage('Invalid year level'),
    body('academicYear').notEmpty().withMessage('Academic year is required')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { studentId, firstName, lastName, email, phoneNumber, course, yearLevel, academicYear } = req.body;

      // Check if student ID already exists
      let existingMember = await Member.findOne({ studentId });
      if (existingMember) {
        return res.status(400).json({ message: 'Student ID already exists' });
      }

      // Create new member
      const member = new Member({
        studentId,
        firstName,
        lastName,
        email,
        phoneNumber,
        course,
        yearLevel,
        academicYear
      });

      await member.save();

      res.status(201).json(member);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/members/:id
// @desc    Update member details
// @access  Admin, Secretary only
router.put('/:id', auth, checkRoles('Admin', 'Secretary'), async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, course, yearLevel, academicYear, remarks } = req.body;

    let member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Update fields
    if (firstName) member.firstName = firstName;
    if (lastName) member.lastName = lastName;
    if (email) member.email = email;
    if (phoneNumber !== undefined) member.phoneNumber = phoneNumber;
    if (course) member.course = course;
    if (yearLevel) member.yearLevel = yearLevel;
    if (academicYear) member.academicYear = academicYear;
    if (remarks !== undefined) member.remarks = remarks;

    await member.save();

    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/members/:id/payment
// @desc    Update payment status
// @access  Private
router.put('/:id/payment', auth, async (req, res) => {
  try {
    const { hasPaid, amountPaid, paymentDate } = req.body;

    let member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Update payment info
    member.hasPaid = hasPaid;
    if (hasPaid) {
      member.amountPaid = amountPaid || 0;
      member.paymentDate = paymentDate || new Date();
      member.status = 'Official Member';
    } else {
      member.amountPaid = 0;
      member.paymentDate = null;
      member.status = 'Pending';
    }

    await member.save();

    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/members/:id/status
// @desc    Update member status
// @access  Admin, Secretary only
router.put('/:id/status', auth, checkRoles('Admin', 'Secretary'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Pending', 'Official Member', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    member.status = status;
    await member.save();

    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/members/:id
// @desc    Delete a member
// @access  Admin only
router.delete('/:id', auth, checkRoles('Admin'), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    await Member.findByIdAndDelete(req.params.id);

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/members/stats/summary
// @desc    Get statistics summary
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { academicYear } = req.query;
    
    let query = {};
    if (academicYear) {
      query.academicYear = academicYear;
    }

    const totalMembers = await Member.countDocuments(query);
    const paidMembers = await Member.countDocuments({ ...query, hasPaid: true });
    const unpaidMembers = await Member.countDocuments({ ...query, hasPaid: false });
    const officialMembers = await Member.countDocuments({ ...query, status: 'Official Member' });
    const pendingMembers = await Member.countDocuments({ ...query, status: 'Pending' });

    // Calculate total revenue
    const revenueResult = await Member.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      totalMembers,
      paidMembers,
      unpaidMembers,
      officialMembers,
      pendingMembers,
      totalRevenue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/members/bulk-import
// @desc    Bulk import members from CSV
// @access  Admin, Secretary
router.post('/bulk-import', auth, checkRoles('Admin', 'Secretary'), async (req, res) => {
  try {
    const { members } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: 'No members provided' });
    }

    const VALID_YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
    const VALID_STATUSES = ['Pending', 'Official Member', 'Rejected'];
    let created = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      try {
        if (!m.studentId || !m.firstName || !m.lastName || !m.email || !m.course || !m.yearLevel || !m.academicYear) {
          errors.push({ row: i + 2, message: 'Missing required fields (studentId, firstName, lastName, email, course, yearLevel, academicYear)' });
          skipped++;
          continue;
        }
        if (!VALID_YEAR_LEVELS.includes(m.yearLevel)) {
          errors.push({ row: i + 2, message: `Invalid yearLevel "${m.yearLevel}". Must be one of: ${VALID_YEAR_LEVELS.join(', ')}` });
          skipped++;
          continue;
        }
        const exists = await Member.findOne({ studentId: m.studentId });
        if (exists) {
          errors.push({ row: i + 2, message: `Student ID "${m.studentId}" already exists` });
          skipped++;
          continue;
        }
        await Member.create({
          studentId:    m.studentId,
          firstName:    m.firstName,
          lastName:     m.lastName,
          email:        m.email,
          phoneNumber:  m.phoneNumber || '',
          course:       m.course,
          yearLevel:    m.yearLevel,
          academicYear: m.academicYear,
          hasPaid:      m.hasPaid === 'true' || m.hasPaid === true,
          status:       VALID_STATUSES.includes(m.status) ? m.status : 'Pending',
          remarks:      m.remarks || '',
        });
        created++;
      } catch (err) {
        errors.push({ row: i + 2, message: err.message });
        skipped++;
      }
    }

    res.json({ created, skipped, errors });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;