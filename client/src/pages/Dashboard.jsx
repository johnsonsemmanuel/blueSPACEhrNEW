import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarCheck, Clock, TrendingUp, Users, FileText, CheckCircle, XCircle, CalendarPlus, Calendar, Sun, Moon, Sunrise, UserCheck, UserRoundCog, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import toast from 'react-hot-toast'
import { statusBadge } from '../components/ui/Badge'

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

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: Sunrise }
  if (h < 17) return { text: 'Good afternoon', icon: Sun }
  return { text: 'Good evening', icon: Moon }
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [myStats, setMyStats] = useState(null)
  const [allLeaves, setAllLeaves] = useState([])
  const [balance, setBalance] = useState([])
  const [onLeave, setOnLeave] = useState([])
  const [holidays, setHolidays] = useState([])
  const [handovers, setHandovers] = useState([])
  const isMgmt = user?.type === 'Management'
  const greeting = getGreeting()
  const GreetIcon = greeting.icon

  useEffect(() => {
    if (isMgmt) {
      api.get('/leaves/stats').then(r => setStats(r.data)).catch(() => {})
    } else {
      api.get('/leaves/my-stats').then(r => setMyStats(r.data)).catch(() => {})
    }
    api.get('/leaves').then(r => setAllLeaves(r.data)).catch(() => {})
    api.get('/leaves/balance').then(r => setBalance(r.data)).catch(() => {})
    api.get('/leaves/on-leave').then(r => setOnLeave(r.data)).catch(() => {})
    api.get('/leaves/holidays').then(r => {
      const now = new Date()
      const upcoming = r.data.filter(h => new Date(h.date) >= now).slice(0, 3)
      setHolidays(upcoming)
    }).catch(() => {})
    api.get('/leaves/handover-to-me').then(r => setHandovers(r.data)).catch(() => {})
  }, [user])

  const needsProfileUpdate = !isMgmt && (!user?.phone || !user?.address)

  const cards = isMgmt
    ? stats
      ? [
          { icon: FileText, label: 'Total Requests', value: stats.total, color: 'bg-deep-600' },
          { icon: Clock, label: 'Pending', value: stats.pending, color: 'bg-amber-500' },
          { icon: CheckCircle, label: 'Approved', value: stats.approved, color: 'bg-emerald-500' },
          { icon: XCircle, label: 'Rejected', value: stats.rejected, color: 'bg-red-500' },
          { icon: Users, label: 'Employees', value: stats.employees, color: 'bg-blue-600' },
          { icon: CalendarCheck, label: 'On Leave Today', value: stats.onLeave, color: 'bg-purple-500' },
        ]
      : []
    : myStats
      ? [
          { icon: FileText, label: 'My Requests', value: myStats.total, color: 'bg-deep-600' },
          { icon: Clock, label: 'Pending', value: myStats.pending, color: 'bg-amber-500' },
          { icon: CalendarCheck, label: 'Approved', value: myStats.approved, color: 'bg-emerald-500' },
          { icon: XCircle, label: 'Rejected', value: myStats.rejected, color: 'bg-red-500' },
        ]
      : []

  const totalRemaining = balance.reduce((s, b) => s + b.remaining, 0)

  const recentLeaves = allLeaves.slice(0, 5)

  const pendingLeaves = useMemo(() =>
    isMgmt ? allLeaves.filter(l => l.status === 'Pending').slice(0, 5) : [],
    [allLeaves, isMgmt]
  )

  const handleApprove = async (id) => {
    try {
      await api.put(`/leaves/${id}/status`, { status: 'Approved' })
      toast.success('Leave approved')
      setAllLeaves(allLeaves.map(l => l.id === id ? { ...l, status: 'Approved' } : l))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async (id) => {
    const remark = prompt('Enter rejection remark (optional):')
    try {
      await api.put(`/leaves/${id}/status`, { status: 'Rejected', remark: remark || '' })
      toast.success('Leave rejected')
      setAllLeaves(allLeaves.map(l => l.id === id ? { ...l, status: 'Rejected' } : l))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject')
    }
  }

  const upcomingApproved = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7 = new Date(today)
    in7.setDate(in7.getDate() + 7)
    return allLeaves
      .filter(l => {
        if (l.status !== 'Approved') return false
        const start = new Date(l.start_date + 'T00:00:00')
        const end = new Date(l.end_date + 'T00:00:00')
        return (start >= today && start <= in7) || (start <= today && end >= today)
      })
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
  }, [allLeaves])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <GreetIcon size={16} className="text-amber-500" />
            <h1 className="text-lg font-bold text-deep-600">
              {greeting.text}, {user?.name?.split(' ')[0]}
            </h1>
          </div>
          <p className="text-xs text-gray-500 ml-[22px]">
            {isMgmt ? 'Management Dashboard' : 'My Dashboard'}
          </p>
        </div>
        {!isMgmt && (
          <button
            onClick={() => navigate('/apply')}
            className="h-9 px-4 bg-deep-600 text-white rounded-md text-sm font-medium hover:bg-deep-700 transition-colors flex items-center gap-2"
          >
            <CalendarPlus size={15} />
            Apply Leave
          </button>
        )}
      </div>

      {needsProfileUpdate && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 flex-1">
            Your profile is incomplete. Please update your phone number and address.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="text-xs font-medium text-amber-700 underline hover:no-underline shrink-0"
          >
            Update Profile
          </button>
        </div>
      )}

      {cards.length > 0 && (
        <div className={`grid grid-cols-2 gap-3 mb-6 ${isMgmt ? 'md:grid-cols-3 lg:grid-cols-6' : 'sm:grid-cols-4'}`}>
          {cards.map((card, i) => (
            <StatCard key={i} {...card} />
          ))}
        </div>
      )}

      {!isMgmt && balance.length > 0 && (
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-3">
          <Calendar size={14} className="text-deep-600" />
          <span>
            Total leave days remaining: <strong className="text-deep-600">{totalRemaining}</strong>
          </span>
        </div>
      )}

      {handovers.length > 0 && (
        <div className="mb-6">
          <Card>
            <h3 className="text-sm font-semibold text-deep-600 mb-3 flex items-center gap-2">
              <UserRoundCog size={14} />
              Your Handover Assignments
            </h3>
            <div className="space-y-2">
              {handovers.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm border-t border-gray-50 pt-2 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">
                      {h.employee_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-deep-600 truncate">{h.employee_name}</p>
                      <p className="text-[10px] text-gray-500">{h.leave_type_name} · {h.start_date} – {h.end_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {statusBadge(h.status)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {!isMgmt && upcomingApproved.length > 0 && (
        <div className="mb-6">
          <Card>
            <h3 className="text-sm font-semibold text-deep-600 mb-3 flex items-center gap-2">
              <ArrowRight size={14} className="text-emerald-500" />
              Upcoming Leave
            </h3>
            <div className="space-y-2">
              {upcomingApproved.map((l) => {
                const start = new Date(l.start_date + 'T00:00:00')
                const end = new Date(l.end_date + 'T00:00:00')
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const isActive = start <= today && end >= today
                const diffDays = isActive
                  ? Math.ceil((end - today) / (1000 * 60 * 60 * 24))
                  : Math.ceil((start - today) / (1000 * 60 * 60 * 24))
                const label = isActive
                  ? diffDays === 0 ? 'Ends today' : diffDays === 1 ? 'Ends tomorrow' : `Ends in ${diffDays} days`
                  : diffDays === 0 ? 'Starts today' : diffDays === 1 ? 'Starts tomorrow' : `Starts in ${diffDays} days`
                return (
                  <div key={l.id} className="flex items-center justify-between text-sm border-t border-gray-50 pt-2 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
                        {l.leave_type_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-deep-600">{l.leave_type_name}{l.is_half_day ? ' (½)' : ''}</p>
                        <p className="text-[10px] text-gray-500">{l.start_date} – {l.end_date}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-3 ${isActive ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {onLeave.length > 0 && (
          <div className="lg:col-span-4">
            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-3 flex items-center gap-2">
                <UserCheck size={14} />
                On Leave Today
              </h3>
              <div className="space-y-2">
                {onLeave.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-deep-100 flex items-center justify-center text-[10px] font-bold text-deep-600">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="text-deep-600 font-medium text-xs">{emp.name}</span>
                    </div>
                    <Badge variant="info" className="text-[10px]">{emp.leave_type}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {holidays.length > 0 && (
          <div className={onLeave.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-3 flex items-center gap-2">
                <Calendar size={14} />
                Upcoming Holidays
              </h3>
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-xs text-deep-600 font-medium">{h.occasion}</span>
                    <span className="text-[10px] text-gray-500">{new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {balance.length > 0 && (
          <div className={onLeave.length > 0 || holidays.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'}>
            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-4">Leave Balance</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {balance.map((b) => {
                  const pct = b.total > 0 ? (b.used / b.total) * 100 : 0
                  return (
                    <div key={b.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-deep-500">{b.title}</span>
                        <span className="text-xs text-gray-500">
                          <span className="font-semibold text-deep-600">{b.remaining}</span>/{b.total}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-deep-600 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      {isMgmt && pendingLeaves.length > 0 && (
        <div className="mb-6">
          <Card>
            <h3 className="text-sm font-semibold text-deep-600 mb-3 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              Pending Approvals
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider">
                    <th className="pb-3 pr-4">Employee</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Dates</th>
                    <th className="pb-3 pr-4">Days</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="text-deep-600">
                  {pendingLeaves.map((l) => (
                    <tr key={l.id} className="border-t border-gray-50">
                      <td className="py-3 pr-4 font-medium">{l.employee_name}</td>
                      <td className="py-3 pr-4">{l.leave_type_name}{l.is_half_day ? ' (½)' : ''}</td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">{l.start_date} – {l.end_date}</td>
                      <td className="py-3 pr-4">{l.total_leave_days}</td>
                      <td className="py-3 flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(l.id)}
                          className="h-7 px-3 text-[11px] font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(l.id)}
                          className="h-7 px-3 text-[11px] font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <h3 className="text-sm font-semibold text-deep-600 mb-4">Recent Leave Requests</h3>
            {recentLeaves.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CalendarCheck size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leave requests yet</p>
                {!isMgmt && (
                  <button onClick={() => navigate('/apply')} className="mt-3 text-xs text-deep-600 font-medium hover:underline">
                    Submit your first request
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider">
                      {isMgmt && <th className="pb-3 pr-4">Employee</th>}
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Dates</th>
                      <th className="pb-3 pr-4">Days</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-deep-600">
                    {recentLeaves.map((leave) => (
                      <tr key={leave.id} className="border-t border-gray-50">
                        {isMgmt && <td className="py-3 pr-4 font-medium">{leave.employee_name}</td>}
                        <td className="py-3 pr-4">{leave.leave_type_name}{leave.is_half_day ? ' (Half Day)' : ''}</td>
                        <td className="py-3 pr-4 text-gray-500 text-xs">{leave.start_date} – {leave.end_date}</td>
                        <td className="py-3 pr-4">{leave.total_leave_days}</td>
                        <td className="py-3">{statusBadge(leave.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
