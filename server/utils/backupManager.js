const fs = require('fs');
const path = require('path');

const Member           = require('../models/Member');
const Event            = require('../models/Event');
const Budget           = require('../models/Budget');
const Transaction      = require('../models/Transaction');
const Task             = require('../models/Task');
const OfficerDirectory = require('../models/OfficerDirectory');
const MeetingMinutes   = require('../models/MeetingMinutes');
const User             = require('../models/User');

const BACKUPS_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = 10;

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const COLLECTIONS = [
  { key: 'members',           Model: Member },
  { key: 'events',            Model: Event },
  { key: 'budgets',           Model: Budget },
  { key: 'transactions',      Model: Transaction },
  { key: 'tasks',             Model: Task },
  { key: 'officerDirectory',  Model: OfficerDirectory },
  { key: 'meetingMinutes',    Model: MeetingMinutes },
  { key: 'users',             Model: User },
];

// Collections that can be wiped (excludes users and activityLogs)
const WIPE_SAFE = ['members', 'events', 'tasks', 'budgets', 'transactions', 'officerDirectory', 'meetingMinutes'];

const MODEL_MAP = Object.fromEntries(COLLECTIONS.map(c => [c.key, c.Model]));

/**
 * Query all collections and return a combined backup object.
 */
async function createBackupData() {
  const data = { _meta: { createdAt: new Date().toISOString(), version: '1.0' } };
  for (const { key, Model } of COLLECTIONS) {
    data[key] = await Model.find({}).lean();
  }
  return data;
}

/**
 * Write backup data to server/backups/ and prune oldest if > MAX_BACKUPS.
 * Returns the saved filename.
 */
async function saveBackupFile(data) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const filename = `backup-${ts}.json`;
  const filepath = path.join(BACKUPS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');

  // Prune oldest files if over limit
  const files = listBackupFiles();
  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const f of toDelete) {
      const fp = path.join(BACKUPS_DIR, f.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  }

  return filename;
}

/**
 * List all stored backup files sorted newest first.
 */
function listBackupFiles() {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .map(filename => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, filename));
      return { filename, size: stat.size, createdAt: stat.birthtime || stat.mtime };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Merge-restore from a backup data object.
 * Skips records whose _id already exists.
 * Returns per-collection results: { key: { inserted, skipped, errors } }
 */
async function restoreFromData(data) {
  const results = {};

  for (const { key, Model } of COLLECTIONS) {
    const records = data[key];
    if (!Array.isArray(records) || records.length === 0) {
      results[key] = { inserted: 0, skipped: 0, errors: 0 };
      continue;
    }

    try {
      const res = await Model.insertMany(records, { ordered: false, rawResult: true });
      results[key] = {
        inserted: res.insertedCount ?? records.length,
        skipped: 0,
        errors: 0,
      };
    } catch (err) {
      // ordered: false — partial success; writeErrors contain duplicates
      const inserted = err.result?.nInserted ?? 0;
      const errors   = (err.writeErrors || []).filter(e => e.code !== 11000).length;
      const skipped  = (err.writeErrors || []).filter(e => e.code === 11000).length;
      results[key] = { inserted, skipped, errors };
    }
  }

  return results;
}

/**
 * Wipe a single collection. Returns { deleted } count.
 * Only allowed for collections in the WIPE_SAFE list.
 */
async function wipeCollection(collectionKey) {
  if (!WIPE_SAFE.includes(collectionKey)) {
    throw new Error(`Wipe not allowed for collection: ${collectionKey}`);
  }
  const Model = MODEL_MAP[collectionKey];
  if (!Model) throw new Error(`Unknown collection: ${collectionKey}`);
  const result = await Model.deleteMany({});
  return { deleted: result.deletedCount };
}

module.exports = {
  createBackupData,
  saveBackupFile,
  listBackupFiles,
  restoreFromData,
  wipeCollection,
  WIPE_SAFE,
  BACKUPS_DIR,
};
