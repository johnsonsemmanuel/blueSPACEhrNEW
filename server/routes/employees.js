const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.id, e.name, e.email, e.employee_id, e.phone, e.dob, e.gender,
             e.branch_id, e.department_id, e.designation_id, e.company_doj, e.is_active,
             e.address, e.user_id,
             d.name AS department_name, br.name AS branch_name,
             ds.name AS designation_name,
             u.avatar
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN branches br ON e.branch_id = br.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('Employees fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/list', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, employee_id FROM employees WHERE is_active = 1 ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('Employee list fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/departments', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('Departments fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/branches', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM branches ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('Branches fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/designations', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM designations ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('Designations fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { name, email, phone, address, dob, gender, department_id, branch_id, designation_id, company_doj, employee_id, is_active } = req.body;

    const [existing] = await pool.query('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await pool.query(
      `UPDATE employees SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        dob = COALESCE(?, dob),
        gender = COALESCE(?, gender),
        department_id = COALESCE(?, department_id),
        branch_id = COALESCE(?, branch_id),
        designation_id = COALESCE(?, designation_id),
        company_doj = COALESCE(?, company_doj),
        employee_id = COALESCE(?, employee_id),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?`,
      [name, email, phone, address, dob, gender, department_id, branch_id, designation_id, company_doj, employee_id, is_active, req.params.id]
    );

    const [updated] = await pool.query(`
      SELECT e.id, e.name, e.email, e.employee_id, e.phone, e.dob, e.gender,
             e.branch_id, e.department_id, e.designation_id, e.company_doj, e.is_active,
             e.address, e.user_id,
             d.name AS department_name, br.name AS branch_name,
             ds.name AS designation_name,
             u.avatar
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN branches br ON e.branch_id = br.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `, [req.params.id]);

    res.json(updated[0]);
  } catch (err) {
    console.error('Employee update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
