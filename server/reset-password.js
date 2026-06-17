require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/database');

async function resetPassword(email, newPass) {
  try {
    const hash = await bcrypt.hash(newPass, 10);
    const [result] = await pool.query('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
    if (result.affectedRows > 0) {
      console.log(`Password reset for ${email} -> "${newPass}"`);
    } else {
      console.log(`User not found: ${email}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

const email = process.argv[2];
const pass = process.argv[3];

if (!email || !pass) {
  console.log('Usage: node reset-password.js <email> <new-password>');
  console.log('Examples:');
  console.log('  node reset-password.js emmanuel@bluespaceafrica.com bluespace2025');
  console.log('  node reset-password.js onyekachi@bluespaceafrica.com admin123');
  process.exit(1);
}

resetPassword(email, pass);
