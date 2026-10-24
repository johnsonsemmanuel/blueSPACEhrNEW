import { supabase, EDGE_FUNCTION_URL, EDGE_FUNCTIONS_BASE, SUPABASE_ANON_KEY } from './supabase'

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

async function edgeFetch(path, options = {}) {
  const res = await fetch(`${EDGE_FUNCTION_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  })
  const data = await res.json()
  if (!res.ok) throw { response: { status: res.status, data } }
  return data
}

async function supabaseQuery(table, { select = '*', filters = [], order = null, single = false, count = false } = {}) {
  let query = supabase.from(table).select(select, { count: count ? 'exact' : undefined })
  for (const f of filters) {
    if (f.op === 'eq') query = query.eq(f.col, f.val)
    else if (f.op === 'neq') query = query.neq(f.col, f.val)
    else if (f.op === 'gte') query = query.gte(f.col, f.val)
    else if (f.op === 'lte') query = query.lte(f.col, f.val)
    else if (f.op === 'gt') query = query.gt(f.col, f.val)
    else if (f.op === 'lt') query = query.lt(f.col, f.val)
    else if (f.op === 'in') query = query.in(f.col, f.val)
    else if (f.op === 'like') query = query.like(f.col, f.val)
    else if (f.op === 'ilike') query = query.ilike(f.col, f.val)
  }
  if (order) query = query.order(order.col, { ascending: order.asc ?? false })
  if (single) query = query.maybeSingle()
  const { data, error, count: cnt } = await query
  if (error) throw error
  return single ? data : (count ? { data, count: cnt } : data)
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch { return null }
}

async function sendLeaveEmail(type, toEmail, data) {
  try {
    const res = await fetch(`${EDGE_FUNCTIONS_BASE}/email-sender`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ type, to_email: toEmail, data }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn(`Email send failed (${res.status}) for ${type} -> ${toEmail}: ${detail}`)
      return false
    }
    return true
  } catch (e) {
    console.warn('Email send failed (non-blocking):', e)
    return false
  }
}

// In-app notifications for the header bell. Best-effort: failures are logged,
// never thrown, so they can't break the leave action itself.
async function insertNotifications(rows) {
  const clean = (rows || []).filter((r) => r && r.user_id)
  if (clean.length === 0) return
  const { error } = await supabase.from('notifications').insert(clean)
  if (error) console.warn('Failed to insert notifications:', error.message)
}

const today = () => new Date().toISOString().split('T')[0]

const ROUTES = {
  'GET /auth/me': async () => {
    const data = await edgeFetch('/me')
    return { data }
  },

  'POST /auth/login': async (body) => {
    const data = await edgeFetch('/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return { data }
  },

  'PUT /auth/profile': async (body) => {
    const user = getUser()
    if (!user) throw { response: { data: { error: 'Not authenticated' } } }
    const data = await edgeFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: body.name, phone: body.phone, address: body.address }),
    })
    return { data }
  },

  'PUT /auth/password': async (body) => {
    const user = getUser()
    if (!user) throw { response: { data: { error: 'Not authenticated' } } }
    const data = await edgeFetch('/password', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, ...body }),
    })
    return { data }
  },

  'POST /auth/admin/reset-employee-password': async (body) => {
    const data = await edgeFetch('/admin/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    try {
      const empUser = await supabaseQuery('users', {
        select: 'email, name',
        filters: [{ op: 'eq', col: 'id', val: body.user_id }],
        single: true,
      })
      if (empUser?.email) {
        sendLeaveEmail('password_reset', empUser.email, {
          employee_name: empUser.name,
        })
      }
    } catch (e) {
      console.warn('Failed to send password reset email:', e)
    }

    return { data }
  },

  'GET /leaves': async () => {
    const user = getUser()
    if (!user) return { data: [] }
    const isMgmt = user.type === 'Management'

    const leaves = await supabaseQuery('leaves', {
      select: `*, employee:employees!leaves_employee_id_fkey(id, name, employee_id, department_id, department:departments!employees_department_id_fkey(name)), leave_type:leave_types!leaves_leave_type_id_fkey(id, title), handover:employees!leaves_handover_to_fkey(id, name)`,
      order: { col: 'created_at', asc: false },
    })

    const enriched = (leaves || []).map(l => ({
      ...l,
      employee_name: l.employee?.name || '',
      employee_code: l.employee?.employee_id || '',
      department_name: l.employee?.department?.name || '',
      leave_type_name: l.leave_type?.title || '',
      handover_name: l.handover?.name || '',
    }))

    const filtered = isMgmt ? enriched : enriched.filter(l => l.created_by === user.id || l.employee_id === user.id)
    return { data: filtered }
  },

  'GET /leaves/stats': async () => {
    const allLeaves = await supabaseQuery('leaves', { select: 'id, status, start_date, end_date', order: { col: 'created_at', asc: false } })
    const employees = await supabaseQuery('employees', { select: 'id' })
    const todayStr = today()
    const onLeave = (allLeaves || []).filter(l => l.status === 'Approved' && l.start_date <= todayStr && l.end_date >= todayStr)
    return {
      data: {
        total: (allLeaves || []).length,
        pending: (allLeaves || []).filter(l => l.status === 'Pending').length,
        approved: (allLeaves || []).filter(l => l.status === 'Approved').length,
        rejected: (allLeaves || []).filter(l => l.status === 'Rejected').length,
        employees: (employees || []).length,
        onLeave: onLeave.length,
      },
    }
  },

  'GET /leaves/my-stats': async () => {
    const user = getUser()
    if (!user) return { data: { total: 0, pending: 0, approved: 0, rejected: 0 } }
    const emp = await supabaseQuery('employees', { select: 'id', filters: [{ op: 'eq', col: 'user_id', val: user.id }], single: true })
    const empId = emp?.id
    const leaves = await supabaseQuery('leaves', { select: 'id, status', filters: empId ? [{ op: 'eq', col: 'employee_id', val: empId }] : [] })
    return {
      data: {
        total: (leaves || []).length,
        pending: (leaves || []).filter(l => l.status === 'Pending').length,
        approved: (leaves || []).filter(l => l.status === 'Approved').length,
        rejected: (leaves || []).filter(l => l.status === 'Rejected').length,
      },
    }
  },

  'GET /leaves/balance': async () => {
    const user = getUser()
    if (!user) return { data: [] }
    const emp = await supabaseQuery('employees', { select: 'id', filters: [{ op: 'eq', col: 'user_id', val: user.id }], single: true })
    const empId = emp?.id
    if (!empId) return { data: [] }

    const leaveTypes = await supabaseQuery('leave_types', { select: 'id, title, days' })
    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01`
    const yearEnd = `${currentYear}-12-31`

    const leaves = await supabaseQuery('leaves', {
      select: 'id, leave_type_id, total_leave_days, status',
      filters: [
        { op: 'eq', col: 'employee_id', val: empId },
        { op: 'eq', col: 'status', val: 'Approved' },
        { op: 'gte', col: 'start_date', val: yearStart },
        { op: 'lte', col: 'end_date', val: yearEnd },
      ],
    })

    const balance = (leaveTypes || []).map(lt => {
      const used = (leaves || []).filter(l => l.leave_type_id === lt.id).reduce((sum, l) => sum + (parseFloat(l.total_leave_days) || 0), 0)
      return { id: lt.id, title: lt.title, total: lt.days, used, remaining: lt.days - used }
    })
    return { data: balance }
  },

  'GET /leaves/on-leave': async () => {
    const todayStr = today()
    const leaves = await supabaseQuery('leaves', {
      select: 'id, employee:employees!leaves_employee_id_fkey(id, name), leave_type:leave_types!leaves_leave_type_id_fkey(title)',
      filters: [
        { op: 'eq', col: 'status', val: 'Approved' },
        { op: 'lte', col: 'start_date', val: todayStr },
        { op: 'gte', col: 'end_date', val: todayStr },
      ],
    })
    const data = (leaves || []).map(l => ({
      id: l.id,
      name: l.employee?.name || '',
      leave_type: l.leave_type?.title || '',
    }))
    return { data }
  },

  'GET /leaves/holidays': async () => {
    const data = await supabaseQuery('holidays', { select: '*', order: { col: 'date', asc: true } })
    return { data: data || [] }
  },

  'GET /leaves/handover-to-me': async () => {
    const user = getUser()
    if (!user) return { data: [] }
    const emp = await supabaseQuery('employees', { select: 'id', filters: [{ op: 'eq', col: 'user_id', val: user.id }], single: true })
    if (!emp?.id) return { data: [] }
    const leaves = await supabaseQuery('leaves', {
      select: 'id, start_date, end_date, status, employee:employees!leaves_employee_id_fkey(name), leave_type:leave_types!leaves_leave_type_id_fkey(title)',
      filters: [{ op: 'eq', col: 'handover_to', val: emp.id }],
      order: { col: 'created_at', asc: false },
    })
    const data = (leaves || []).map(l => ({
      id: l.id,
      employee_name: l.employee?.name || '',
      leave_type_name: l.leave_type?.title || '',
      start_date: l.start_date,
      end_date: l.end_date,
      status: l.status,
    }))
    return { data }
  },

  'GET /leaves/calendar': async () => {
    const leaves = await supabaseQuery('leaves', {
      select: 'id, start_date, end_date, employee:employees!leaves_employee_id_fkey(name), leave_type:leave_types!leaves_leave_type_id_fkey(title)',
      filters: [{ op: 'eq', col: 'status', val: 'Approved' }],
      order: { col: 'start_date', asc: true },
    })
    const data = (leaves || []).map(l => ({
      id: l.id,
      title: `${l.employee?.name || ''} (${l.leave_type?.title || ''})`,
      start_date: l.start_date,
      end_date: l.end_date,
      leave_type: l.leave_type?.title || '',
    }))
    return { data }
  },

  'GET /leaves/email-logs': async () => {
    const data = await supabaseQuery('email_logs', { select: '*', order: { col: 'created_at', asc: false } })
    return { data: data || [] }
  },

  'GET /leaves/admin-logs': async (params) => {
    const url = new URLSearchParams(params || '')
    let query = supabase.from('audit_logs').select('*')
    const search = url.get('search')
    const severity = url.get('severity')
    const action = url.get('action')
    if (search) query = query.ilike('description', `%${search}%`)
    if (severity) query = query.eq('severity', severity)
    if (action) query = query.eq('action', action)
    query = query.order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) throw error
    return { data: data || [] }
  },

  'GET /leaves/notifications': async () => {
    const user = getUser()
    if (!user) return { data: { notifications: [], unread: 0 } }
    const rows = await supabaseQuery('notifications', {
      select: '*',
      filters: [{ op: 'eq', col: 'user_id', val: user.id }],
      order: { col: 'created_at', asc: false },
    })
    const list = rows || []
    return {
      data: {
        notifications: list.slice(0, 20),
        unread: list.filter(n => !n.is_read).length,
      },
    }
  },

  'PUT /leaves/notifications/read-all': async () => {
    const user = getUser()
    if (!user) throw { response: { data: { error: 'Not authenticated' } } }
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: 1 })
      .eq('user_id', user.id)
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { message: 'All notifications marked as read' } }
  },

  'PUT /leaves/notifications/:id/read': async (id) => {
    const user = getUser()
    if (!user) throw { response: { data: { error: 'Not authenticated' } } }
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: 1 })
      .eq('id', parseInt(id))
      .eq('user_id', user.id)
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { message: 'Notification marked as read' } }
  },

  'POST /leaves': async (body) => {
    const user = getUser()
    if (!user) throw { response: { data: { error: 'Not authenticated' } } }
    const emp = await supabaseQuery('employees', { select: 'id', filters: [{ op: 'eq', col: 'user_id', val: user.id }], single: true })
    if (!emp) throw { response: { data: { error: 'Employee profile not found' } } }

    const applied_on = new Date().toISOString()
    const total_leave_days = body.is_half_day ? 0.5 : await countWorkingDays(body.start_date, body.end_date)

    const { data: leave, error } = await supabase.from('leaves').insert({
      employee_id: emp.id,
      leave_type_id: parseInt(body.leave_type_id),
      applied_on,
      start_date: body.start_date,
      end_date: body.end_date,
      total_leave_days,
      leave_reason: body.leave_reason,
      handover_to: body.handover_to ? parseInt(body.handover_to) : null,
      handover_notes: body.handover_notes || null,
      contact_during_leave: body.contact_during_leave || null,
      leave_address: body.leave_address || null,
      is_half_day: body.is_half_day ? 1 : 0,
      half_day_type: body.is_half_day ? (body.half_day_type || null) : null,
      status: 'Pending',
      created_by: user.id,
    }).select().single()

    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: user.name,
      user_role: user.type,
      action: 'leave_applied',
      description: `Leave request submitted for ${total_leave_days} day(s)`,
      severity: 'INFO',
      entity_type: 'leave',
      entity_id: leave.id,
    })

    // Email all management users about the new leave request
    try {
      const mgmtUsers = await supabaseQuery('users', {
        select: 'id, email, name',
        filters: [{ op: 'eq', col: 'type', val: 'Management' }, { op: 'eq', col: 'is_active', val: 1 }],
      })
      const leaveType = await supabaseQuery('leave_types', { select: 'title', filters: [{ op: 'eq', col: 'id', val: parseInt(body.leave_type_id) }], single: true })
      const handoverEmp = body.handover_to ? await supabaseQuery('employees', { select: 'id, name, user_id', filters: [{ op: 'eq', col: 'id', val: parseInt(body.handover_to) }], single: true }) : null
      const emailData = {
        employee_name: user.name,
        leave_type: leaveType?.title || 'Leave',
        is_half_day: body.is_half_day,
        half_day_type: body.is_half_day ? (body.half_day_type || null) : null,
        start_date: body.start_date,
        end_date: body.end_date,
        total_days: total_leave_days,
        reason: body.leave_reason,
        handover_name: handoverEmp?.name || null,
      }
      for (const m of (mgmtUsers || [])) {
        if (m.email) sendLeaveEmail('leave_submitted', m.email, { ...emailData, recipient_name: m.name })
      }
      await insertNotifications([
        ...(mgmtUsers || []).map((m) => ({
          user_id: m.id,
          type: 'leave_submitted',
          data: JSON.stringify({ employeeName: user.name, leaveType: emailData.leave_type }),
        })),
        ...(handoverEmp?.user_id ? [{
          user_id: handoverEmp.user_id,
          type: 'leave_handover',
          data: JSON.stringify({ employeeName: user.name, leaveType: emailData.leave_type }),
        }] : []),
      ])
    } catch (e) {
      console.warn('Failed to send leave submission emails:', e)
    }

    return { data: leave }
  },

  'PUT /leaves/:id': async (id, body) => {
    const user = getUser()
    const existing = await supabaseQuery('leaves', {
      select: 'start_date, end_date, status, employee_id, leave_type_id',
      filters: [{ op: 'eq', col: 'id', val: parseInt(id) }],
      single: true,
    })

    const update = { updated_at: new Date().toISOString() }
    if (body.leave_type_id) update.leave_type_id = parseInt(body.leave_type_id)
    if (body.start_date) update.start_date = body.start_date
    if (body.end_date) {
      update.end_date = body.end_date
      if (body.start_date) update.total_leave_days = await countWorkingDays(body.start_date, body.end_date)
    }
    if (body.leave_reason !== undefined) update.leave_reason = body.leave_reason
    if (body.handover_to !== undefined) update.handover_to = body.handover_to ? parseInt(body.handover_to) : null
    if (body.handover_notes !== undefined) update.handover_notes = body.handover_notes || null
    if (body.contact_during_leave !== undefined) update.contact_during_leave = body.contact_during_leave || null
    if (body.leave_address !== undefined) update.leave_address = body.leave_address || null
    if (body.is_half_day !== undefined) {
      update.is_half_day = body.is_half_day ? 1 : 0
      if (body.is_half_day) {
        update.total_leave_days = 0.5
        update.end_date = body.start_date || update.end_date
        update.half_day_type = body.half_day_type || null
      } else {
        update.half_day_type = null
        if (body.start_date && body.end_date) update.total_leave_days = await countWorkingDays(body.start_date, body.end_date)
      }
    }
    if (body.half_day_type !== undefined && body.is_half_day) update.half_day_type = body.half_day_type || null
    if (body.status) update.status = body.status
    if (body.remark !== undefined) update.remark = body.remark || null

    const { error } = await supabase.from('leaves').update(update).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    // Notify the employee when management extends an approved leave.
    if (
      user?.type === 'Management' &&
      existing?.status === 'Approved' &&
      body.end_date &&
      body.end_date !== existing.end_date
    ) {
      try {
        const emp = await supabaseQuery('employees', {
          select: 'user_id, name',
          filters: [{ op: 'eq', col: 'id', val: existing.employee_id }],
          single: true,
        })
        const empUser = emp?.user_id ? await supabaseQuery('users', {
          select: 'id, email, name',
          filters: [{ op: 'eq', col: 'id', val: emp.user_id }],
          single: true,
        }) : null
        const leaveType = await supabaseQuery('leave_types', {
          select: 'title',
          filters: [{ op: 'eq', col: 'id', val: existing.leave_type_id }],
          single: true,
        })
        if (empUser?.email) {
          const totalDays = update.total_leave_days ?? await countWorkingDays(existing.start_date, body.end_date)
          sendLeaveEmail('leave_extended', empUser.email, {
            recipient_name: empUser.name,
            leave_type: leaveType?.title || 'Leave',
            reviewer: user.name,
            old_end_date: existing.end_date,
            new_end_date: body.end_date,
            total_days: totalDays,
          })
        }
        if (empUser?.id) {
          await insertNotifications([{
            user_id: empUser.id,
            type: 'leave_extended',
            data: JSON.stringify({ leaveType: leaveType?.title || 'Leave', reviewer: user.name }),
          }])
        }
      } catch (e) {
        console.warn('Failed to send leave extension email:', e)
      }
    }

    return { data: { success: true } }
  },

  'PUT /leaves/:id/status': async (id, body) => {
    const user = getUser()

    if (body.status === 'Approved') {
      const pendingLeave = await supabaseQuery('leaves', {
        select: 'employee_id, leave_type_id, total_leave_days, start_date, end_date, is_half_day',
        filters: [{ op: 'eq', col: 'id', val: parseInt(id) }],
        single: true,
      })
      if (pendingLeave) {
        const currentYear = new Date().getFullYear()
        const yearStart = `${currentYear}-01-01`
        const yearEnd = `${currentYear}-12-31`
        const existingApproved = await supabaseQuery('leaves', {
          select: 'total_leave_days',
          filters: [
            { op: 'eq', col: 'employee_id', val: pendingLeave.employee_id },
            { op: 'eq', col: 'leave_type_id', val: pendingLeave.leave_type_id },
            { op: 'eq', col: 'status', val: 'Approved' },
            { op: 'gte', col: 'start_date', val: yearStart },
            { op: 'lte', col: 'end_date', val: yearEnd },
            { op: 'neq', col: 'id', val: parseInt(id) },
          ],
        })
        const leaveType = await supabaseQuery('leave_types', {
          select: 'days',
          filters: [{ op: 'eq', col: 'id', val: pendingLeave.leave_type_id }],
          single: true,
        })
        const used = (existingApproved || []).reduce((sum, l) => sum + (parseFloat(l.total_leave_days) || 0), 0)
        const requested = parseFloat(pendingLeave.total_leave_days) || 0
        const available = (leaveType?.days || 0) - used
        if (requested > available) {
          throw { response: { data: { error: `Cannot approve: employee has ${available} day(s) remaining but requested ${requested} day(s)` } } }
        }
      }
    }

    const { error } = await supabase.from('leaves').update({
      status: body.status,
      remark: body.remark || null,
      updated_at: new Date().toISOString(),
    }).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: body.status === 'Approved' ? 'leave_approved' : 'leave_rejected',
      description: `Leave ${body.status.toLowerCase()}${body.remark ? ': ' + body.remark : ''}`,
      severity: 'INFO',
      entity_type: 'leave',
      entity_id: parseInt(id),
    })

    // Email the employee about the decision
    try {
      const leave = await supabaseQuery('leaves', {
        select: 'employee_id, leave_type_id, start_date, end_date, total_leave_days, is_half_day, half_day_type',
        filters: [{ op: 'eq', col: 'id', val: parseInt(id) }],
        single: true,
      })
      if (leave) {
        const emp = await supabaseQuery('employees', {
          select: 'user_id, name',
          filters: [{ op: 'eq', col: 'id', val: leave.employee_id }],
          single: true,
        })
        const empUser = emp?.user_id ? await supabaseQuery('users', {
          select: 'id, email, name',
          filters: [{ op: 'eq', col: 'id', val: emp.user_id }],
          single: true,
        }) : null
        const leaveType = await supabaseQuery('leave_types', {
          select: 'title',
          filters: [{ op: 'eq', col: 'id', val: leave.leave_type_id }],
          single: true,
        })
        if (empUser?.email) {
          sendLeaveEmail(
            body.status === 'Approved' ? 'leave_approved' : 'leave_rejected',
            empUser.email,
            {
              recipient_name: empUser.name,
              leave_type: leaveType?.title || 'Leave',
              is_half_day: leave.is_half_day,
              half_day_type: leave.half_day_type,
              start_date: leave.start_date,
              end_date: leave.end_date,
              total_days: leave.total_leave_days,
              remark: body.remark,
            }
          )
        }
        if (empUser?.id) {
          await insertNotifications([{
            user_id: empUser.id,
            type: body.status === 'Approved' ? 'leave_approved' : 'leave_rejected',
            data: JSON.stringify({ leaveType: leaveType?.title || 'Leave', reviewer: user?.name || 'Management' }),
          }])
        }
      }
    } catch (e) {
      console.warn('Failed to send leave decision email:', e)
    }

    return { data: { success: true } }
  },

  'PUT /leaves/:id/cancel': async (id) => {
    const user = getUser()
    const { error } = await supabase.from('leaves').update({
      status: 'Cancelled',
      updated_at: new Date().toISOString(),
    }).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'leave_cancelled',
      description: 'Leave request cancelled',
      severity: 'INFO',
      entity_type: 'leave',
      entity_id: parseInt(id),
    })

    try {
      const mgmtUsers = await supabaseQuery('users', {
        select: 'id, email, name',
        filters: [{ op: 'eq', col: 'type', val: 'Management' }, { op: 'eq', col: 'is_active', val: 1 }],
      })
      const leave = await supabaseQuery('leaves', {
        select: 'leave_type_id, start_date, end_date, total_leave_days',
        filters: [{ op: 'eq', col: 'id', val: parseInt(id) }],
        single: true,
      })
      const leaveType = leave ? await supabaseQuery('leave_types', {
        select: 'title',
        filters: [{ op: 'eq', col: 'id', val: leave.leave_type_id }],
        single: true,
      }) : null
      const emailData = {
        employee_name: user?.name || 'Employee',
        leave_type: leaveType?.title || 'Leave',
        start_date: leave?.start_date || '',
        end_date: leave?.end_date || '',
        total_days: leave?.total_leave_days || 0,
      }
      for (const m of (mgmtUsers || [])) {
        if (m.email) sendLeaveEmail('leave_cancelled', m.email, { ...emailData, recipient_name: m.name })
      }
      await insertNotifications((mgmtUsers || []).map((m) => ({
        user_id: m.id,
        type: 'leave_cancelled',
        data: JSON.stringify({ employeeName: emailData.employee_name, leaveType: emailData.leave_type }),
      })))
    } catch (e) {
      console.warn('Failed to send leave cancellation emails:', e)
    }

    return { data: { success: true } }
  },

  'DELETE /leaves/:id': async (id) => {
    const user = getUser()
    const { error } = await supabase.from('leaves').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'leave_deleted',
      description: 'Leave request permanently deleted',
      severity: 'WARNING',
      entity_type: 'leave',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'GET /leave-types': async () => {
    const data = await supabaseQuery('leave_types', { select: '*', order: { col: 'id', asc: true } })
    return { data: data || [] }
  },

  'POST /leave-types': async (body) => {
    const user = getUser()
    const { data, error } = await supabase.from('leave_types').insert({
      title: body.title,
      days: parseInt(body.days),
      max_consecutive_days: parseInt(body.max_consecutive_days) || parseInt(body.days) || null,
      requires_approval: body.requires_approval !== undefined ? (body.requires_approval ? 1 : 0) : 1,
      allow_carry_forward: body.allow_carry_forward ? 1 : 0,
      carry_forward_limit: body.carry_forward_limit ? parseInt(body.carry_forward_limit) : 0,
      created_by: user?.id || null,
    }).select('id').single()
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'leave_type_created',
      description: `Leave type "${body.title}" created`,
      severity: 'INFO',
      entity_type: 'leave_type',
      entity_id: data.id,
    })

    return { data: { id: data.id } }
  },

  'PUT /leave-types/:id': async (id, body) => {
    const user = getUser()
    const { error } = await supabase.from('leave_types').update({
      title: body.title,
      days: parseInt(body.days),
      max_consecutive_days: body.max_consecutive_days ? parseInt(body.max_consecutive_days) : null,
      requires_approval: body.requires_approval ? 1 : 0,
      allow_carry_forward: body.allow_carry_forward ? 1 : 0,
      carry_forward_limit: body.carry_forward_limit ? parseInt(body.carry_forward_limit) : 0,
      updated_at: new Date().toISOString(),
    }).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'leave_type_updated',
      description: `Leave type "${body.title}" updated`,
      severity: 'INFO',
      entity_type: 'leave_type',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'DELETE /leave-types/:id': async (id) => {
    const user = getUser()
    const { error } = await supabase.from('leave_types').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'leave_type_deleted',
      description: 'Leave type deleted',
      severity: 'WARNING',
      entity_type: 'leave_type',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'GET /holidays': async () => {
    const data = await supabaseQuery('holidays', { select: '*', order: { col: 'date', asc: true } })
    return { data: data || [] }
  },

  'POST /holidays': async (body) => {
    const user = getUser()
    const { data, error } = await supabase.from('holidays').insert({
      occasion: body.occasion,
      date: body.date,
      end_date: body.end_date || body.date,
      created_by: user?.id || 0,
    }).select('id').single()
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'holiday_created',
      description: `Holiday "${body.occasion}" created`,
      severity: 'INFO',
      entity_type: 'holiday',
      entity_id: data.id,
    })

    return { data: { id: data.id } }
  },

  'PUT /holidays/:id': async (id, body) => {
    const user = getUser()
    const { error } = await supabase.from('holidays').update({
      occasion: body.occasion,
      date: body.date,
      end_date: body.end_date || body.date,
      updated_at: new Date().toISOString(),
    }).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'holiday_updated',
      description: `Holiday "${body.occasion}" updated`,
      severity: 'INFO',
      entity_type: 'holiday',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'DELETE /holidays/:id': async (id) => {
    const user = getUser()
    const { error } = await supabase.from('holidays').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'holiday_deleted',
      description: 'Holiday deleted',
      severity: 'WARNING',
      entity_type: 'holiday',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'POST /holidays/notify': async () => {
    const user = getUser()
    if (!user) throw { response: { data: { error: 'Not authenticated' } } }

    const employees = await supabaseQuery('employees', {
      select: 'id, name, email',
      filters: [{ op: 'eq', col: 'is_active', val: 1 }],
    })

    const todayStr = today()
    const holidays = await supabaseQuery('holidays', {
      select: 'id, occasion, date, end_date',
      filters: [{ op: 'gte', col: 'date', val: todayStr }],
      order: { col: 'date', asc: true },
    })

    if (!holidays || holidays.length === 0) {
      throw { response: { data: { error: 'No upcoming holidays found' } } }
    }

    const holidayData = (holidays || []).map((h) => ({
      occasion: h.occasion,
      date: h.date,
      end_date: h.end_date || h.date,
    }))

    let sentCount = 0
    let failCount = 0

    for (const emp of (employees || [])) {
      if (emp.email) {
        const ok = await sendLeaveEmail('holiday_reminder', emp.email, {
          employee_name: emp.name,
          holidays: holidayData,
        })
        if (ok) {
          sentCount++
        } else {
          failCount++
          console.warn(`Failed to send holiday reminder to ${emp.email}`)
        }
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'holiday_notification_sent',
      description: `Holiday reminders sent to ${sentCount} employees (${failCount} failed)`,
      severity: 'INFO',
      entity_type: 'holiday',
      entity_id: null,
    })

    return { data: { sent: sentCount, failed: failCount, total: (employees || []).length } }
  },

  'GET /employees': async () => {
    const data = await supabaseQuery('employees', {
      select: '*, user:users!employees_user_id_fkey(id, type, is_active, avatar), department:departments!employees_department_id_fkey(id, name), branch:branches!employees_branch_id_fkey(id, name), designation:designations!employees_designation_id_fkey(id, name)',
      order: { col: 'id', asc: true },
    })
    const enriched = (data || []).map(e => ({
      ...e,
      email: e.user?.email || e.email || '',
      is_active: e.user?.is_active ?? e.is_active,
      user_type: e.user?.type || 'Staff',
      avatar: e.user?.avatar || e.avatar || null,
      department_name: e.department?.name || '',
      branch_name: e.branch?.name || '',
      designation_name: e.designation?.name || '',
    }))
    return { data: enriched }
  },

  'GET /employees/list': async () => {
    const data = await supabaseQuery('employees', {
      select: 'id, name, employee_id',
      filters: [{ op: 'eq', col: 'is_active', val: 1 }],
      order: { col: 'name', asc: true },
    })
    return { data: data || [] }
  },

  'GET /employees/departments': async () => {
    const data = await supabaseQuery('departments', { select: 'id, name', order: { col: 'name', asc: true } })
    return { data: data || [] }
  },

  'GET /employees/branches': async () => {
    const data = await supabaseQuery('branches', { select: 'id, name', order: { col: 'name', asc: true } })
    return { data: data || [] }
  },

  'GET /employees/designations': async () => {
    const data = await supabaseQuery('designations', { select: 'id, name, branch_id, department_id', order: { col: 'name', asc: true } })
    return { data: data || [] }
  },

  'POST /employees': async (body) => {
    const user = getUser()
    const tempPassword = body.password || 'changeme123'
    const userData = await edgeFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        type: body.type || 'Staff',
        phone: body.phone,
        address: body.address,
        is_active: body.is_active ?? 1,
        password: tempPassword,
      }),
    })

    const { data: emp, error: empErr } = await supabase.from('employees').insert({
      user_id: userData.id,
      name: body.name,
      dob: body.dob || null,
      gender: body.gender || null,
      phone: body.phone,
      address: body.address,
      next_of_kin_name: body.next_of_kin_name || null,
      next_of_kin_phone: body.next_of_kin_phone || null,
      next_of_kin_relationship: body.next_of_kin_relationship || null,
      email: body.email,
      employee_id: body.employee_id,
      branch_id: body.branch_id ? parseInt(body.branch_id) : null,
      department_id: body.department_id ? parseInt(body.department_id) : null,
      designation_id: body.designation_id ? parseInt(body.designation_id) : null,
      company_doj: body.company_doj || null,
      is_active: body.is_active ?? 1,
      created_by: user?.id || null,
    }).select().single()
    if (empErr) throw { response: { data: { error: empErr.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'employee_created',
      description: `Employee "${body.name}" created`,
      severity: 'INFO',
      entity_type: 'employee',
      entity_id: emp.id,
    })

    if (body.email && tempPassword) {
      sendLeaveEmail('employee_created', body.email, {
        recipient_name: body.name,
        employee_name: body.name,
        email: body.email,
        password: tempPassword,
        employee_id: body.employee_id,
      })
    }

    return { data: emp }
  },

  'PUT /employees/:id': async (id, body) => {
    const user = getUser()
    const empUpdate = {}
    if (body.name) empUpdate.name = body.name
    if (body.phone !== undefined) empUpdate.phone = body.phone
    if (body.address !== undefined) empUpdate.address = body.address
    if (body.dob !== undefined) empUpdate.dob = body.dob || null
    if (body.gender !== undefined) empUpdate.gender = body.gender || null
    if (body.department_id !== undefined) empUpdate.department_id = body.department_id ? parseInt(body.department_id) : null
    if (body.branch_id !== undefined) empUpdate.branch_id = body.branch_id ? parseInt(body.branch_id) : null
    if (body.designation_id !== undefined) empUpdate.designation_id = body.designation_id ? parseInt(body.designation_id) : null
    if (body.company_doj !== undefined) empUpdate.company_doj = body.company_doj || null
    if (body.employee_id !== undefined) empUpdate.employee_id = body.employee_id
    if (body.next_of_kin_name !== undefined) empUpdate.next_of_kin_name = body.next_of_kin_name || null
    if (body.next_of_kin_phone !== undefined) empUpdate.next_of_kin_phone = body.next_of_kin_phone || null
    if (body.next_of_kin_relationship !== undefined) empUpdate.next_of_kin_relationship = body.next_of_kin_relationship || null
    empUpdate.updated_at = new Date().toISOString()

    const { data: emp, error: empErr } = await supabase.from('employees').update(empUpdate).eq('id', parseInt(id)).select().single()
    if (empErr) throw { response: { data: { error: empErr.message } } }

    if (emp?.user_id) {
      const userUpdate = {}
      if (body.name) userUpdate.name = body.name
      if (body.email) userUpdate.email = body.email
      if (body.is_active !== undefined) userUpdate.is_active = body.is_active
      if (body.type) userUpdate.type = body.type
      if (body.phone !== undefined) userUpdate.phone = body.phone
      if (body.address !== undefined) userUpdate.address = body.address
      if (Object.keys(userUpdate).length > 0) {
        await edgeFetch(`/admin/users/${emp.user_id}`, {
          method: 'PUT',
          body: JSON.stringify(userUpdate),
        })
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'employee_updated',
      description: `Employee "${body.name || id}" updated`,
      severity: 'INFO',
      entity_type: 'employee',
      entity_id: parseInt(id),
    })

    return { data: emp }
  },

  'DELETE /employees/:id': async (id) => {
    const user = getUser()
    const { error } = await supabase.from('employees').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'employee_deleted',
      description: `Employee #${id} permanently deleted`,
      severity: 'WARNING',
      entity_type: 'employee',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'GET /departments': async () => {
    const data = await supabaseQuery('departments', {
      select: '*, branch:branches!departments_branch_id_fkey(id, name)',
      order: { col: 'name', asc: true },
    })
    const enriched = (data || []).map(d => ({ ...d, branch_name: d.branch?.name || '' }))
    return { data: enriched }
  },

  'POST /departments': async (body) => {
    const user = getUser()
    const { data, error } = await supabase.from('departments').insert({
      name: body.name,
      branch_id: body.branch_id ? parseInt(body.branch_id) : null,
      created_by: user?.id || null,
    }).select('id').single()
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'department_created',
      description: `Department "${body.name}" created`,
      severity: 'INFO',
      entity_type: 'department',
      entity_id: data.id,
    })

    return { data: { id: data.id } }
  },

  'PUT /departments/:id': async (id, body) => {
    const user = getUser()
    const { error } = await supabase.from('departments').update({
      name: body.name,
      branch_id: body.branch_id ? parseInt(body.branch_id) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'department_updated',
      description: `Department "${body.name}" updated`,
      severity: 'INFO',
      entity_type: 'department',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'DELETE /departments/:id': async (id) => {
    const user = getUser()
    const { error } = await supabase.from('departments').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'department_deleted',
      description: 'Department deleted',
      severity: 'WARNING',
      entity_type: 'department',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'GET /branches': async () => {
    const data = await supabaseQuery('branches', {
      select: '*',
      order: { col: 'name', asc: true },
    })
    return { data: data || [] }
  },

  'POST /branches': async (body) => {
    const user = getUser()
    const { data, error } = await supabase.from('branches').insert({
      name: body.name,
      created_by: user?.id || null,
    }).select('id').single()
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'branch_created',
      description: `Branch "${body.name}" created`,
      severity: 'INFO',
      entity_type: 'branch',
      entity_id: data.id,
    })

    return { data: { id: data.id } }
  },

  'PUT /branches/:id': async (id, body) => {
    const user = getUser()
    const { error } = await supabase.from('branches').update({
      name: body.name,
      updated_at: new Date().toISOString(),
    }).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'branch_updated',
      description: `Branch "${body.name}" updated`,
      severity: 'INFO',
      entity_type: 'branch',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'DELETE /branches/:id': async (id) => {
    const user = getUser()
    const { error } = await supabase.from('branches').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'branch_deleted',
      description: 'Branch deleted',
      severity: 'WARNING',
      entity_type: 'branch',
      entity_id: parseInt(id),
    })

    return { data: { success: true } }
  },

  'GET /announcements': async () => {
    const data = await supabaseQuery('announcements', {
      select: '*',
      order: { col: 'created_at', asc: false },
    })
    return { data: data || [] }
  },

  'POST /announcements': async (body) => {
    const user = getUser()
    if (!user) throw { response: { data: { error: 'Not authenticated' } } }
    if (user.type !== 'Management') throw { response: { data: { error: 'Only management can post announcements' } } }
    const title = (body.title || '').trim()
    const message = (body.body || '').trim()
    if (!title || !message) throw { response: { data: { error: 'Title and message are required' } } }

    const { data: ann, error } = await supabase.from('announcements').insert({
      title,
      body: message,
      created_by: user.id,
      created_by_name: user.name,
    }).select().single()
    if (error) throw { response: { data: { error: error.message } } }

    try {
      const users = await supabaseQuery('users', {
        select: 'id, email, name',
        filters: [{ op: 'eq', col: 'is_active', val: 1 }],
      })
      for (const u of (users || [])) {
        if (u.email) {
          sendLeaveEmail('announcement', u.email, {
            recipient_name: u.name,
            title,
            body: message,
            sender_name: user.name,
          })
        }
      }
      await insertNotifications((users || []).map((u) => ({
        user_id: u.id,
        type: 'announcement',
        data: JSON.stringify({ title, body: message }),
      })))
    } catch (e) {
      console.warn('Failed to broadcast announcement:', e)
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      user_name: user?.name,
      user_role: user?.type,
      action: 'announcement_created',
      description: `Announcement "${title}" published`,
      severity: 'INFO',
      entity_type: 'announcement',
      entity_id: ann.id,
    })

    return { data: ann }
  },

  'GET /audit-logs': async () => {
    const data = await supabaseQuery('audit_logs', { select: '*', order: { col: 'created_at', asc: false } })
    return { data: data || [] }
  },

  // Expenses
  'GET /expenses': async (params) => {
    const url = new URLSearchParams(params || '')
    let query = supabase.from('daily_expenses').select('*, branch:branches!daily_expenses_branch_id_fkey(id,name), department:departments!daily_expenses_department_id_fkey(id,name)')
    const startDate = url.get('startDate')
    const endDate = url.get('endDate')
    const category = url.get('category')
    const branchId = url.get('branchId')
    const departmentId = url.get('departmentId')
    const page = parseInt(url.get('page')) || 1
    const limit = parseInt(url.get('limit')) || 50
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)
    if (category) query = query.eq('category', category)
    if (branchId) query = query.eq('branch_id', branchId)
    if (departmentId) query = query.eq('department_id', departmentId)
    query = query.order('date', { ascending: false }).order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
    const { data, error, count } = await query
    if (error) throw error
    return { data: data || [], total: count || 0, page, limit }
  },

  'GET /expenses/summary': async (params) => {
    const url = new URLSearchParams(params || '')
    const startDate = url.get('startDate')
    const endDate = url.get('endDate')
    const branchId = url.get('branchId')
    const departmentId = url.get('departmentId')
    let filters = []
    if (startDate) filters.push({ op: 'gte', col: 'date', val: startDate })
    if (endDate) filters.push({ op: 'lte', col: 'date', val: endDate })
    if (branchId) filters.push({ op: 'eq', col: 'branch_id', val: branchId })
    if (departmentId) filters.push({ op: 'eq', col: 'department_id', val: departmentId })

    const expenses = await supabaseQuery('daily_expenses', { select: 'category, amount, payment_method, date', filters })
    const total = (expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    const count = (expenses || []).length

    const byCategory = {}
    const byMonth = {}
    const byPaymentMethod = {}
    ;(expenses || []).forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (parseFloat(e.amount) || 0)
      const month = e.date.slice(0, 7)
      byMonth[month] = (byMonth[month] || 0) + (parseFloat(e.amount) || 0)
      byPaymentMethod[e.payment_method] = (byPaymentMethod[e.payment_method] || 0) + (parseFloat(e.amount) || 0)
    })

    const recent = await supabaseQuery('daily_expenses', {
      select: '*, branch:branches!daily_expenses_branch_id_fkey(id,name), department:departments!daily_expenses_department_id_fkey(id,name)',
      filters, order: { col: 'date', asc: false }, limit: 10
    })

    return {
      total, count,
      byCategory: Object.entries(byCategory).map(([category, total]) => ({ category, total })),
      byMonth: Object.entries(byMonth).map(([month, total]) => ({ month, total })).sort((a,b) => b.month.localeCompare(a.month)),
      byPaymentMethod: Object.entries(byPaymentMethod).map(([payment_method, total]) => ({ payment_method, total })),
      recent: recent || []
    }
  },

  'GET /expenses/categories': async () => {
    const data = await supabaseQuery('daily_expenses', { select: 'category', order: { col: 'category', asc: true } })
    return { data: [...new Set((data || []).map(d => d.category))] }
  },

  'POST /expenses': async (body) => {
    const user = getUser()
    const { data, error } = await supabase.from('daily_expenses').insert({
      date: body.date,
      category: body.category,
      description: body.description,
      amount: parseFloat(body.amount),
      payment_method: body.payment_method || 'Cash',
      receipt_url: body.receipt_url || null,
      branch_id: body.branch_id ? parseInt(body.branch_id) : null,
      department_id: body.department_id ? parseInt(body.department_id) : null,
      created_by: user?.id || null,
    }).select('*, branch:branches!daily_expenses_branch_id_fkey(id,name), department:departments!daily_expenses_department_id_fkey(id,name)').single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  'PUT /expenses/:id': async (id, body) => {
    const update = { updated_at: new Date().toISOString() }
    if (body.date) update.date = body.date
    if (body.category) update.category = body.category
    if (body.description !== undefined) update.description = body.description
    if (body.amount !== undefined) update.amount = parseFloat(body.amount)
    if (body.payment_method !== undefined) update.payment_method = body.payment_method
    if (body.receipt_url !== undefined) update.receipt_url = body.receipt_url
    if (body.branch_id !== undefined) update.branch_id = body.branch_id ? parseInt(body.branch_id) : null
    if (body.department_id !== undefined) update.department_id = body.department_id ? parseInt(body.department_id) : null
    const { error } = await supabase.from('daily_expenses').update(update).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }
    const { data } = await supabase.from('daily_expenses').select('*, branch:branches!daily_expenses_branch_id_fkey(id,name), department:departments!daily_expenses_department_id_fkey(id,name)').eq('id', parseInt(id)).single()
    return { data }
  },

  'DELETE /expenses/:id': async (id) => {
    const { error } = await supabase.from('daily_expenses').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { success: true } }
  },

  // Payslips
  'GET /payslips': async (params) => {
    const url = new URLSearchParams(params || '')
    let query = supabase.from('payslips').select('*, employee:employees!payslips_employee_id_fkey(id,name,employee_id,department:departments!employees_department_id_fkey(id,name))')
    const employeeId = url.get('employeeId')
    const periodStart = url.get('periodStart')
    const periodEnd = url.get('periodEnd')
    const status = url.get('status')
    const page = parseInt(url.get('page')) || 1
    const limit = parseInt(url.get('limit')) || 50
    if (employeeId) query = query.eq('employee_id', employeeId)
    if (periodStart) query = query.gte('period_start', periodStart)
    if (periodEnd) query = query.lte('period_end', periodEnd)
    if (status) query = query.eq('status', status)
    query = query.order('period_start', { ascending: false }).order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
    const { data, error, count } = await query
    if (error) throw error
    return { data: data || [], total: count || 0, page, limit }
  },

  'GET /payslips/employee/:employeeId': async (employeeId) => {
    const { data, error } = await supabase.from('payslips').select('*').eq('employee_id', parseInt(employeeId)).order('period_start', { ascending: false })
    if (error) throw error
    return { data: data || [] }
  },

  'GET /payslips/summary': async (params) => {
    const url = new URLSearchParams(params || '')
    const periodStart = url.get('periodStart')
    const periodEnd = url.get('periodEnd')
    let filters = []
    if (periodStart) filters.push({ op: 'gte', col: 'period_start', val: periodStart })
    if (periodEnd) filters.push({ op: 'lte', col: 'period_end', val: periodEnd })

    const payslips = await supabaseQuery('payslips', { select: 'status, gross_pay, net_pay, total_deductions, employee_id, period_start', filters })
    const total = (payslips || []).length
    const draft = (payslips || []).filter(p => p.status === 'Draft').length
    const generated = (payslips || []).filter(p => p.status === 'Generated').length
    const paid = (payslips || []).filter(p => p.status === 'Paid').length
    const cancelled = (payslips || []).filter(p => p.status === 'Cancelled').length
    const totalGross = (payslips || []).reduce((sum, p) => sum + (parseFloat(p.gross_pay) || 0), 0)
    const totalNet = (payslips || []).reduce((sum, p) => sum + (parseFloat(p.net_pay) || 0), 0)
    const totalDeductions = (payslips || []).reduce((sum, p) => sum + (parseFloat(p.total_deductions) || 0), 0)

    // By department would need a join - simplified for now
    return { total, draft, generated, paid, cancelled, total_gross: totalGross, total_net: totalNet, total_deductions: totalDeductions, byDepartment: [], byStatus: [] }
  },

  'POST /payslips/generate': async (body) => {
    // This will call the edge function or use the server route
    const user = getUser()
    const response = await fetch(`${EDGE_FUNCTION_URL}/payslips/generate`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await response.json()
    if (!response.ok) throw { response: { status: response.status, data } }
    return { data }
  },

  'PUT /payslips/:id/status': async (id, body) => {
    const { error } = await supabase.from('payslips').update({
      status: body.status,
      notes: body.notes || null,
      paid_at: body.status === 'Paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }
    const { data } = await supabase.from('payslips').select('*, employee:employees!payslips_employee_id_fkey(id,name,employee_id)').eq('id', parseInt(id)).single()
    return { data }
  },

  'DELETE /payslips/:id': async (id) => {
    const { error } = await supabase.from('payslips').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { success: true } }
  },

  // Employee Salaries
  'GET /salaries': async () => {
    const data = await supabaseQuery('employee_salaries', {
      select: '*, employee:employees!employee_salaries_employee_id_fkey(id,name,employee_id,department:departments!employees_department_id_fkey(id,name))',
      order: { col: 'employee_id', asc: true }
    })
    return { data: data || [] }
  },

  'GET /salaries/:employeeId': async (employeeId) => {
    const { data, error } = await supabase.from('employee_salaries').select('*, employee:employees!employee_salaries_employee_id_fkey(id,name,employee_id)').eq('employee_id', parseInt(employeeId)).single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  'POST /salaries': async (body) => {
    const user = getUser()
    const { employee_id, basic_salary, housing_allowance, transport_allowance, other_allowances, overtime_rate, tax_exempt, effective_from } = body
    const { data: existing } = await supabase.from('employee_salaries').select('id').eq('employee_id', parseInt(employee_id)).single()
    let result
    if (existing) {
      const { data, error } = await supabase.from('employee_salaries').update({
        basic_salary: parseFloat(basic_salary),
        housing_allowance: parseFloat(housing_allowance) || 0,
        transport_allowance: parseFloat(transport_allowance) || 0,
        other_allowances: parseFloat(other_allowances) || 0,
        overtime_rate: overtime_rate ? parseFloat(overtime_rate) : null,
        tax_exempt: tax_exempt ? true : false,
        effective_from: effective_from || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }).eq('employee_id', parseInt(employee_id)).select().single()
      if (error) throw { response: { data: { error: error.message } } }
      result = data
    } else {
      const { data, error } = await supabase.from('employee_salaries').insert({
        employee_id: parseInt(employee_id),
        basic_salary: parseFloat(basic_salary),
        housing_allowance: parseFloat(housing_allowance) || 0,
        transport_allowance: parseFloat(transport_allowance) || 0,
        other_allowances: parseFloat(other_allowances) || 0,
        overtime_rate: overtime_rate ? parseFloat(overtime_rate) : null,
        tax_exempt: tax_exempt ? true : false,
        effective_from: effective_from || new Date().toISOString().split('T')[0],
        created_by: user?.id || null,
      }).select().single()
      if (error) throw { response: { data: { error: error.message } } }
      result = data
    }
    return { data: result }
  },

  // Management Settings
  'GET /management/settings': async () => {
    const data = await supabaseQuery('management_settings', { select: '*', order: { col: 'setting_key', asc: true } })
    return { data: data || [] }
  },

  'PUT /management/settings/:key': async (key, body) => {
    const user = getUser()
    const valueJson = typeof body.setting_value === 'object' ? JSON.stringify(body.setting_value) : body.setting_value
    const { data: existing } = await supabase.from('management_settings').select('id').eq('setting_key', key).single()
    if (existing) {
      const { data, error } = await supabase.from('management_settings').update({
        setting_value: valueJson,
        description: body.description,
        updated_at: new Date().toISOString()
      }).eq('setting_key', key).select().single()
      if (error) throw { response: { data: { error: error.message } } }
      return { data }
    } else {
      const { data, error } = await supabase.from('management_settings').insert({
        setting_key: key,
        setting_value: valueJson,
        description: body.description || '',
        created_by: user?.id || null,
      }).select().single()
      if (error) throw { response: { data: { error: error.message } } }
      return { data }
    }
  },

  'POST /management/settings/init-defaults': async () => {
    const user = getUser()
    // This would call the server route
    const response = await fetch(`${EDGE_FUNCTION_URL}/management/settings/init-defaults`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    if (!response.ok) throw { response: { status: response.status, data } }
    return { data }
  },

  // Payment Reminders
  'GET /management/reminders': async (params) => {
    const url = new URLSearchParams(params || '')
    let query = supabase.from('payment_reminders').select('*, branch:branches!payment_reminders_branch_id_fkey(id,name), department:departments!payment_reminders_department_id_fkey(id,name)')
    const status = url.get('status')
    const category = url.get('category')
    const startDate = url.get('startDate')
    const endDate = url.get('endDate')
    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)
    if (startDate) query = query.gte('due_date', startDate)
    if (endDate) query = query.lte('due_date', endDate)
    query = query.order('due_date', { ascending: true }).order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) throw error
    return { data: data || [] }
  },

  'GET /management/reminders/upcoming': async (params) => {
    const days = parseInt((params || '').split('days=')[1]?.split('&')[0]) || 7
    const today = new Date().toISOString().split('T')[0]
    const future = new Date()
    future.setDate(future.getDate() + days)
    const futureStr = future.toISOString().split('T')[0]
    const { data, error } = await supabase.from('payment_reminders').select('*, branch:branches!payment_reminders_branch_id_fkey(id,name), department:departments!payment_reminders_department_id_fkey(id,name)').eq('status', 'Pending').gte('due_date', today).lte('due_date', futureStr).order('due_date', { ascending: true })
    if (error) throw error
    return { data: data || [] }
  },

  'POST /management/reminders': async (body) => {
    const user = getUser()
    const { data, error } = await supabase.from('payment_reminders').insert({
      title: body.title,
      description: body.description || null,
      amount: body.amount ? parseFloat(body.amount) : null,
      due_date: body.due_date,
      category: body.category || 'General',
      branch_id: body.branch_id ? parseInt(body.branch_id) : null,
      department_id: body.department_id ? parseInt(body.department_id) : null,
      reminder_days_before: body.reminder_days_before || 3,
      related_type: body.related_type || null,
      related_id: body.related_id ? parseInt(body.related_id) : null,
      created_by: user?.id || null,
    }).select('*, branch:branches!payment_reminders_branch_id_fkey(id,name), department:departments!payment_reminders_department_id_fkey(id,name)').single()
    if (error) throw { response: { data: { error: error.message } } }
    return { data }
  },

  'PUT /management/reminders/:id': async (id, body) => {
    const update = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) update.title = body.title
    if (body.description !== undefined) update.description = body.description
    if (body.amount !== undefined) update.amount = body.amount ? parseFloat(body.amount) : null
    if (body.due_date !== undefined) update.due_date = body.due_date
    if (body.category !== undefined) update.category = body.category
    if (body.branch_id !== undefined) update.branch_id = body.branch_id ? parseInt(body.branch_id) : null
    if (body.department_id !== undefined) update.department_id = body.department_id ? parseInt(body.department_id) : null
    if (body.reminder_days_before !== undefined) update.reminder_days_before = body.reminder_days_before
    if (body.status !== undefined) update.status = body.status
    if (body.related_type !== undefined) update.related_type = body.related_type
    if (body.related_id !== undefined) update.related_id = body.related_id ? parseInt(body.related_id) : null
    const { error } = await supabase.from('payment_reminders').update(update).eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }
    const { data } = await supabase.from('payment_reminders').select('*, branch:branches!payment_reminders_branch_id_fkey(id,name), department:departments!payment_reminders_department_id_fkey(id,name)').eq('id', parseInt(id)).single()
    return { data }
  },

  'POST /management/reminders/:id/notify': async (id) => {
    const response = await fetch(`${EDGE_FUNCTION_URL}/management/reminders/${id}/notify`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    if (!response.ok) throw { response: { status: response.status, data } }
    return { data }
  },

  'GET /management/reminders/overdue': async () => {
    const { data, error } = await supabase.from('payment_reminders').select('*, branch:branches!payment_reminders_branch_id_fkey(id,name), department:departments!payment_reminders_department_id_fkey(id,name)').eq('status', 'Pending').lt('due_date', new Date().toISOString().split('T')[0]).order('due_date', { ascending: true })
    if (error) throw error
    return { data: data || [] }
  },

  'DELETE /management/reminders/:id': async (id) => {
    const { error } = await supabase.from('payment_reminders').delete().eq('id', parseInt(id))
    if (error) throw { response: { data: { error: error.message } } }
    return { data: { success: true } }
  },
}

