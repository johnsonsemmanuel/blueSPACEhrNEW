const express = require('express');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.id, e.name, e.email, e.employee_id, e.phone, e.dob, e.gender,
             e.branch_id, e.department_id, e.designation_id, e.company_doj, e.is_active,
             e.address, e.user_id,
             e.next_of_kin_name, e.next_of_kin_phone, e.next_of_kin_relationship,
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

router.post('/', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { name, email, phone, address, dob, gender, department_id, branch_id, designation_id, company_doj, employee_id, is_active, password, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hash = await bcrypt.hash(password || 'changeme', 10);

    const [userResult] = await pool.query(
      'INSERT INTO users (name, email, password, type, phone, address, avatar, is_active, force_password_change, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [name, email, hash, 'Staff', phone || '', address || '', 'avatar.png', is_active !== 0 ? 1 : 0, 1, req.user.id]
    );

    const [empResult] = await pool.query(
      `INSERT INTO employees
        (user_id, name, email, phone, address, dob, gender, branch_id, department_id, designation_id, company_doj, employee_id, is_active, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userResult.insertId,
        name,
        email,
        phone || null,
        address || null,
        dob || null,
        gender || null,
        branch_id || 0,
        department_id || 0,
        designation_id || 0,
        company_doj || null,
        employee_id || '0',
        is_active !== 0 ? 1 : 0,
        next_of_kin_name || null,
        next_of_kin_phone || null,
        next_of_kin_relationship || null,
        req.user.id
      ]
    );

    const [created] = await pool.query(`
      SELECT e.id, e.name, e.email, e.employee_id, e.phone, e.dob, e.gender,
             e.branch_id, e.department_id, e.designation_id, e.company_doj, e.is_active,
             e.address, e.user_id,
             e.next_of_kin_name, e.next_of_kin_phone, e.next_of_kin_relationship,
             d.name AS department_name, br.name AS branch_name,
             ds.name AS designation_name,
             u.avatar
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN branches br ON e.branch_id = br.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `, [empResult.insertId]);

    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Employee create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { name, email, phone, address, dob, gender, department_id, branch_id, designation_id, company_doj, employee_id, is_active, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship } = req.body;

    const [existing] = await pool.query('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (address !== undefined) { updates.push('address = ?'); params.push(address); }
    if (dob !== undefined) { updates.push('dob = ?'); params.push(dob); }
    if (gender !== undefined) { updates.push('gender = ?'); params.push(gender); }
    if (department_id !== undefined) { updates.push('department_id = ?'); params.push(department_id); }
    if (branch_id !== undefined) { updates.push('branch_id = ?'); params.push(branch_id); }
    if (designation_id !== undefined) { updates.push('designation_id = ?'); params.push(designation_id); }
    if (company_doj !== undefined) { updates.push('company_doj = ?'); params.push(company_doj); }
    if (employee_id !== undefined) { updates.push('employee_id = ?'); params.push(employee_id); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (next_of_kin_name !== undefined) { updates.push('next_of_kin_name = ?'); params.push(next_of_kin_name); }
    if (next_of_kin_phone !== undefined) { updates.push('next_of_kin_phone = ?'); params.push(next_of_kin_phone); }
    if (next_of_kin_relationship !== undefined) { updates.push('next_of_kin_relationship = ?'); params.push(next_of_kin_relationship); }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(`
      SELECT e.id, e.name, e.email, e.employee_id, e.phone, e.dob, e.gender,
             e.branch_id, e.department_id, e.designation_id, e.company_doj, e.is_active,
             e.address, e.user_id,
             e.next_of_kin_name, e.next_of_kin_phone, e.next_of_kin_relationship,
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
