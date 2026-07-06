const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../services/email');

const router = express.Router();

// TEMPORARY debug route: send a test email to verify SMTP is configured and working.
router.post('/smtp-test', authenticate, async (req, res) => {
  const to = req.body.to || req.user.email;
  try {
    const ok = await sendEmail({
      to,
      subject: 'BlueSPACE SMTP test',
      html: '<p>This is a test email from the BlueSPACE HR System to verify SMTP sending works.</p>',
    });
    if (ok) {
      res.json({ ok: true, message: `Test email sent to ${to}` });
    } else {
      res.status(500).json({ ok: false, message: 'Email not sent. Check server logs — SMTP is likely not configured (SMTP_HOST/USER/PASS missing) or send failed.' });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// TEMPORARY debug route: replicate POST /leaves step by step and report the failing step.
router.post('/leave-create', authenticate, async (req, res) => {
  const steps = [];
  const log = (name, ok, detail) => steps.push({ step: name, ok, detail: detail || null });
  try {
    const { leave_type_id, start_date, end_date, leave_reason, handover_to, handover_notes, is_half_day, contact_during_leave, leave_address } = req.body;

    log('input-parsed', true, { leave_type_id, start_date, end_date, handover_to, is_half_day });

    const [leaveType] = await pool.query('SELECT id, title, days FROM leave_types WHERE id = ?', [leave_type_id]);
    log('leave-type-lookup', true, leaveType[0] || 'NOT FOUND');

    const [result] = await pool.query(
      `INSERT INTO leaves (employee_id, leave_type_id, applied_on, start_date, end_date, total_leave_days, leave_reason, handover_to, handover_notes, contact_during_leave, leave_address, is_half_day, status, created_by, created_at, updated_at)
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NOW(), NOW())`,
      [req.user.employeeId, leave_type_id, start_date, end_date, String(1), leave_reason || '', handover_to || null, handover_notes || '', contact_during_leave || '', leave_address || '', is_half_day ? 1 : 0, req.user.id]
    );
    log('leaves-insert', true, { insertId: result.insertId });

    const [managers] = await pool.query(`SELECT u.id, u.email, u.name FROM users u WHERE u.type IN ('Management','Manager')`);
    log('managers-lookup', true, managers.map(m => ({ id: m.id, type: m.type })));

    for (const m of managers) {
      try {
        await pool.query(
          'INSERT INTO notifications (user_id, type, data, is_read, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())',
          [m.id, 'leave_submitted', JSON.stringify({ leaveId: result.insertId, employeeName: req.user.name, leaveType: leaveType[0]?.title })]
        );
        log(`notification-insert-mgr-${m.id}`, true);
      } catch (e) {
        log(`notification-insert-mgr-${m.id}`, false, e.message);
      }
    }

    if (handover_to) {
      const [handoverUsers] = await pool.query(
        `SELECT u.id AS user_id, u.name, u.email FROM employees he JOIN users u ON he.user_id = u.id WHERE he.id = ?`,
        [handover_to]
      );
      log('handover-lookup', true, handoverUsers[0] || 'NO ROW');
      if (handoverUsers.length > 0) {
        try {
          await pool.query(
            'INSERT INTO notifications (user_id, type, data, is_read, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())',
            [handoverUsers[0].user_id, 'leave_handover', JSON.stringify({ leaveId: result.insertId, employeeName: req.user.name, leaveType: leaveType[0]?.title })]
          );
          log('notification-insert-handover', true);
        } catch (e) {
          log('notification-insert-handover', false, e.message);
        }
      }
    }

    res.json({ ok: true, insertId: result.insertId, steps });
  } catch (err) {
    res.status(500).json({ ok: false, fatalError: err.message, steps });
  }
});

module.exports = router;
