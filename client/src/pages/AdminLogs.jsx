import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Search, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight, X } from 'lucide-react'
import api from '../lib/api'

const SEVERITY_CONFIG = {
  INFO: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Info },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
  ERROR: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle },
}

const ACTION_LABELS = {
  login_success: 'Login Success',
  login_failure: 'Login Failure',
  admin_password_reset: 'Admin Password Reset',
  leave_applied: 'Leave Applied',
  leave_approved: 'Leave Approved',
  leave_rejected: 'Leave Rejected',
  leave_cancelled: 'Leave Cancelled',
  leave_extended: 'Leave Extended',
  leave_deleted: 'Leave Deleted',
  employee_created: 'Employee Created',
  employee_updated: 'Employee Updated',
  employee_role_changed: 'Role Changed',
  department_created: 'Department Created',
  department_updated: 'Department Updated',
  department_deleted: 'Department Deleted',
  leave_type_created: 'Leave Type Created',
  leave_type_updated: 'Leave Type Updated',
  leave_type_deleted: 'Leave Type Deleted',
}

const ACTION_CATEGORIES = [
  { value: '', label: 'All Actions' },
  { value: 'auth', label: 'Authentication', actions: ['login_success', 'login_failure', 'admin_password_reset'] },
  { value: 'leaves', label: 'Leave Management', actions: ['leave_applied', 'leave_approved', 'leave_rejected', 'leave_cancelled', 'leave_extended', 'leave_deleted'] },
  { value: 'employees', label: 'Employees', actions: ['employee_created', 'employee_updated', 'employee_role_changed'] },
  { value: 'departments', label: 'Departments', actions: ['department_created', 'department_updated', 'department_deleted'] },
  { value: 'leave_types', label: 'Leave Types', actions: ['leave_type_created', 'leave_type_updated', 'leave_type_deleted'] },
]

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 flex items-center gap-4"
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-deep-600">{value ?? '–'}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </motion.div>
  )
}

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.INFO
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <cfg.icon size={11} />
      {severity}
    </span>
  )
}

function ActionBadge({ action }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-deep-50 text-deep-600">
      {ACTION_LABELS[action] || action}
    </span>
  )
}

