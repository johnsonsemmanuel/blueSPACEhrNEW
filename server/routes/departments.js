const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, b.name AS branch_name
      FROM departments d
      LEFT JOIN branches b ON d.branch_id = b.id
      ORDER BY d.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('Departments fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { name, branch_id } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Department name required' });
    }
    const [result] = await pool.query(
      'INSERT INTO departments (branch_id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [branch_id || 1, name, req.user.id]
    );
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    console.error('Department create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { name, branch_id } = req.body;
    await pool.query(
      'UPDATE departments SET branch_id = ?, name = ?, updated_at = NOW() WHERE id = ?',
      [branch_id || 1, name, req.params.id]
    );
    res.json({ message: 'Department updated' });
  } catch (err) {
    console.error('Department update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('Department delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
