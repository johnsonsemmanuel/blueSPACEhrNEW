import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function LeaveCalendar() {
  const [leaves, setLeaves] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  useEffect(() => {
    api.get('/leaves/calendar').then(r => setLeaves(r.data)).catch(() => {})
  }, [])

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()

  const getLeavesForDay = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leaves.filter(l => {
      const start = l.start_date
      const end = l.end_date
      return dateStr >= start && dateStr <= end
    })
  }

  const prev = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const next = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
            <CalendarDays size={18} className="text-deep-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-deep-600">Leave Calendar</h1>
            <p className="text-xs text-gray-500">Overview of approved leaves</p>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <button onClick={prev} className="px-3 py-1.5 text-sm text-gray-600 hover:text-deep-600 hover:bg-gray-100 rounded-md transition-colors">
              &larr; {MONTHS[currentMonth === 0 ? 11 : currentMonth - 1]}
            </button>
            <h3 className="text-base font-bold text-deep-600">{MONTHS[currentMonth]} {currentYear}</h3>
            <button onClick={next} className="px-3 py-1.5 text-sm text-gray-600 hover:text-deep-600 hover:bg-gray-100 rounded-md transition-colors">
              {MONTHS[currentMonth === 11 ? 0 : currentMonth + 1]} &rarr;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-gray-50 px-2 py-2 text-[11px] font-bold text-gray-500 uppercase text-center tracking-wider">
                {d}
              </div>
            ))}

            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white min-h-[90px] p-1.5" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayLeaves = getLeavesForDay(day)
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()
              return (
                <div key={day} className={`bg-white min-h-[90px] p-1.5 ${isToday ? 'ring-2 ring-brand-500 ring-inset' : ''}`}>
                  <span className={`text-xs font-medium ${isToday ? 'text-deep-600' : 'text-gray-600'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayLeaves.slice(0, 2).map((l) => (
                      <div key={l.id} className="px-1 py-0.5 rounded bg-brand-50 text-[10px] text-brand-700 font-medium truncate leading-tight">
                        {l.title?.split(' ')[0]}
                      </div>
                    ))}
                    {dayLeaves.length > 2 && (
                      <div className="text-[10px] text-gray-400 font-medium">+{dayLeaves.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {leaves.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-deep-500 uppercase tracking-wider mb-3">Approved Leaves This Month</h4>
              <div className="space-y-2">
                {leaves
                  .filter(l => l.start_date?.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`))
                  .slice(0, 5)
                  .map(l => (
                    <div key={l.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-deep-600">{l.title}</span>
                      <span className="text-xs text-gray-500">
                        {l.start_date} – {l.end_date}
                        <Badge variant="info" className="ml-2">{l.leave_type}</Badge>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