function LogRow({ log, isExpanded, onToggle }) {
  const meta = useMemo(() => {
    if (!log.metadata) return null
    try {
      return typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
    } catch { return null }
  }, [log.metadata])

  return (
    <>
      <tr
        className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
          {log.created_at ? new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–'}
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-medium text-deep-600">{log.user_name || 'System'}</p>
            {log.user_role && <p className="text-[10px] text-gray-400">{log.user_role}</p>}
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <ActionBadge action={log.action} />
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px] truncate hidden md:table-cell">
          {log.description}
        </td>
        <td className="px-4 py-3">
          <SeverityBadge severity={log.severity} />
        </td>
        <td className="px-4 py-3 text-gray-400">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-gray-100 bg-gray-50/30">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Full Description</p>
                <p className="text-deep-600">{log.description}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Action</p>
                <p className="text-deep-600">{log.action}</p>
              </div>
              {log.entity_type && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Entity</p>
                  <p className="text-deep-600">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</p>
                </div>
              )}
              {log.ip_address && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">IP Address</p>
                  <p className="text-deep-600 font-mono text-xs">{log.ip_address}</p>
                </div>
              )}
              {log.user_id && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">User ID</p>
                  <p className="text-deep-600">{log.user_id}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Timestamp</p>
                <p className="text-deep-600">{log.created_at ? new Date(log.created_at).toLocaleString('en-GB') : '–'}</p>
              </div>
            </div>
            {meta && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Metadata</p>
                <pre className="text-xs text-deep-600 bg-white rounded-md p-3 border border-gray-100 overflow-x-auto">
                  {JSON.stringify(meta, null, 2)}
                </pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function AdminLogs() {
  const [logs, setLogs] = useState(null)
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('')
  const [actionCategory, setActionCategory] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [emailLogs, setEmailLogs] = useState(null)
  const [activeTab, setActiveTab] = useState('audit')

  const fetchLogs = () => {
    setLogs(null)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (severity) params.set('severity', severity)
    if (actionCategory) {
      const cat = ACTION_CATEGORIES.find(c => c.value === actionCategory)
      if (cat?.actions) params.set('action', cat.actions[0])
    }
    api.get(`/leaves/admin-logs?${params.toString()}`).then(r => setLogs(r.data)).catch(() => setLogs([]))
  }

  useEffect(() => { fetchLogs() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchLogs()
  }

  const handleCategoryChange = (cat) => {
    setActionCategory(cat)
    setLogs(null)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (severity) params.set('severity', severity)
    if (cat) {
      const category = ACTION_CATEGORIES.find(c => c.value === cat)
      if (category?.actions) params.set('action', category.actions[0])
    }
    api.get(`/leaves/admin-logs?${params.toString()}`).then(r => setLogs(r.data)).catch(() => setLogs([]))
  }

  const handleSeverityChange = (sev) => {
    setSeverity(sev)
    setLogs(null)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (sev) params.set('severity', sev)
    if (actionCategory) {
      const cat = ACTION_CATEGORIES.find(c => c.value === actionCategory)
      if (cat?.actions) params.set('action', cat.actions[0])
    }
    api.get(`/leaves/admin-logs?${params.toString()}`).then(r => setLogs(r.data)).catch(() => setLogs([]))
  }

  const stats = useMemo(() => {
    if (!logs) return null
    return {
      total: logs.length,
      warnings: logs.filter(l => l.severity === 'WARNING').length,
      errors: logs.filter(l => l.severity === 'ERROR').length,
      today: logs.filter(l => {
        const d = new Date(l.created_at)
        const now = new Date()
        return d.toDateString() === now.toDateString()
      }).length,
    }
  }, [logs])

  const loadEmailLogs = () => {
    setActiveTab('email')
    setEmailLogs(null)
    api.get('/leaves/email-logs').then(r => setEmailLogs(r.data)).catch(() => setEmailLogs([]))
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <ScrollText size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">System Logs</h1>
              <p className="text-xs text-gray-500">Audit trail and email delivery logs</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={loadEmailLogs}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'email' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Email Logs
          </button>
        </div>

        {activeTab === 'audit' && (
          <>
            {/* Stat Cards */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard icon={ScrollText} label="Total Logs" value={stats.total} color="bg-deep-600" />
                <StatCard icon={AlertTriangle} label="Warnings" value={stats.warnings} color="bg-amber-500" />
                <StatCard icon={AlertCircle} label="Errors" value={stats.errors} color="bg-red-500" />
                <StatCard icon={Info} label="Today" value={stats.today} color="bg-blue-600" />
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 mb-4">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={severity}
                  onChange={(e) => handleSeverityChange(e.target.value)}
                  className="h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">All Severity</option>
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="ERROR">Error</option>
                </select>
                <button
                  type="submit"
                  className="h-9 px-4 bg-brand-600 text-white rounded-md text-xs font-medium hover:bg-brand-700 transition-colors"
                >
                  Search
                </button>
              </form>

              {/* Action Category Pills */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {ACTION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      actionCategory === cat.value ? 'bg-deep-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              {logs === null ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Loading logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ScrollText size={36} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No logs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-gray-100">
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Action</th>
                        <th className="px-4 py-3 hidden md:table-cell">Description</th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <LogRow
                          key={log.id}
                          log={log}
                          isExpanded={expandedId === log.id}
                          onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'email' && (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            {emailLogs === null ? (
              <div className="text-center py-12 text-gray-400">
                <div className="h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading email logs...</p>
              </div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ScrollText size={36} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No email logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-gray-100">
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Error</th>
                      <th className="px-4 py-3">Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((log, i) => (
                      <tr key={log.id} className={`${i !== emailLogs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        <td className="px-4 py-3 text-deep-600 whitespace-nowrap">{log.to_email || '–'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{log.subject || '–'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            log.status === 'sent' ? 'bg-emerald-50 text-emerald-700' :
                            log.status === 'failed' ? 'bg-red-50 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{log.error_message || '–'}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {log.created_at ? new Date(log.created_at).toLocaleString('en-GB') : '–'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
