const cron = require('node-cron');
const fs   = require('fs');
const path = require('path');
const { createBackupData, saveBackupFile, BACKUPS_DIR } = require('./backupManager');

const SCHEDULE_FILE = path.join(BACKUPS_DIR, 'schedule.json');

const DEFAULT_CONFIG = {
  enabled:     false,
  frequency:   'daily',   // 'daily' | 'weekly'
  time:        '02:00',   // HH:MM
  dayOfWeek:   0,         // 0=Sun … 6=Sat (used only for weekly)
};

let activeJob = null;

function readScheduleConfig() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')) };
    }
  } catch (_) { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

function writeScheduleConfig(config) {
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(config, null, 2), 'utf8');
}

function buildCronExpression(config) {
  const [hour, minute] = config.time.split(':').map(Number);
  if (config.frequency === 'weekly') {
    return `${minute} ${hour} * * ${config.dayOfWeek}`;
  }
  // daily
  return `${minute} ${hour} * * *`;
}

function stopActiveJob() {
  if (activeJob) {
    activeJob.stop();
    activeJob = null;
  }
}

function armJob(config) {
  stopActiveJob();
  if (!config.enabled) return;

  const expr = buildCronExpression(config);
  if (!cron.validate(expr)) {
    console.error(`[DB Backup] Invalid cron expression: ${expr}`);
    return;
  }

  activeJob = cron.schedule(expr, async () => {
    console.log('[DB Backup] Scheduled backup running...');
    try {
      const data     = await createBackupData();
      const filename = await saveBackupFile(data);
      console.log(`[DB Backup] Saved: ${filename}`);
    } catch (err) {
      console.error('[DB Backup] Failed:', err.message);
    }
  });

  console.log(`[DB Backup] Scheduler armed — ${config.frequency} at ${config.time}${config.frequency === 'weekly' ? ` (day ${config.dayOfWeek})` : ''}`);
}

/**
 * Read persisted schedule.json and start cron if enabled.
 * Called once at server startup.
 */
function startDbBackupScheduler() {
  const config = readScheduleConfig();
  armJob(config);
}

/**
 * Update the schedule config, persist it, and reschedule.
 * Called from PUT /api/database/schedule.
 */
function rescheduleBackup(config) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  writeScheduleConfig(merged);
  armJob(merged);
  return merged;
}

module.exports = { startDbBackupScheduler, rescheduleBackup, readScheduleConfig };
