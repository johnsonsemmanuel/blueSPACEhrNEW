import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarPlus, Send, Phone, MapPin, Users, FileText, Eye, Edit3, CheckCircle } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

export default function ApplyLeave() {
  const navigate = useNavigate()
  const [leaveTypes, setLeaveTypes] = useState([])
  const [employees, setEmployees] = useState([])
  const [balance, setBalance] = useState([])
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
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
    api.get('/leaves/balance').then(r => setBalance(r.data)).catch(() => {})
  }, [])

  const selectedType = leaveTypes.find(lt => lt.id === parseInt(form.leave_type_id))
  const remainingBalance = balance.find(b => b.id === parseInt(form.leave_type_id))?.remaining

  const diffDays = form.start_date && form.end_date && !form.is_half_day
    ? Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24)) + 1
    : form.is_half_day ? 0.5 : 0

  const handoverEmp = employees.find(e => e.id === parseInt(form.handover_to))

  const handlePreview = (e) => {
    e.preventDefault()
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast.error('Please fill all required fields')
      return
    }
    if (!form.leave_reason.trim()) {
      toast.error('Please provide a reason for your leave')
      return
    }
    if (!form.handover_to) {
      toast.error('Please select a handover staff')
      return
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error('End date must be after start date')
      return
    }
    if (remainingBalance !== undefined && diffDays > remainingBalance) {
      toast.error(`Insufficient balance. You have ${remainingBalance} days remaining.`)
      return
    }
    setShowPreview(true)
  }

  const handleSubmit = async () => {
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

        {balance.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {balance.map((b) => (
              <div key={b.id} className={`px-3 py-1.5 rounded-md text-xs font-medium border ${form.leave_type_id == b.id ? 'bg-deep-50 border-deep-200 text-deep-700' : 'bg-white border-gray-100 text-gray-600'}`}>
                {b.title}: <strong>{b.remaining}</strong>/{b.total} days
              </div>
            ))}
          </div>
        )}

        <Card>
          <form onSubmit={handlePreview} className="space-y-5">
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
                  {remainingBalance !== undefined && (
                    <span className="text-gray-500 ml-2">· {remainingBalance} days remaining</span>
                  )}
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
                  label="Handover To *"
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
                <FileText size={13} /> Reason for Leave *
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
              <Button type="submit" className="min-w-[140px]">
                <Eye size={14} />
                Preview & Submit
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/my-leaves')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title="Preview Leave Request" size="lg">
        <div className="space-y-4">
          <div className="bg-deep-50 rounded-lg p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-deep-100 flex items-center justify-center text-lg font-bold text-deep-600">
              {selectedType?.title?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-deep-600">{selectedType?.title || 'Leave'}{form.is_half_day ? ' (Half Day)' : ''}</p>
              <p className="text-xs text-gray-500">{diffDays} day{diffDays > 1 ? 's' : ''} · {form.start_date} – {form.end_date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="font-medium text-deep-600">{form.start_date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">End Date</p>
              <p className="font-medium text-deep-600">{form.end_date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Days</p>
              <p className="font-medium text-deep-600">{diffDays}</p>
            </div>
            {remainingBalance !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Remaining Balance</p>
                <p className="font-medium text-deep-600">{remainingBalance} days</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Reason</p>
            <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{form.leave_reason}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Handover To</p>
            <p className="text-sm text-deep-600">{handoverEmp?.name || 'Selected employee'}</p>
            {form.handover_notes && (
              <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-md p-2">{form.handover_notes}</p>
            )}
          </div>

          {form.contact_during_leave && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Contact During Leave</p>
              <p className="text-sm text-deep-600">{form.contact_during_leave}</p>
            </div>
          )}

          {form.leave_address && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Leave Address</p>
              <p className="text-sm text-deep-600">{form.leave_address}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle size={14} />
                  Confirm & Submit
                </span>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>
              <Edit3 size={14} />
              Edit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
