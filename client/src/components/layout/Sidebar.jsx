import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarPlus, CalendarCheck, FileText, Users, LogOut, X, Settings, CalendarDays, User, Building2, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = {
  Staff: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/apply', icon: CalendarPlus, label: 'Apply Leave' },
    { to: '/my-leaves', icon: CalendarCheck, label: 'My Leaves' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/profile', icon: User, label: 'Profile' },
  ],
  Management: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leave-requests', icon: FileText, label: 'Requests' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/departments', icon: Building2, label: 'Departments' },
    { to: '/leave-types', icon: Settings, label: 'Leave Types' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/profile', icon: User, label: 'Profile' },
  ],
}

export default function Sidebar({ open, onOpen, onClose }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const items = navItems[user?.type] || navItems.Staff

  const mobileItems = (() => {
    const apply = items.find((i) => i.to === '/apply')
    if (!apply) return items
    const rest = items.filter((i) => i.to !== '/apply')
    const mid = Math.floor(rest.length / 2)
    return [...rest.slice(0, mid), apply, ...rest.slice(mid)]
  })()
  const primary = mobileItems.slice(0, 4)
  const overflow = mobileItems.slice(4)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-50 h-screen w-60 bg-deep-600 text-white flex-col">
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10 shrink-0">
          <img src="/logo-light.png" alt="BlueSPACE" className="h-7 w-auto" />
        </div>

        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {items.map((item) => {
            const active = location.pathname === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10 shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-stretch shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        {primary.map((item) => {
          const active = location.pathname === item.to
          const isApply = item.to === '/apply'
          if (isApply) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-deep-600"
              >
                <span className="h-9 w-9 -mt-5 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md">
                  <item.icon size={18} />
                </span>
                <span className="text-[10px] font-semibold leading-none">{item.label.replace('Apply ', '')}</span>
              </NavLink>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-deep-600' : 'text-gray-400'
              }`}
            >
              <item.icon size={20} />
              {item.label.length > 10 ? item.label.split(' ')[0] : item.label}
            </NavLink>
          )
        })}

        <button
          onClick={onOpen}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-gray-400"
        >
          <MoreHorizontal size={20} />
          More
        </button>
      </nav>

      {/* Mobile "More" sheet */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-sheet-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <span className="text-sm font-bold text-deep-600">More</span>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-deep-600 rounded-md">
                <X size={20} />
              </button>
            </div>

            <nav className="p-3 space-y-1 overflow-y-auto">
              {overflow.length === 0 && (
                <p className="px-4 py-3 text-xs text-gray-400">No additional items</p>
              )}
              {overflow.map((item) => {
                const active = location.pathname === item.to
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                )
              })}
            </nav>

            <div className="p-3 border-t border-gray-100 shrink-0">
              <button
                onClick={() => { onClose(); logout() }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
