const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction, getClientIp } = require('../utils/logger');

const router = express.Router();

// Get all payslips with filters
router.get('/', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { employeeId, periodStart, periodEnd, status, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT p.*, e.name AS employee_name, e.employee_id AS employee_code,
             d.name AS department_name, u.name AS generated_by_name
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON p.generated_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (employeeId) {
      query += ' AND p.employee_id = ?';
      params.push(employeeId);
    }
    if (periodStart) {
      query += ' AND p.period_start >= ?';
      params.push(periodStart);
    }
    if (periodEnd) {
      query += ' AND p.period_end <= ?';
      params.push(periodEnd);
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.period_start DESC, p.created_at DESC';

    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [rows] = await pool.query(query, params);

    const [total] = await pool.query(
      `SELECT COUNT(*) AS count FROM payslips p WHERE 1=1
       ${employeeId ? 'AND p.employee_id = ?' : ''}
       ${periodStart ? 'AND p.period_start >= ?' : ''}
       ${periodEnd ? 'AND p.period_end <= ?' : ''}
       ${status ? 'AND p.status = ?' : ''}`,
      params.slice(0, -2)
    );

    res.json({ data: rows, total: total[0].count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Payslips fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payslips for a specific employee (for employee view)
router.get('/employee/:employeeId', authenticate, async (req, res) => {
  try {
    const isMgmt = req.user.type === 'Management';
    const targetEmployeeId = parseInt(req.params.employeeId);

    if (!isMgmt && req.user.employeeId !== targetEmployeeId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [rows] = await pool.query(
      `SELECT p.*, u.name AS generated_by_name
       FROM payslips p
       LEFT JOIN users u ON p.generated_by = u.id
       WHERE p.employee_id = ?
       ORDER BY p.period_start DESC`,
      [targetEmployeeId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Employee payslips fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payslip summary/stats
router.get('/summary', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (periodStart) {
      whereClause += ' AND period_start >= ?';
      params.push(periodStart);
    }
    if (periodEnd) {
      whereClause += ' AND period_end <= ?';
      params.push(periodEnd);
    }

    const [stats] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) AS draft,
         SUM(CASE WHEN status = 'Generated' THEN 1 ELSE 0 END) AS generated,
         SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS paid,
         SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
         COALESCE(SUM(gross_pay), 0) AS total_gross,
         COALESCE(SUM(net_pay), 0) AS total_net,
         COALESCE(SUM(total_deductions), 0) AS total_deductions
       FROM payslips ${whereClause}`,
      params
    );

    const [byDepartment] = await pool.query(
      `SELECT d.name AS department, COUNT(*) AS count,
              COALESCE(SUM(p.gross_pay), 0) AS total_gross,
              COALESCE(SUM(p.net_pay), 0) AS total_net
       FROM payslips p
       JOIN employees e ON p.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       ${whereClause}
       GROUP BY d.id, d.name
       ORDER BY total_gross DESC`,
      params
    );

    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(net_pay), 0) AS total
       FROM payslips ${whereClause}
       GROUP BY status`,
      params
    );

    res.json({ ...stats[0], byDepartment, byStatus });
  } catch (err) {
    console.error('Payslips summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export payslips to CSV
router.get('/export', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { employeeId, periodStart, periodEnd, status } = req.query;
    let query = `
      SELECT p.*, e.name AS employee, e.employee_id AS code, d.name AS department
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (employeeId) {
      query += ' AND p.employee_id = ?';
      params.push(employeeId);
    }
    if (periodStart) {
      query += ' AND p.period_start >= ?';
      params.push(periodStart);
    }
    if (periodEnd) {
      query += ' AND p.period_end <= ?';
      params.push(periodEnd);
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.period_start DESC';

    const [rows] = await pool.query(query, params);

    const fmt = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
    const header = 'ID,Employee,Code,Department,Period Start,Period End,Basic Salary,Allowances,Overtime,Bonus,Gross Pay,Tax,SSNIT,Other Deductions,Total Deductions,Net Pay,Status,Generated By,Paid At,Notes\n';
    const csv = rows.map(r =>
      `${r.id},"${r.employee}","${r.code}","${r.department||''}","${fmt(r.period_start)}","${fmt(r.period_end)}",${r.basic_salary},${r.allowances},${r.overtime_pay},${r.bonus},${r.gross_pay},${r.tax_deduction},${r.ssnit_deduction},${r.other_deductions},${r.total_deductions},${r.net_pay},"${r.status}","${r.generated_by_name||''}",${fmt(r.paid_at)},"${(r.notes||'').replace(/"/g,'""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payslips-report.csv');
    res.send(header + csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get employee salary configuration
router.get('/salaries', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT es.*, e.name AS employee_name, e.employee_id AS employee_code, d.name AS department_name
      FROM employee_salaries es
      JOIN employees e ON es.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('Salaries fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get salary for specific employee
router.get('/salaries/:employeeId', authenticate, async (req, res) => {
  try {
    const isMgmt = req.user.type === 'Management';
    const targetEmployeeId = parseInt(req.params.employeeId);

    if (!isMgmt && req.user.employeeId !== targetEmployeeId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [rows] = await pool.query(
      `SELECT es.*, e.name AS employee_name, e.employee_id AS employee_code
       FROM employee_salaries es
       JOIN employees e ON es.employee_id = e.id
       WHERE es.employee_id = ?`,
      [targetEmployeeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Salary configuration not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Salary fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update employee salary
router.post('/salaries', authenticate, authorize('Management'), async (req, res) => {
  try {
    const {
      employee_id, basic_salary, housing_allowance, transport_allowance,
      other_allowances, overtime_rate, tax_exempt, effective_from
    } = req.body;

    if (!employee_id || !basic_salary) {
      return res.status(400).json({ error: 'Employee ID and basic salary are required' });
    }

    const [existing] = await pool.query('SELECT id FROM employee_salaries WHERE employee_id = ?', [employee_id]);

    let result;
    if (existing.length > 0) {
      await pool.query(
        `UPDATE employee_salaries SET
           basic_salary = ?, housing_allowance = ?, transport_allowance = ?,
           other_allowances = ?, overtime_rate = ?, tax_exempt = ?,
           effective_from = ?, updated_at = NOW()
         WHERE employee_id = ?`,
        [basic_salary, housing_allowance || 0, transport_allowance || 0,
         other_allowances || 0, overtime_rate || null, tax_exempt ? 1 : 0,
         effective_from || new Date().toISOString().split('T')[0], employee_id]
      );
      result = { insertId: existing[0].id };
    } else {
      [result] = await pool.query(
        `INSERT INTO employee_salaries
           (employee_id, basic_salary, housing_allowance, transport_allowance,
            other_allowances, overtime_rate, tax_exempt, effective_from, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [employee_id, basic_salary, housing_allowance || 0, transport_allowance || 0,
         other_allowances || 0, overtime_rate || null, tax_exempt ? 1 : 0,
         effective_from || new Date().toISOString().split('T')[0], req.user.id]
      );
    }

    const [saved] = await pool.query(`
      SELECT es.*, e.name AS employee_name, e.employee_id AS employee_code
      FROM employee_salaries es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.employee_id = ?`,
      [employee_id]
    );

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: existing.length > 0 ? 'salary_updated' : 'salary_created',
      entityType: 'salary', entityId: employee_id,
      description: `${req.user.name} ${existing.length > 0 ? 'updated' : 'created'} salary for employee ${employee_id}`,
      metadata: { basicSalary: basic_salary, employeeId: employee_id },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.status(existing.length > 0 ? 200 : 201).json(saved[0]);
  } catch (err) {
    console.error('Salary save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate payslips for a period (bulk)
router.post('/generate', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { period_start, period_end, employee_ids, overwrite = false } = req.body;

    if (!period_start || !period_end) {
      return res.status(400).json({ error: 'Period start and end dates are required' });
    }

    // Get tax and SSNIT rates from settings
    const [taxSetting] = await pool.query(
      `SELECT setting_value FROM management_settings WHERE setting_key = 'tax_rate'`
    );
    const taxRate = taxSetting.length > 0 ? parseFloat(taxSetting[0].setting_value) : 0.15;

    const [ssnitSetting] = await pool.query(
      `SELECT setting_value FROM management_settings WHERE setting_key = 'ssnit_rate'`
    );
    const ssnitRate = ssnitSetting.length > 0 ? parseFloat(ssnitSetting[0].setting_value) : 0.055;

    // Build employee query
    let empQuery = `
      SELECT e.id, e.name, e.employee_id, e.department_id,
             es.basic_salary, es.housing_allowance, es.transport_allowance,
             es.other_allowances, es.overtime_rate, es.tax_exempt
      FROM employees e
      LEFT JOIN employee_salaries es ON e.id = es.employee_id
      WHERE e.is_active = 1
    `;
    const empParams = [];

    if (employee_ids && employee_ids.length > 0) {
      empQuery += ' AND e.id IN (?)';
      empParams.push(employee_ids);
    }

    const [employees] = await pool.query(empQuery, empParams);

    if (employees.length === 0) {
      return res.status(400).json({ error: 'No active employees found with salary configuration' });
    }

    const generated = [];
    const skipped = [];

    for (const emp of employees) {
      // Check if payslip already exists
      const [existing] = await pool.query(
        `SELECT id FROM payslips WHERE employee_id = ? AND period_start = ? AND period_end = ?`,
        [emp.id, period_start, period_end]
      );

      if (existing.length > 0 && !overwrite) {
        skipped.push({ employee: emp.name, reason: 'Payslip already exists' });
        continue;
      }

      const basic = parseFloat(emp.basic_salary) || 0;
      const housing = parseFloat(emp.housing_allowance) || 0;
      const transport = parseFloat(emp.transport_allowance) || 0;
      const other = parseFloat(emp.other_allowances) || 0;
      const allowances = housing + transport + other;

      // Calculate overtime (if applicable - could be enhanced with attendance data)
      const overtime = 0;

      const gross = basic + allowances + overtime;

      const taxableIncome = emp.tax_exempt ? 0 : gross;
      const tax = Math.round(taxableIncome * taxRate * 100) / 100;
      const ssnit = Math.round(gross * ssnitRate * 100) / 100;

      const totalDeductions = tax + ssnit;
      const netPay = gross - totalDeductions;

      if (existing.length > 0) {
        await pool.query(
          `UPDATE payslips SET
             basic_salary = ?, allowances = ?, overtime_pay = ?, bonus = 0,
             gross_pay = ?, tax_deduction = ?, ssnit_deduction = ?, other_deductions = 0,
             total_deductions = ?, net_pay = ?, status = 'Generated', generated_by = ?,
             updated_at = NOW()
           WHERE id = ?`,
          [basic, allowances, overtime, gross, tax, ssnit, totalDeductions, netPay, req.user.id, existing[0].id]
        );
        generated.push({ id: existing[0].id, employee: emp.name, status: 'updated' });
      } else {
        const [result] = await pool.query(
          `INSERT INTO payslips
             (employee_id, period_start, period_end, basic_salary, allowances, overtime_pay, bonus,
              gross_pay, tax_deduction, ssnit_deduction, other_deductions, total_deductions, net_pay,
              status, generated_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, 'Generated', ?, NOW(), NOW())`,
          [emp.id, period_start, period_end, basic, allowances, overtime, gross, tax, ssnit, totalDeductions, netPay, req.user.id]
        );
        generated.push({ id: result.insertId, employee: emp.name, status: 'created' });
      }
    }

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'payslips_generated', entityType: 'payslip', entityId: null,
      description: `${req.user.name} generated ${generated.length} payslips for ${period_start} to ${period_end}`,
      metadata: { periodStart: period_start, periodEnd: period_end, generated: generated.length, skipped: skipped.length },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.json({ generated, skipped, message: `Generated ${generated.length} payslips${skipped.length > 0 ? `, skipped ${skipped.length}` : ''}` });
  } catch (err) {
    console.error('Payslip generation error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// Update payslip status (mark as paid, cancel, etc.)
router.put('/:id/status', authenticate, authorize('Management'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['Draft', 'Generated', 'Paid', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [existing] = await pool.query('SELECT * FROM payslips WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    const updates = ['status = ?'];
    const params = [status];

    if (status === 'Paid') {
      updates.push('paid_at = NOW()');
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE payslips SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      `SELECT p.*, e.name AS employee_name, e.employee_id AS employee_code
       FROM payslips p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: `payslip_${status.toLowerCase()}`, entityType: 'payslip', entityId: parseInt(req.params.id),
      description: `${req.user.name} marked payslip for ${updated[0].employee_name} as ${status}`,
      metadata: { employeeName: updated[0].employee_name, periodStart: updated[0].period_start, netPay: updated[0].net_pay },
      ip: getClientIp(req), severity: 'INFO',
    });

    res.json(updated[0]);
  } catch (err) {
    console.error('Payslip status update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete payslip (only draft)
router.delete('/:id', authenticate, authorize('Management'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM payslips WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    if (existing[0].status !== 'Draft') {
      return res.status(400).json({ error: 'Only draft payslips can be deleted' });
    }

    await pool.query('DELETE FROM payslips WHERE id = ?', [req.params.id]);

    logAction(pool, {
      userId: req.user.id, userName: req.user.name, userRole: req.user.type,
      action: 'payslip_deleted', entityType: 'payslip', entityId: parseInt(req.params.id),
      description: `${req.user.name} deleted draft payslip for employee ${existing[0].employee_id}`,
      metadata: { employeeId: existing[0].employee_id },
      ip: getClientIp(req), severity: 'WARNING',
    });

    res.json({ message: 'Payslip deleted successfully' });
  } catch (err) {
    console.error('Payslip delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;