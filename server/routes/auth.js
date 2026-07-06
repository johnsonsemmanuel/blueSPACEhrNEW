const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function normalizeType(type) {
  const t = (type || '').toLowerCase();
  if (t === 'manager' || t === 'company') return 'Management';
  if (t === 'employee') return 'Staff';
  return t;
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [users] = await pool.query(
      'SELECT id, name, email, password, type, avatar, phone, address, force_password_change FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (users.length === 0) {
      console.warn('[login] No active user found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const storedHash = (user.password || '').replace(/^\$2y\$/, '$2a$');
    let valid = false;
    try {
      valid = await bcrypt.compare(password, storedHash);
    } catch (compareErr) {
      console.error('[login] bcrypt compare failed for user', user.id, compareErr);
    }
    if (!valid) {
      console.warn('[login] Password mismatch for user:', user.id, user.email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const [employees] = await pool.query(
      'SELECT id, employee_id, branch_id, department_id, designation_id FROM employees WHERE user_id = ?',
      [user.id]
    );

    const role = normalizeType(user.type);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        type: role,
        employeeId: employees[0]?.id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: role,
        avatar: user.avatar,
        phone: user.phone || '',
        address: user.address || '',
        employeeId: employees[0]?.id || null,
        employeeCode: employees[0]?.employee_id || null,
        forcePasswordChange: user.force_password_change === 1,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }

    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);

    const [users] = await pool.query(
      'SELECT id, name, email, type, avatar, phone, address, force_password_change FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const [employees] = await pool.query(
      'SELECT id, employee_id, department_id, designation_id, branch_id FROM employees WHERE user_id = ?',
      [user.id]
    );

    res.json({
      ...user,
      type: normalizeType(user.type),
      employeeId: employees[0]?.id || null,
      employeeCode: employees[0]?.employee_id || null,
      forcePasswordChange: user.force_password_change === 1,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ?, force_password_change = 0 WHERE email = ?', [hash, email]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }

    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { name, phone, address } = req.body;

    if (name) {
      await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, decoded.id]);
    }
    await pool.query('UPDATE users SET phone = ?, address = ? WHERE id = ?', [phone || '', address || '', decoded.id]);
    await pool.query('UPDATE employees SET phone = ?, address = ? WHERE user_id = ?', [phone || '', address || '', decoded.id]);

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }

    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    if (new_password.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, (users[0].password || '').replace(/^\$2y\$/, '$2a$'));
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ?, force_password_change = 0 WHERE id = ?', [hash, decoded.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: reset employee password and force change on next login
router.post('/admin/reset-employee-password', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { user_id, new_password } = req.body;

    if (!user_id || !new_password) {
      return res.status(400).json({ error: 'User ID and new password required' });
    }
    if (new_password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password = ?, force_password_change = 1 WHERE id = ?',
      [hash, user_id]
    );

    res.json({ message: 'Password reset. Employee must set new password on next login.' });
  } catch (err) {
    console.error('Admin password reset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
