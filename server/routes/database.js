const express    = require('express');
const router     = express.Router();
const path       = require('path');
const fs         = require('fs');
const auth       = require('../middleware/auth');
const { checkAdmin } = require('../middleware/checkRole');
const logActivity    = require('../utils/activityLogger');
const {
  createBackupData,
  saveBackupFile,
  listBackupFiles,
  restoreFromData,
  wipeCollection,
  WIPE_SAFE,
  BACKUPS_DIR,
} = require('../utils/backupManager');
const { rescheduleBackup, readScheduleConfig } = require('../utils/dbScheduler');

// All routes: authenticated Admin only
router.use(auth, checkAdmin);

// ── GET /api/database/backup
// Stream a full backup JSON download to the browser
router.get('/backup', async (req, res) => {
  try {
    const data = await createBackupData();
    const ts   = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="arise-backup-${ts}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 2));

    await logActivity(req.user._id, 'BACKUP', 'Database',
      `Downloaded full database backup`,
      { collections: Object.keys(data).filter(k => k !== '_meta') }
    );
  } catch (err) {
    res.status(500).json({ message: 'Backup failed', error: err.message });
  }
});

// ── POST /api/database/backup
// Save a backup file to server/backups/
router.post('/backup', async (req, res) => {
  try {
    const data     = await createBackupData();
    const filename = await saveBackupFile(data);

    await logActivity(req.user._id, 'BACKUP', 'Database',
      `Saved backup to server: ${filename}`,
      { filename }
    );

    res.json({ message: 'Backup saved', filename });
  } catch (err) {
    res.status(500).json({ message: 'Backup failed', error: err.message });
  }
});

// ── GET /api/database/backups
// List stored backup files
router.get('/backups', (req, res) => {
  try {
    const files = listBackupFiles();
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: 'Could not list backups', error: err.message });
  }
});

// ── GET /api/database/backups/:filename
// Download a specific stored backup file
router.get('/backups/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // prevent path traversal
    const filepath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(filepath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

// ── DELETE /api/database/backups/:filename
// Delete a stored backup file
router.delete('/backups/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filepath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'Backup file not found' });
    }
    fs.unlinkSync(filepath);
    res.json({ message: 'Backup deleted', filename });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
});

// ── POST /api/database/restore
// Merge-restore from a JSON body: { data: { members:[...], events:[...], ... } }
router.post('/restore', async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: 'Invalid backup data. Expected { data: {...} }' });
    }

    const results = await restoreFromData(data);
    const totalInserted = Object.values(results).reduce((s, r) => s + r.inserted, 0);

    await logActivity(req.user._id, 'RESTORE', 'Database',
      `Restored database from backup — ${totalInserted} records inserted`,
      { results }
    );

    res.json({ message: 'Restore complete', results });
  } catch (err) {
    res.status(500).json({ message: 'Restore failed', error: err.message });
  }
});

// ── DELETE /api/database/wipe/:collection
// Wipe a single collection. Body must include { confirm: true }
router.delete('/wipe/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({ message: 'Confirmation required. Send { confirm: true }' });
    }
    if (!WIPE_SAFE.includes(collection)) {
      return res.status(400).json({
        message: `Cannot wipe "${collection}". Allowed: ${WIPE_SAFE.join(', ')}`,
      });
    }

    const result = await wipeCollection(collection);

    await logActivity(req.user._id, 'WIPE', 'Database',
      `Wiped collection: ${collection} (${result.deleted} records deleted)`,
      { collection, deleted: result.deleted }
    );

    res.json({ message: `Collection "${collection}" wiped`, deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ message: 'Wipe failed', error: err.message });
  }
});

// ── GET /api/database/schedule
// Get current schedule config
router.get('/schedule', (req, res) => {
  try {
    res.json(readScheduleConfig());
  } catch (err) {
    res.status(500).json({ message: 'Could not read schedule', error: err.message });
  }
});

// ── PUT /api/database/schedule
// Update and reschedule
router.put('/schedule', (req, res) => {
  try {
    const { enabled, frequency, time, dayOfWeek } = req.body;
    const updated = rescheduleBackup({ enabled, frequency, time, dayOfWeek });
    res.json({ message: 'Schedule updated', schedule: updated });
  } catch (err) {
    res.status(500).json({ message: 'Schedule update failed', error: err.message });
  }
});

module.exports = router;