function matchRoute(method, url) {
  const cleanUrl = url.split('?')[0]

  const patternKey = Object.keys(ROUTES).find(key => {
    const [m, pattern] = key.split(' ')
    if (m !== method) return false
    const patternParts = pattern.split('/')
    const urlParts = cleanUrl.split('/')
    if (patternParts.length !== urlParts.length) return false
    return patternParts.every((part, i) => part.startsWith(':') || part === urlParts[i])
  })

  if (!patternKey) return null

  const [, pattern] = patternKey.split(' ')
  const patternParts = pattern.split('/')
  const urlParts = cleanUrl.split('/')
  const params = {}
  patternParts.forEach((part, i) => {
    if (part.startsWith(':')) params[part.slice(1)] = urlParts[i]
  })

  return { handler: ROUTES[patternKey], params }
}

function parseQueryString(url) {
  const idx = url.indexOf('?')
  if (idx === -1) return null
  return url.slice(idx + 1)
}

const api = {
  get: async (url) => {
    const route = matchRoute('GET', url)
    if (!route) throw { response: { data: { error: `Unknown route: GET ${url}` } } }
    const qs = parseQueryString(url)
    const params = qs ? Object.fromEntries(new URLSearchParams(qs)) : null
    return route.handler({ ...route.params, ...params })
  },

  post: async (url, body) => {
    const route = matchRoute('POST', url)
    if (!route) throw { response: { data: { error: `Unknown route: POST ${url}` } } }
    return route.handler(...Object.values(route.params), body)
  },

  put: async (url, body) => {
    const route = matchRoute('PUT', url)
    if (!route) throw { response: { data: { error: `Unknown route: PUT ${url}` } } }
    return route.handler(...Object.values(route.params), body)
  },

  delete: async (url) => {
    const route = matchRoute('DELETE', url)
    if (!route) throw { response: { data: { error: `Unknown route: DELETE ${url}` } } }
    return route.handler(...Object.values(route.params))
  },
}

export default api
