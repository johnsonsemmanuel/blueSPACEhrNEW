const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction, getClientIp } = require('../utils/logger');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_types ORDER BY title');
    res.json(rows);
  } catch (err) {
    console.error('Leave types fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { title, days } = req.body;
    if (!title || !days) {
      return res.status(400).json({ error: 'Title and days required' });
    }
    const [result] = await pool.query(
      'INSERT INTO leave_types (title, days, created_by, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [title, parseInt(days), req.user.id]
    );
    res.status(201).json({ id: result.insertId, title, days });

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'leave_type_created', entityType: 'leave_type', entityId: result.insertId,
      description: `${req.user.name} created leave type "${title}" (${days} days)`,
      ip: getClientIp(req), severity: 'INFO',
    });
  } catch (err) {
    console.error('Leave type create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { title, days } = req.body;
    await pool.query(
      'UPDATE leave_types SET title = ?, days = ?, updated_at = NOW() WHERE id = ?',
      [title, parseInt(days), req.params.id]
    );
    res.json({ message: 'Leave type updated' });

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'leave_type_updated', entityType: 'leave_type', entityId: parseInt(req.params.id),
      description: `${req.user.name} updated leave type "${title}" (${days} days)`,
      ip: getClientIp(req), severity: 'INFO',
    });
  } catch (err) {
    console.error('Leave type update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    await pool.query('DELETE FROM leave_types WHERE id = ?', [req.params.id]);

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'leave_type_deleted', entityType: 'leave_type', entityId: parseInt(req.params.id),
      description: `${req.user.name} deleted leave type #${req.params.id}`,
      ip: getClientIp(req), severity: 'WARNING',
    });

    res.json({ message: 'Leave type deleted' });
  } catch (err) {
    console.error('Leave type delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
