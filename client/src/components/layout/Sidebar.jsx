import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarPlus, CalendarCheck, FileText, Users, LogOut, Menu, X, Settings, CalendarDays, ChevronDown, User, Building2 } from 'lucide-react'
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
    { to: '/leave-requests', icon: FileText, label: 'Leave Requests' },
    { to: '/employees', icon: Users, label: 'Employees' },
    { to: '/departments', icon: Building2, label: 'Departments' },
    { to: '/leave-types', icon: Settings, label: 'Leave Types' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    { to: '/profile', icon: User, label: 'Profile' },
  ],
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const items = navItems[user?.type] || navItems.Staff

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-60 bg-deep-600 text-white transform transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo-light.png" alt="BlueSPACE" className="h-7 w-auto" />
          </div>
          <button onClick={onClose} className="p-1 text-white/60 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        </div>

        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {items.map((item) => {
            const active = location.pathname === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
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
    </>
  )
}
