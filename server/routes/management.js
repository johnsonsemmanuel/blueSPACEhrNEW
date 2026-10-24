const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction, getClientIp } = require('../utils/logger');
const { sendEmail } = require('../services/email');

const router = express.Router();

// Get all management settings
router.get('/settings', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ms.*, u.name AS created_by_name
       FROM management_settings ms
       LEFT JOIN users u ON ms.created_by = u.id
       ORDER BY ms.setting_key`
    );
    res.json(rows);
  } catch (err) {
    console.error('Settings fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific setting
router.get('/settings/:key', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ms.*, u.name AS created_by_name
       FROM management_settings ms
       LEFT JOIN users u ON ms.created_by = u.id
       WHERE ms.setting_key = ?`,
      [req.params.key]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Setting fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update a setting
router.put('/settings/:key', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { setting_value, description } = req.body;

    if (setting_value === undefined) {
      return res.status(400).json({ error: 'setting_value is required' });
    }

    const valueJson = typeof setting_value === 'object' ? JSON.stringify(setting_value) : setting_value;

    const [existing] = await pool.query(
      'SELECT * FROM management_settings WHERE setting_key = ?',
      [req.params.key]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE management_settings SET setting_value = ?, description = ?, updated_at = NOW() WHERE setting_key = ?`,
        [valueJson, description || existing[0].description, req.params.key]
      );
    } else {
      await pool.query(
        `INSERT INTO management_settings (setting_key, setting_value, description, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [req.params.key, valueJson, description || '', req.user.id]
      );
    }

    const [saved] = await pool.query(
      `SELECT ms.*, u.name AS created_by_name
       FROM management_settings ms
       LEFT JOIN users u ON ms.created_by = u.id
       WHERE ms.setting_key = ?`,
      [req.params.key]
    );

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: existing.length > 0 ? 'setting_updated' : 'setting_created',
      entityType: 'setting', entityId: req.params.key,
      description: `${req.user.name} ${existing.length > 0 ? 'updated' : 'created'} setting: ${req.params.key}`,
      metadata: { key: req.params.key, value: valueJson },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.json(saved[0]);
  } catch (err) {
    console.error('Setting save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a setting
router.delete('/settings/:key', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM management_settings WHERE setting_key = ?',
      [req.params.key]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    await pool.query('DELETE FROM management_settings WHERE setting_key = ?', [req.params.key]);

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'setting_deleted', entityType: 'setting', entityId: req.params.key,
      description: `${req.user.name} deleted setting: ${req.params.key}`,
      metadata: { key: req.params.key },
      ip: getClientIp(req), severity: 'WARNING',
    });

    res.json({ message: 'Setting deleted successfully' });
  } catch (err) {
    console.error('Setting delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Initialize default settings
router.post('/settings/init-defaults', authenticate, authorize('Management'), async (req, res) => {
  try {
    const defaults = [
      { key: 'tax_rate', value: 0.15, description: 'Income tax rate (e.g., 0.15 for 15%)' },
      { key: 'ssnit_rate', value: 0.055, description: 'SSNIT contribution rate (e.g., 0.055 for 5.5%)' },
      { key: 'pay_schedule', value: 'monthly', description: 'Pay schedule: weekly, biweekly, monthly' },
      { key: 'company_name', value: 'BlueSPACE HR', description: 'Company name for payslips' },
      { key: 'company_address', value: '', description: 'Company address for payslips' },
      { key: 'company_tax_id', value: '', description: 'Company tax identification number' },
      { key: 'company_logo', value: '', description: 'Company logo URL for payslips' },
      { key: 'currency', value: 'GHS', description: 'Currency code' },
      { key: 'overtime_multiplier', value: 1.5, description: 'Overtime pay multiplier' },
      { key: 'expense_categories', value: ['Office Supplies', 'Utilities', 'Travel', 'Meals', 'Equipment', 'Marketing', 'Maintenance', 'Other'], description: 'Default expense categories' },
      { key: 'reminder_days_before', value: 3, description: 'Default days before due date for payment reminders' },
    ];

    for (const setting of defaults) {
      const [existing] = await pool.query(
        'SELECT setting_key FROM management_settings WHERE setting_key = ?',
        [setting.key]
      );

      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO management_settings (setting_key, setting_value, description, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [setting.key, JSON.stringify(setting.value), setting.description, req.user.id]
        );
      }
    }

    res.json({ message: 'Default settings initialized' });
  } catch (err) {
    console.error('Settings init error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Payment Reminders
router.get('/reminders', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { status, category, startDate, endDate } = req.query;
    let query = `
      SELECT pr.*, b.name AS branch_name, d.name AS department_name, u.name AS created_by_name
      FROM payment_reminders pr
      LEFT JOIN branches b ON pr.branch_id = b.id
      LEFT JOIN departments d ON pr.department_id = d.id
      LEFT JOIN users u ON pr.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND pr.status = ?';
      params.push(status);
    }
    if (category) {
      query += ' AND pr.category = ?';
      params.push(category);
    }
    if (startDate) {
      query += ' AND pr.due_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND pr.due_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY pr.due_date ASC, pr.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Reminders fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get upcoming reminders (due soon)
router.get('/reminders/upcoming', authenticate, authorize('Management'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const [rows] = await pool.query(
      `SELECT pr.*, b.name AS branch_name, d.name AS department_name
       FROM payment_reminders pr
       LEFT JOIN branches b ON pr.branch_id = b.id
       LEFT JOIN departments d ON pr.department_id = d.id
       WHERE pr.status = 'Pending'
       AND pr.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY pr.due_date ASC`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    console.error('Upcoming reminders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create payment reminder
router.post('/reminders', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { title, description, amount, due_date, category, branch_id, department_id, reminder_days_before, related_type, related_id } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due date are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO payment_reminders
         (title, description, amount, due_date, category, branch_id, department_id,
          reminder_days_before, related_type, related_id, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, description || null, amount || null, due_date, category || 'General',
       branch_id || null, department_id || null, reminder_days_before || 3,
       related_type || null, related_id || null, req.user.id]
    );

    const [created] = await pool.query(
      `SELECT pr.*, b.name AS branch_name, d.name AS department_name, u.name AS created_by_name
       FROM payment_reminders pr
       LEFT JOIN branches b ON pr.branch_id = b.id
       LEFT JOIN departments d ON pr.department_id = d.id
       LEFT JOIN users u ON pr.created_by = u.id
       WHERE pr.id = ?`,
      [result.insertId]
    );

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'reminder_created', entityType: 'reminder', entityId: result.insertId,
      description: `${req.user.name} created payment reminder: ${title} (due ${due_date})`,
      metadata: { title, dueDate: due_date, amount, category: category || 'General' },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Reminder create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update payment reminder
router.put('/reminders/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { title, description, amount, due_date, category, branch_id, department_id, reminder_days_before, status, related_type, related_id } = req.body;

    const [existing] = await pool.query('SELECT * FROM payment_reminders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (branch_id !== undefined) { updates.push('branch_id = ?'); params.push(branch_id); }
    if (department_id !== undefined) { updates.push('department_id = ?'); params.push(department_id); }
    if (reminder_days_before !== undefined) { updates.push('reminder_days_before = ?'); params.push(reminder_days_before); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (related_type !== undefined) { updates.push('related_type = ?'); params.push(related_type); }
    if (related_id !== undefined) { updates.push('related_id = ?'); params.push(related_id); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE payment_reminders SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      `SELECT pr.*, b.name AS branch_name, d.name AS department_name, u.name AS created_by_name
       FROM payment_reminders pr
       LEFT JOIN branches b ON pr.branch_id = b.id
       LEFT JOIN departments d ON pr.department_id = d.id
       LEFT JOIN users u ON pr.created_by = u.id
       WHERE pr.id = ?`,
      [req.params.id]
    );

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'reminder_updated', entityType: 'reminder', entityId: parseInt(req.params.id),
      description: `${req.user.name} updated payment reminder #${req.params.id}`,
      metadata: { fields: updates.filter(u => u !== 'updated_at = NOW()').map(u => u.replace(' = ?', '')) },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.json(updated[0]);
  } catch (err) {
    console.error('Reminder update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send reminder notification for payment via email and SMS
router.post('/reminders/:id/notify', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM payment_reminders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const reminder = existing[0];

    // Get all management users to notify
    const [managers] = await pool.query(
      `SELECT u.id, u.email, u.name, u.phone
       FROM users u WHERE u.type = 'Management' AND u.is_active = 1`
    );

    const [recipients] = await pool.query(
      `SELECT email, phone, name FROM users WHERE type IN ('Management', 'Manager') AND is_active = 1`
    );

    // Send emails
    for (const recipient of recipients) {
      if (recipient.email) {
        const html = `
          <h2>Payment Reminder</h2>
          <p>Hello ${recipient.name},</p>
          <p>This is a reminder to make payment for the following:</p>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
            <tr><td><strong>Title</strong></td><td>${reminder.title}</td></tr>
            <tr><td><strong>Due Date</strong></td><td>${reminder.due_date}</td></tr>
            <tr><td><strong>Category</strong></td><td>${reminder.category}</td></tr>
            ${reminder.amount ? `<tr><td><strong>Amount</strong></td><td>₵${reminder.amount}</td></tr>` : ''}
            ${reminder.description ? `<tr><td><strong>Description</strong></td><td>${reminder.description}</td></tr>` : ''}
          </table>
          <p>Please make the payment before the due date.</p>
          <hr>
          <p style="color:#888;font-size:12px;">BlueSPACE HR System - Payment Reminder</p>
        `;
        await sendEmail({ to: recipient.email, subject: `Payment Reminder: ${reminder.title} - Due ${reminder.due_date}`, html });
      }
    }

    // Update last reminded
    await pool.query(
      'UPDATE payment_reminders SET last_reminded_at = NOW(), updated_at = NOW() WHERE id = ?',
      [req.params.id]
    );

    // Create notifications
    for (const manager of managers) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, data, is_read, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())',
        [manager.id, 'payment_reminder', JSON.stringify({ reminderId: reminder.id, title: reminder.title, dueDate: reminder.due_date, amount: reminder.amount })]
      );
    }

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'reminder_notified', entityType: 'reminder', entityId: parseInt(req.params.id),
      description: `${req.user.name} sent payment reminder notification for: ${reminder.title}`,
      metadata: { title: reminder.title, dueDate: reminder.due_date },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.json({ message: 'Reminders sent via email and notifications' });
  } catch (err) {
    console.error('Reminder notify error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payment reminders with due dates approaching
router.get('/reminders/overdue', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pr.*, b.name AS branch_name, d.name AS department_name
       FROM payment_reminders pr
       LEFT JOIN branches b ON pr.branch_id = b.id
       LEFT JOIN departments d ON pr.department_id = d.id
       WHERE pr.status = 'Pending'
       AND pr.due_date < CURDATE()
       ORDER BY pr.due_date ASC`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('Overdue reminders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

