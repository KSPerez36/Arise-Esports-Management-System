/**
 * One-time password reset for a specific account.
 * Run from the server/ folder:
 *   node scripts/resetPassword.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const connectDB = require('../config/db');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const TARGET_EMAIL = 'mqhibek@ccc.edu.ph';
const NEW_PASSWORD = 'Arise@2025';

async function run() {
  await connectDB();

  const user = await User.findOne({ email: TARGET_EMAIL });
  if (!user) {
    console.log(`No account found for ${TARGET_EMAIL}`);
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(NEW_PASSWORD, salt);
  await user.save();

  console.log(`Password reset for ${user.name} (${user.role})`);
  console.log(`Email   : ${TARGET_EMAIL}`);
  console.log(`Password: ${NEW_PASSWORD}`);
  console.log(`\nPlease change this password after logging in.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
