/**
 * One-time migration: create OfficerDirectory entries for existing
 * officer accounts that don't have a linked directory entry yet.
 *
 * Run once from the server/ folder:
 *   node scripts/linkOfficersToDirectory.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const connectDB = require('../config/db');
const User = require('../models/User');
const OfficerDirectory = require('../models/OfficerDirectory');

function currentAcademicYear() {
  const now = new Date();
  const yr = now.getFullYear();
  const start = now.getMonth() >= 7 ? yr : yr - 1;
  return `${start}-${start + 1}`;
}

async function run() {
  await connectDB();

  const officers = await User.find({ role: { $ne: 'Admin' } });

  console.log(`Found ${officers.length} officer account(s) to check.\n`);

  let created = 0;
  let skipped = 0;

  for (const officer of officers) {
    const existing = await OfficerDirectory.findOne({ userId: officer._id });

    if (existing) {
      console.log(`  SKIP  — ${officer.name} (${officer.role}) already linked`);
      skipped++;
      continue;
    }

    await OfficerDirectory.create({
      name: officer.name,
      position: officer.role,
      email: officer.email,
      academicYear: currentAcademicYear(),
      status: officer.isActive ? 'Active' : 'Inactive',
      userId: officer._id,
    });

    console.log(`  LINKED — ${officer.name} (${officer.role})`);
    created++;
  }

  console.log(`\nDone. ${created} entry(s) created, ${skipped} already linked.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
