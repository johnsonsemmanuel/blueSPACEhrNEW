const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction, getClientIp } = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { startDate, endDate, category, branchId, departmentId, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT de.*, b.name AS branch_name, d.name AS department_name, u.name AS created_by_name
      FROM daily_expenses de
      LEFT JOIN branches b ON de.branch_id = b.id
      LEFT JOIN departments d ON de.department_id = d.id
      LEFT JOIN users u ON de.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND de.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND de.date <= ?';
      params.push(endDate);
    }
    if (category) {
      query += ' AND de.category = ?';
      params.push(category);
    }
    if (branchId) {
      query += ' AND de.branch_id = ?';
      params.push(branchId);
    }
    if (departmentId) {
      query += ' AND de.department_id = ?';
      params.push(departmentId);
    }

    query += ' ORDER BY de.date DESC, de.created_at DESC';

    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);

    const [total] = await pool.query(
      `SELECT COUNT(*) AS count FROM daily_expenses de WHERE 1=1
       ${startDate ? 'AND de.date >= ?' : ''}
       ${endDate ? 'AND de.date <= ?' : ''}
       ${category ? 'AND de.category = ?' : ''}
       ${branchId ? 'AND de.branch_id = ?' : ''}
       ${departmentId ? 'AND de.department_id = ?' : ''}`,
      params.slice(0, -2)
    );

    res.json({ data: rows, total: total[0].count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Expenses fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/summary', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { startDate, endDate, branchId, departmentId } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND date <= ?';
      params.push(endDate);
    }
    if (branchId) {
      whereClause += ' AND branch_id = ?';
      params.push(branchId);
    }
    if (departmentId) {
      whereClause += ' AND department_id = ?';
      params.push(departmentId);
    }

    const [total] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM daily_expenses ${whereClause}`,
      params
    );

    const [byCategory] = await pool.query(
      `SELECT category, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM daily_expenses ${whereClause}
       GROUP BY category ORDER BY total DESC`,
      params
    );

    const [byMonth] = await pool.query(
      `SELECT DATE_FORMAT(date, '%Y-%m') AS month, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM daily_expenses ${whereClause}
       GROUP BY month ORDER BY month DESC LIMIT 12`,
      params
    );

    const [byPaymentMethod] = await pool.query(
      `SELECT payment_method, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM daily_expenses ${whereClause}
       GROUP BY payment_method ORDER BY total DESC`,
      params
    );

    const [recent] = await pool.query(
      `SELECT de.*, b.name AS branch_name, d.name AS department_name
       FROM daily_expenses de
       LEFT JOIN branches b ON de.branch_id = b.id
       LEFT JOIN departments d ON de.department_id = d.id
       ${whereClause}
       ORDER BY de.date DESC, de.created_at DESC LIMIT 10`,
      params
    );

    res.json({
      total: parseFloat(total[0].total) || 0,
      count: total[0].count || 0,
      byCategory,
      byMonth,
      byPaymentMethod,
      recent
    });
  } catch (err) {
    console.error('Expenses summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/categories', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT category FROM daily_expenses ORDER BY category'
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    console.error('Categories fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/due', authenticate, authorize('Management'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const [rows] = await pool.query(
      `SELECT de.*, b.name AS branch_name, d.name AS department_name
       FROM daily_expenses de
       LEFT JOIN branches b ON de.branch_id = b.id
       LEFT JOIN departments d ON de.department_id = d.id
       WHERE de.status IN ('Pending', 'Overdue')
       AND de.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY de.due_date ASC`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    console.error('Due expenses fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/overdue', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT de.*, b.name AS branch_name, d.name AS department_name
       FROM daily_expenses de
       LEFT JOIN branches b ON de.branch_id = b.id
       LEFT JOIN departments d ON de.department_id = d.id
       WHERE de.status IN ('Pending', 'Overdue')
       AND de.due_date < CURDATE()
       ORDER BY de.due_date ASC`,
      []
    );
    // Mark as overdue
    await pool.query(
      "UPDATE daily_expenses SET status = 'Overdue', updated_at = NOW() WHERE status = 'Pending' AND due_date < CURDATE()"
    );
    res.json(rows);
  } catch (err) {
    console.error('Overdue expenses fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recurring', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT de.*, b.name AS branch_name, d.name AS department_name
       FROM daily_expenses de
       LEFT JOIN branches b ON de.branch_id = b.id
       LEFT JOIN departments d ON de.department_id = d.id
       WHERE de.is_recurring = 1
       ORDER BY de.next_due_date ASC`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error('Recurring expenses fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
  try {
    const { startDate, endDate, category, branchId, departmentId } = req.query;
    let query = `
      SELECT de.date, de.category, de.description, de.amount, de.payment_method,
             de.receipt_url, b.name AS branch, d.name AS department
      FROM daily_expenses de
      LEFT JOIN branches b ON de.branch_id = b.id
      LEFT JOIN departments d ON de.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND de.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND de.date <= ?';
      params.push(endDate);
    }
    if (category) {
      query += ' AND de.category = ?';
      params.push(category);
    }
    if (branchId) {
      query += ' AND de.branch_id = ?';
      params.push(branchId);
    }
    if (departmentId) {
      query += ' AND de.department_id = ?';
      params.push(departmentId);
    }

    query += ' ORDER BY de.date DESC';

    const [rows] = await pool.query(query, params);

    const fmt = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
    const header = 'Date,Category,Description,Amount,Payment Method,Receipt URL,Branch,Department\n';
    const csv = rows.map(r =>
      `${fmt(r.date)},"${r.category}","${(r.description||'').replace(/"/g,'""')}",${r.amount},"${r.payment_method}","${r.receipt_url||''}","${r.branch||''}","${r.department||''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses-report.csv');
    res.send(header + csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { date, category, description, amount, payment_method, receipt_url, branch_id, department_id } = req.body;

    if (!date || !category || !description || !amount) {
      return res.status(400).json({ error: 'Date, category, description, and amount are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO daily_expenses (date, category, description, amount, payment_method, receipt_url, branch_id, department_id, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [date, category, description, amount, payment_method || 'Cash', receipt_url || null, branch_id || null, department_id || null, req.user.id]
    );

    const [created] = await pool.query(
      `SELECT de.*, b.name AS branch_name, d.name AS department_name, u.name AS created_by_name
       FROM daily_expenses de
       LEFT JOIN branches b ON de.branch_id = b.id
       LEFT JOIN departments d ON de.department_id = d.id
       LEFT JOIN users u ON de.created_by = u.id
       WHERE de.id = ?`,
      [result.insertId]
    );

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'expense_created', entityType: 'expense', entityId: result.insertId,
      description: `${req.user.name} recorded expense: ${category} - ${description} (${amount})`,
      metadata: { category, description, amount, date, paymentMethod: payment_method || 'Cash' },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Expense create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { date, category, description, amount, payment_method, receipt_url, branch_id, department_id } = req.body;

    const [existing] = await pool.query('SELECT * FROM daily_expenses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const updates = [];
    const params = [];

    if (date !== undefined) { updates.push('date = ?'); params.push(date); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
    if (payment_method !== undefined) { updates.push('payment_method = ?'); params.push(payment_method); }
    if (receipt_url !== undefined) { updates.push('receipt_url = ?'); params.push(receipt_url); }
    if (branch_id !== undefined) { updates.push('branch_id = ?'); params.push(branch_id); }
    if (department_id !== undefined) { updates.push('department_id = ?'); params.push(department_id); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE daily_expenses SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      `SELECT de.*, b.name AS branch_name, d.name AS department_name, u.name AS created_by_name
       FROM daily_expenses de
       LEFT JOIN branches b ON de.branch_id = b.id
       LEFT JOIN departments d ON de.department_id = d.id
       LEFT JOIN users u ON de.created_by = u.id
       WHERE de.id = ?`,
      [req.params.id]
    );

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'expense_updated', entityType: 'expense', entityId: parseInt(req.params.id),
      description: `${req.user.name} updated expense #${req.params.id}`,
      metadata: { fields: updates.filter(u => u !== 'updated_at = NOW()').map(u => u.replace(' = ?', '')) },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.json(updated[0]);
  } catch (err) {
    console.error('Expense update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM daily_expenses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await pool.query('DELETE FROM daily_expenses WHERE id = ?', [req.params.id]);

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'expense_deleted', entityType: 'expense', entityId: parseInt(req.params.id),
      description: `${req.user.name} deleted expense: ${existing[0].category} - ${existing[0].description} (${existing[0].amount})`,
      metadata: { category: existing[0].category, amount: existing[0].amount },
      ip: getClientIp(req), severity: 'WARNING',
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Expense delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;