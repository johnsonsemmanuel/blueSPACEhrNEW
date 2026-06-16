import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarPlus, Send, Phone, MapPin, Users, FileText } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function ApplyLeave() {
  const navigate = useNavigate()
  const [leaveTypes, setLeaveTypes] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    leave_reason: '',
    handover_to: '',
    handover_notes: '',
    is_half_day: false,
    contact_during_leave: '',
    leave_address: '',
  })

  useEffect(() => {
    api.get('/leave-types').then(r => setLeaveTypes(r.data)).catch(() => {})
    api.get('/employees/list').then(r => setEmployees(r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast.error('Please fill all required fields')
      return
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error('End date must be after start date')
      return
    }
    setLoading(true)
    try {
      await api.post('/leaves', form)
      toast.success('Leave request submitted successfully')
      navigate('/my-leaves')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit leave request')
    } finally {
      setLoading(false)
    }
  }

  const diffDays = form.start_date && form.end_date && !form.is_half_day
    ? Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24)) + 1
    : form.is_half_day ? 0.5 : 0

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
            <CalendarPlus size={18} className="text-deep-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-deep-600">Apply for Leave</h1>
            <p className="text-xs text-gray-500">Submit a new leave request</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Select
                  label="Leave Type *"
                  placeholder="Select leave type"
                  value={form.leave_type_id}
                  onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                  options={leaveTypes.map((lt) => ({ value: lt.id, label: `${lt.title} (${lt.days} days)` }))}
                />
              </div>

              <Input
                label="Start Date *"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />

              <Input
                label="End Date *"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                min={form.start_date || new Date().toISOString().split('T')[0]}
              />

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="half-day"
                    checked={form.is_half_day}
                    onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })}
                    className="rounded border-gray-300 text-deep-600 focus:ring-deep-500"
                  />
                  <span className="text-xs font-medium text-deep-500">Half Day</span>
                </label>
              </div>
            </div>

            {diffDays > 0 && (
              <div className="bg-deep-50 rounded-md px-4 py-3 flex items-center gap-2">
                <FileText size={14} className="text-deep-600" />
                <span className="text-sm text-deep-600">
                  Total: <strong>{diffDays} day{diffDays > 1 ? 's' : ''}</strong>
                  {form.is_half_day && <span className="text-gray-500 ml-1">(half day)</span>}
                </span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Phone size={13} /> Contact & Location During Leave
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contact Phone (optional)"
                  type="tel"
                  value={form.contact_during_leave}
                  onChange={(e) => setForm({ ...form, contact_during_leave: e.target.value })}
                  placeholder="Number where you can be reached"
                />
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
                    Leave Address (optional)
                  </label>
                  <textarea
                    value={form.leave_address}
                    onChange={(e) => setForm({ ...form, leave_address: e.target.value })}
                    rows={2}
                    className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-500 focus-visible:ring-offset-1"
                    placeholder="Where will you be during your leave?"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={13} /> Handover
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Handover To (optional)"
                  placeholder="Who is covering your work?"
                  value={form.handover_to}
                  onChange={(e) => setForm({ ...form, handover_to: e.target.value })}
                  options={employees.filter(e => e.id !== null).map((emp) => ({ value: emp.id, label: `${emp.name} (${emp.employee_id})` }))}
                />
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
                    Handover Notes (optional)
                  </label>
                  <textarea
                    value={form.handover_notes}
                    onChange={(e) => setForm({ ...form, handover_notes: e.target.value })}
                    rows={2}
                    className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-500 focus-visible:ring-offset-1"
                    placeholder="Brief notes for the person covering you..."
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={13} /> Reason for Leave
              </p>
              <textarea
                value={form.leave_reason}
                onChange={(e) => setForm({ ...form, leave_reason: e.target.value })}
                rows={4}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-500 focus-visible:ring-offset-1"
                placeholder="Briefly describe the reason for your leave..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={loading} className="min-w-[140px]">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send size={14} />
                    Submit Request
                  </span>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/my-leaves')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
