import { Outlet, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

export default function AppLayout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const notifRef = useRef(null)
  const isMgmt = user?.type === 'Management'

  useEffect(() => {
    if (!user) return
    const fetch = () => {
      api.get('/leaves/notifications').then(r => {
        setNotifications(r.data.notifications)
        setUnread(r.data.unread)
      }).catch(() => {})
    }
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  const markRead = async (id) => {
    await api.put(`/leaves/notifications/${id}/read`)
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n))
    setUnread(Math.max(0, unread - 1))
  }

  const markAllRead = async () => {
    await api.put('/leaves/notifications/read-all')
    setNotifications(notifications.map(n => ({ ...n, is_read: 1 })))
    setUnread(0)
  }

  const notifLabel = (n) => {
    const d = JSON.parse(n.data || '{}')
    if (n.type === 'leave_submitted') return `${d.employeeName} submitted a ${d.leaveType} request`
    if (n.type === 'leave_approved') return `Your ${d.leaveType} was approved by ${d.reviewer}`
    if (n.type === 'leave_rejected') return `Your ${d.leaveType} was rejected by ${d.reviewer}`
    if (n.type === 'leave_handover') return `You've been assigned as handover for ${d.employeeName}'s ${d.leaveType}`
    return n.type
  }

  if (!user) return <Navigate to="/login" />

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar open={sidebarOpen} onOpen={() => setSidebarOpen(true)} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center lg:hidden mr-3">
            <img src="/logo-light.png" alt="BlueSPACE" className="h-6 w-auto" />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-1.5 text-gray-400 hover:text-deep-600 transition-colors relative"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-xs font-semibold text-deep-600 uppercase tracking-wider">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-deep-600 font-medium hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Bell size={20} className="mx-auto mb-1 opacity-50" />
                      <p className="text-xs">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { if (!n.is_read) markRead(n.id) }}
                        className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          !n.is_read ? 'bg-brand-50/30' : ''
                        }`}
                      >
                        <p className={`text-xs ${!n.is_read ? 'font-semibold text-deep-600' : 'text-gray-600'}`}>
                          {notifLabel(n)}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-deep-100 flex items-center justify-center text-xs font-bold text-deep-600">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-deep-600">{user?.name}</p>
                <p className="text-[10px] text-gray-400">{user?.type}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-6 pt-14 lg:pt-6 overflow-auto pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
