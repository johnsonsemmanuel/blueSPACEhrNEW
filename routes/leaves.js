const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sendHandoverNotification, sendLeaveSubmittedNotification, sendLeaveStatusNotification } = require('../services/email');

const router = express.Router();

const LEAVE_FIELDS = `l.*, lt.title AS leave_type_name,
  e.name AS employee_name, e.employee_id AS employee_code,
  he.name AS handover_name`;

router.get('/', authenticate, async (req, res) => {
  try {
    const isMgmt = req.user.type === 'Management';
    let query;
    let params = [];

    if (isMgmt) {
      query = `
        SELECT ${LEAVE_FIELDS}, d.name AS department_name
        FROM leaves l
        JOIN leave_types lt ON l.leave_type_id = lt.id
        JOIN employees e ON l.employee_id = e.id
        LEFT JOIN employees he ON l.handover_to = he.id
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY l.created_at DESC
      `;
    } else {
      query = `
        SELECT ${LEAVE_FIELDS}
        FROM leaves l
        JOIN leave_types lt ON l.leave_type_id = lt.id
        JOIN employees e ON l.employee_id = e.id
        LEFT JOIN employees he ON l.handover_to = he.id
        WHERE l.employee_id = ?
        ORDER BY l.created_at DESC
      `;
      params = [req.user.employeeId];
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Leaves fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/calendar', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.id, l.start_date, l.end_date,
             e.name AS title, lt.title AS leave_type,
             l.status, l.is_half_day, l.employee_id
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      JOIN leave_types lt ON l.leave_type_id = lt.id
      WHERE l.status = 'Approved'
    `);
    res.json(rows);
  } catch (err) {
    console.error('Calendar fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/holidays', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, date, end_date, occasion FROM holidays WHERE YEAR(date) >= YEAR(CURDATE()) - 1 ORDER BY date'
    );
    res.json(rows);
  } catch (err) {
    console.error('Holidays fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/on-leave', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.id, e.name, e.employee_id AS employee_code,
             lt.title AS leave_type, l.start_date, l.end_date, l.is_half_day
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      JOIN leave_types lt ON l.leave_type_id = lt.id
      WHERE l.status = 'Approved' AND CURDATE() BETWEEN l.start_date AND l.end_date
      ORDER BY l.start_date
    `);
    res.json(rows);
  } catch (err) {
    console.error('On leave fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.id, e.name AS employee, e.employee_id AS code,
             lt.title AS leave_type, l.start_date, l.end_date,
             l.total_leave_days, l.leave_reason, l.status, l.remark,
             l.applied_on, l.is_half_day
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      JOIN leave_types lt ON l.leave_type_id = lt.id
      ORDER BY l.created_at DESC
    `);

    const fmt = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
    const header = 'ID,Employee,Code,Leave Type,Start,End,Days,Reason,Status,Remark,Applied,Half Day\n';
    const csv = rows.map(r =>
      `${r.id},"${r.employee}","${r.code}","${r.leave_type}","${fmt(r.start_date)}","${fmt(r.end_date)}",${r.total_leave_days},"${(r.leave_reason||'').replace(/"/g,'""')}","${r.status}","${(r.remark||'').replace(/"/g,'""')}","${fmt(r.applied_on)}",${r.is_half_day ? 'Yes' : 'No'}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leave-report.csv');
    res.send(header + csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/balance', authenticate, async (req, res) => {
  try {
    const [leaveTypes] = await pool.query('SELECT id, title, days FROM leave_types');
    const [usedLeaves] = await pool.query(
      `SELECT leave_type_id, SUM(CAST(total_leave_days AS UNSIGNED)) AS used_days
       FROM leaves WHERE employee_id = ? AND status = 'Approved'
       GROUP BY leave_type_id`,
      [req.user.employeeId]
    );

    const usedMap = {};
    usedLeaves.forEach(r => { usedMap[r.leave_type_id] = parseInt(r.used_days) || 0; });

    const balance = leaveTypes.map(lt => ({
      id: lt.id,
      title: lt.title,
      total: lt.days,
      used: usedMap[lt.id] || 0,
      remaining: lt.days - (usedMap[lt.id] || 0),
    }));

    res.json(balance);
  } catch (err) {
    console.error('Balance fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my-stats', authenticate, async (req, res) => {
  try {
    const [total] = await pool.query(
      'SELECT COUNT(*) AS count FROM leaves WHERE employee_id = ?',
      [req.user.employeeId]
    );
    const [pending] = await pool.query(
      "SELECT COUNT(*) AS count FROM leaves WHERE employee_id = ? AND status = 'Pending'",
      [req.user.employeeId]
    );
    const [approved] = await pool.query(
      "SELECT COUNT(*) AS count FROM leaves WHERE employee_id = ? AND status = 'Approved'",
      [req.user.employeeId]
    );
    const [rejected] = await pool.query(
      "SELECT COUNT(*) AS count FROM leaves WHERE employee_id = ? AND status = 'Rejected'",
      [req.user.employeeId]
    );
    const [balance] = await pool.query(
      `SELECT lt.title, lt.days AS total,
              COALESCE(SUM(CAST(l.total_leave_days AS UNSIGNED)), 0) AS used
       FROM leave_types lt
       LEFT JOIN leaves l ON l.leave_type_id = lt.id AND l.employee_id = ? AND l.status = 'Approved'
       GROUP BY lt.id, lt.title, lt.days`,
      [req.user.employeeId]
    );

    res.json({ total: total[0].count, pending: pending[0].count, approved: approved[0].count, rejected: rejected[0].count, balance });
  } catch (err) {
    console.error('My stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/handover-to-me', authenticate, async (req, res) => {
  try {
    const [emp] = await pool.query('SELECT id FROM employees WHERE user_id = ?', [req.user.id]);
    if (emp.length === 0) return res.json([]);

    const [rows] = await pool.query(`
      SELECT l.id, l.start_date, l.end_date, l.is_half_day, l.total_leave_days,
             l.handover_notes, l.status,
             lt.title AS leave_type_name,
             e.name AS employee_name, e.employee_id AS employee_code
      FROM leaves l
      JOIN leave_types lt ON l.leave_type_id = lt.id
      JOIN employees e ON l.employee_id = e.id
      WHERE l.handover_to = ? AND l.status IN ('Approved','Pending')
      ORDER BY l.start_date DESC
    `, [emp[0].id]);

    res.json(rows);
  } catch (err) {
    console.error('Handover fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [total] = await pool.query('SELECT COUNT(*) AS count FROM leaves');
    const [pending] = await pool.query("SELECT COUNT(*) AS count FROM leaves WHERE status = 'Pending'");
    const [approved] = await pool.query("SELECT COUNT(*) AS count FROM leaves WHERE status = 'Approved'");
    const [rejected] = await pool.query("SELECT COUNT(*) AS count FROM leaves WHERE status = 'Rejected'");
    const [employees] = await pool.query("SELECT COUNT(*) AS count FROM employees WHERE is_active = 1");
    const [onLeave] = await pool.query(
      "SELECT COUNT(DISTINCT employee_id) AS count FROM leaves WHERE status = 'Approved' AND CURDATE() BETWEEN start_date AND end_date"
    );

    res.json({ total: total[0].count, pending: pending[0].count, approved: approved[0].count, rejected: rejected[0].count, employees: employees[0].count, onLeave: onLeave[0].count });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    const [unread] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ notifications: rows, unread: unread[0].count });
  } catch (err) {
    console.error('Notifications fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function notifyLeaveSubmitted({ leaveId, employeeName, leaveTitle, start_date, end_date, leave_reason, handover_to, handover_notes, totalDays }) {
  let handoverName = null;
  if (handover_to) {
    const [huRows] = await pool.query(
      `SELECT u.name FROM employees he JOIN users u ON he.user_id = u.id WHERE he.id = ?`,
      [handover_to]
    );
    if (huRows.length > 0) handoverName = huRows[0].name;
  }

  const [managers] = await pool.query(
    `SELECT u.id, u.email, u.name, u.type FROM users u WHERE LOWER(u.type) IN ('management','manager','company')`
  );
  for (const m of managers) {
    console.log(`[notify] leave ${leaveId} -> admin ${m.name} <${m.email}> (type=${m.type || 'n/a'})`);
    await pool.query(
      'INSERT INTO notifications (user_id, type, data, is_read, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())',
      [m.id, 'leave_submitted', JSON.stringify({ leaveId, employeeName, leaveType: leaveTitle })]
    );
    const sent = await sendLeaveSubmittedNotification({
      toEmail: m.email,
      toName: m.name,
      fromName: employeeName,
      leaveType: leaveTitle,
      startDate: start_date,
      endDate: end_date,
      reason: leave_reason,
      leaveId,
      totalDays,
      handoverName,
    });
    console.log(`[notify] admin email to ${m.email}: ${sent ? 'SENT' : 'SKIPPED/FAILED'}`);
  }

  if (handover_to) {
    const [handoverUsers] = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email
       FROM employees he
       JOIN users u ON he.user_id = u.id
       WHERE he.id = ?`,
      [handover_to]
    );
    if (handoverUsers.length > 0) {
      const hu = handoverUsers[0];
      await pool.query(
        'INSERT INTO notifications (user_id, type, data, is_read, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())',
        [hu.user_id, 'leave_handover', JSON.stringify({ leaveId, employeeName, leaveType: leaveTitle, startDate: start_date, endDate: end_date })]
      );
      const sentHo = await sendHandoverNotification({
        toEmail: hu.email,
        toName: hu.name,
        fromName: employeeName,
        leaveType: leaveTitle,
        startDate: start_date,
        endDate: end_date,
        notes: handover_notes,
        leaveId,
      });
      console.log(`[notify] handover email to ${hu.email}: ${sentHo ? 'SENT' : 'SKIPPED/FAILED'}`);
    }
  }
}

function getDateRange(start, end) {
  const dates = [];
  const current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function countWorkingDays(start_date, end_date) {
  const allDates = getDateRange(start_date, end_date);
  const [holidays] = await pool.query('SELECT date, end_date FROM holidays');
  const holidaySet = new Set();
  holidays.forEach(h => {
    const hDates = getDateRange(h.date, h.end_date || h.date);
    hDates.forEach(d => holidaySet.add(d));
  });
  return allDates.filter(d => {
    const day = new Date(d).getDay();
    return day !== 0 && day !== 6 && !holidaySet.has(d);
  }).length;
}

router.post('/', authenticate, async (req, res) => {
  try {
    const { leave_type_id, start_date, end_date, leave_reason, handover_to, handover_notes, is_half_day, contact_during_leave, leave_address } = req.body;

    if (!leave_type_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Leave type, start date, and end date required' });
    }
    if (!leave_reason || !leave_reason.trim()) {
      return res.status(400).json({ error: 'Leave reason is required' });
    }
    if (!handover_to) {
      return res.status(400).json({ error: 'Handover staff is required' });
    }

    let diffDays;
    if (is_half_day) {
      diffDays = 0.5;
    } else {
      diffDays = await countWorkingDays(start_date, end_date);
      if (diffDays === 0) diffDays = 1;
    }

    const [leaveType] = await pool.query(
      'SELECT id, title, days FROM leave_types WHERE id = ?',
      [leave_type_id]
    );
    if (leaveType.length === 0) {
      return res.status(400).json({ error: 'Invalid leave type' });
    }

    const [usedRows] = await pool.query(
      `SELECT COALESCE(SUM(CAST(total_leave_days AS DECIMAL(10,1))), 0) AS used
       FROM leaves WHERE employee_id = ? AND leave_type_id = ? AND status = 'Approved'`,
      [req.user.employeeId, leave_type_id]
    );
    const used = parseFloat(usedRows[0].used) || 0;
    if (used + diffDays > leaveType[0].days) {
      return res.status(400).json({
        error: `Insufficient balance. You have ${leaveType[0].days - used} days remaining of ${leaveType[0].title}.`,
      });
    }

    const [result] = await pool.query(
      `INSERT INTO leaves (employee_id, leave_type_id, applied_on, start_date, end_date, total_leave_days, leave_reason, handover_to, handover_notes, contact_during_leave, leave_address, is_half_day, status, created_by, created_at, updated_at)
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NOW(), NOW())`,
      [req.user.employeeId, leave_type_id, start_date, end_date, String(diffDays), leave_reason || '', handover_to || null, handover_notes || '', contact_during_leave || '', leave_address || '', is_half_day ? 1 : 0, req.user.id]
    );

    const leaveId = result.insertId;
    const employeeName = req.user.name;
    const leaveTitle = leaveType[0].title;

    res.status(201).json({ id: leaveId, message: 'Leave request submitted' });

    notifyLeaveSubmitted({
      leaveId,
      employeeName,
      leaveTitle,
      start_date,
      end_date,
      leave_reason,
      handover_to,
      handover_notes,
      totalDays: diffDays,
    }).catch((notifyErr) => {
      console.error('Leave notification error (non-fatal):', notifyErr);
    });
  } catch (err) {
    console.error('Leave create error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { leave_type_id, start_date, end_date, leave_reason, handover_to, handover_notes, is_half_day, contact_during_leave, leave_address } = req.body;

    const [existing] = await pool.query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    const leave = existing[0];
    const isOwner = leave.employee_id === req.user.employeeId;
    const isMgmt = req.user.type === 'Management';

    if (!isOwner && !isMgmt) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (leave.status !== 'Pending' && !isMgmt) {
      return res.status(400).json({ error: 'Only pending leaves can be edited' });
    }

    let diffDays;
    if (is_half_day) {
      diffDays = 0.5;
    } else {
      diffDays = await countWorkingDays(start_date || leave.start_date, end_date || leave.end_date);
      if (diffDays === 0) diffDays = 1;
    }

    if (leave_type_id || start_date || end_date) {
      const ltId = leave_type_id || leave.leave_type_id;
      const [leaveType] = await pool.query('SELECT id, title, days FROM leave_types WHERE id = ?', [ltId]);
      if (leaveType.length === 0) {
        return res.status(400).json({ error: 'Invalid leave type' });
      }
      const [usedRows] = await pool.query(
        `SELECT COALESCE(SUM(CAST(total_leave_days AS DECIMAL(10,1))), 0) AS used
         FROM leaves WHERE employee_id = ? AND leave_type_id = ? AND status = 'Approved' AND id != ?`,
        [leave.employee_id, ltId, req.params.id]
      );
      const used = parseFloat(usedRows[0].used) || 0;
      if (used + diffDays > leaveType[0].days) {
        return res.status(400).json({
          error: `Insufficient balance. You have ${leaveType[0].days - used} days remaining of ${leaveType[0].title}.`,
        });
      }
    }

    await pool.query(
      `UPDATE leaves SET leave_type_id = ?, start_date = ?, end_date = ?, total_leave_days = ?,
       leave_reason = ?, handover_to = ?, handover_notes = ?, contact_during_leave = ?,
       leave_address = ?, is_half_day = ?, updated_at = NOW() WHERE id = ?`,
      [
        leave_type_id || leave.leave_type_id,
        start_date || leave.start_date,
        end_date || leave.end_date,
        String(diffDays),
        leave_reason !== undefined ? leave_reason : leave.leave_reason,
        handover_to !== undefined ? (handover_to || null) : leave.handover_to,
        handover_notes !== undefined ? (handover_notes || '') : leave.handover_notes,
        contact_during_leave !== undefined ? (contact_during_leave || '') : leave.contact_during_leave,
        leave_address !== undefined ? (leave_address || '') : leave.leave_address,
        is_half_day !== undefined ? (is_half_day ? 1 : 0) : leave.is_half_day,
        req.params.id
      ]
    );

    res.json({ message: 'Leave updated successfully' });
  } catch (err) {
    console.error('Leave update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/status', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { status, remark } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved or Rejected' });
    }

    await pool.query(
      'UPDATE leaves SET status = ?, remark = ?, updated_at = NOW() WHERE id = ?',
      [status, remark || '', req.params.id]
    );

    const [leaves] = await pool.query(
      `SELECT l.*, e.name AS employee_name, e.user_id, u.email AS employee_email, u.name AS employee_email_name, lt.title AS leave_type_name FROM leaves l JOIN employees e ON l.employee_id = e.id JOIN leave_types lt ON l.leave_type_id = lt.id JOIN users u ON e.user_id = u.id WHERE l.id = ?`,
      [req.params.id]
    );
    if (leaves.length > 0) {
      const lv = leaves[0];
      await pool.query(
        'INSERT INTO notifications (user_id, type, data, is_read, created_at, updated_at) VALUES (?, ?, ?, 0, NOW(), NOW())',
        [lv.user_id, `leave_${status.toLowerCase()}`, JSON.stringify({ leaveId: req.params.id, leaveType: lv.leave_type_name, status, reviewer: req.user.name })]
      );
      const sentStatus = await sendLeaveStatusNotification({
        toEmail: lv.employee_email,
        toName: lv.employee_email_name,
        leaveType: lv.leave_type_name,
        status,
        reviewer: req.user.name,
        startDate: lv.start_date,
        endDate: lv.end_date,
        remark,
        leaveId: req.params.id,
        totalDays: lv.total_leave_days,
        remark,
      });
      console.log(`[notify] status (${status}) email to ${lv.employee_email}: ${sentStatus ? 'SENT' : 'SKIPPED/FAILED'}`);
    }

    res.json({ message: `Leave ${status.toLowerCase()}` });
  } catch (err) {
    console.error('Leave status update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [leaves] = await pool.query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
    if (leaves.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }

    const isMgmt = req.user.type === 'Management';

    if (!isMgmt) {
      if (leaves[0].employee_id !== req.user.employeeId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      if (leaves[0].status !== 'Pending') {
        return res.status(400).json({ error: 'Only pending leaves can be deleted' });
      }
    }

    await pool.query('DELETE FROM leaves WHERE id = ?', [req.params.id]);
    res.json({ message: 'Leave deleted successfully' });
  } catch (err) {
    console.error('Leave delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const [leaves] = await pool.query(
      'SELECT * FROM leaves WHERE id = ? AND employee_id = ?',
      [req.params.id, req.user.employeeId]
    );
    if (leaves.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    if (leaves[0].status !== 'Pending') {
      return res.status(400).json({ error: 'Only pending leaves can be cancelled' });
    }

    await pool.query(
      "UPDATE leaves SET status = 'Cancelled', updated_at = NOW() WHERE id = ?",
      [req.params.id]
    );

    res.json({ message: 'Leave cancelled successfully' });
  } catch (err) {
    console.error('Leave cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Notification read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Notification read all error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
