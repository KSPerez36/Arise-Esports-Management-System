const express = require('express');
const router = express.Router();
const OfficerDirectory = require('../models/OfficerDirectory');
const auth = require('../middleware/auth');
const { checkRoles } = require('../middleware/checkRole');
const logActivity = require('../utils/activityLogger');

const canAccess = checkRoles('Admin', 'Secretary');
const adminOnly = checkRoles('Admin');

// GET all — filtered by academicYear
router.get('/', auth, canAccess, async (req, res) => {
  try {
    const query = req.query.academicYear ? { academicYear: req.query.academicYear } : {};
    const officers = await OfficerDirectory.find(query).sort({ position: 1, name: 1 });
    res.json(officers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create
router.post('/', auth, canAccess, async (req, res) => {
  try {
    const { name, position, studentId, course, yearLevel, email, academicYear, status } = req.body;
    if (!name || !position || !academicYear) {
      return res.status(400).json({ message: 'Name, position, and academic year are required.' });
    }
    const doc = await OfficerDirectory.create({ name, position, studentId, course, yearLevel, email, academicYear, status });
    await logActivity(req.user._id, 'CREATE', 'OfficerDirectory',
      `Added officer directory entry: ${doc.name} — ${doc.position} (${doc.academicYear})`,
      { docId: doc._id }
    );
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', auth, canAccess, async (req, res) => {
  try {
    const { name, position, studentId, course, yearLevel, email, academicYear, status } = req.body;
    const doc = await OfficerDirectory.findByIdAndUpdate(
      req.params.id,
      { name, position, studentId, course, yearLevel, email, academicYear, status },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Officer not found' });
    await logActivity(req.user._id, 'UPDATE', 'OfficerDirectory',
      `Updated officer directory entry: ${doc.name} — ${doc.position} (${doc.academicYear})`,
      { docId: doc._id }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE — Admin only
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const doc = await OfficerDirectory.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Officer not found' });
    await logActivity(req.user._id, 'DELETE', 'OfficerDirectory',
      `Deleted officer directory entry: ${doc.name} — ${doc.position} (${doc.academicYear})`,
      { docId: req.params.id }
    );
    res.json({ message: 'Officer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST bulk import
router.post('/bulk-import', auth, canAccess, async (req, res) => {
  try {
    const { officers } = req.body;
    if (!Array.isArray(officers) || officers.length === 0) {
      return res.status(400).json({ message: 'No officers provided' });
    }

    let created = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < officers.length; i++) {
      const o = officers[i];
      try {
        if (!o.name || !o.position || !o.academicYear) {
          errors.push({ row: i + 2, message: 'Missing required fields (name, position, academicYear)' });
          skipped++;
          continue;
        }
        await OfficerDirectory.create({
          name: o.name,
          position: o.position,
          studentId: o.studentId || '',
          course: o.course || '',
          yearLevel: o.yearLevel || '',
          email: o.email || '',
          academicYear: o.academicYear,
          status: o.status === 'Inactive' ? 'Inactive' : 'Active',
        });
        created++;
      } catch (err) {
        errors.push({ row: i + 2, message: err.message });
        skipped++;
      }
    }

    await logActivity(req.user._id, 'IMPORT', 'OfficerDirectory',
      `Bulk imported officer directory — ${created} created, ${skipped} skipped`,
      { created, skipped }
    );

    res.json({ created, skipped, errors });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
