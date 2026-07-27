async function logAction(pool, { userId, userName, userRole, action, entityType, entityId, description, metadata, ip, severity }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, description, metadata, ip_address, severity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId || null,
        userName || null,
        userRole || null,
        action,
        entityType || null,
        entityId || null,
        description || '',
        metadata ? JSON.stringify(metadata) : null,
        ip || null,
        severity || 'INFO',
      ]
    );
  } catch (err) {
    console.error('[audit-log] Failed to write log:', err.message);
  }
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
}

module.exports = { logAction, getClientIp };
