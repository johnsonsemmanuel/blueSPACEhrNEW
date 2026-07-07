import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, XCircle, Trash2, Edit3, Eye } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import { statusBadge } from '../components/ui/Badge'
import toast from 'react-hot-toast'

export default function MyLeaves() {
  const [leaves, setLeaves] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [employees, setEmployees] = useState([])
  const [filter, setFilter] = useState('All')
  const [editModal, setEditModal] = useState(false)
  const [viewModal, setViewModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState(null)

  const runDialog = async () => {
    if (!dialog?.onConfirm) return
    await dialog.onConfirm()
    setDialog(null)
  }

  useEffect(() => {
    api.get('/leaves').then(r => setLeaves(r.data)).catch(() => {})
    api.get('/leave-types').then(r => setLeaveTypes(r.data)).catch(() => {})
    api.get('/employees/list').then(r => setEmployees(r.data)).catch(() => {})
  }, [])

  const filtered = filter === 'All' ? leaves : leaves.filter(l => l.status === filter)

  const openEdit = (leave) => {
    setEditing(leave)
    setForm({
      leave_type_id: leave.leave_type_id,
      start_date: leave.start_date,
      end_date: leave.end_date,
      leave_reason: leave.leave_reason || '',
      handover_to: leave.handover_to || '',
      handover_notes: leave.handover_notes || '',
      is_half_day: leave.is_half_day === 1 || leave.is_half_day === true,
      contact_during_leave: leave.contact_during_leave || '',
      leave_address: leave.leave_address || '',
    })
    setEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      await api.put(`/leaves/${editing.id}`, form)
      setLeaves(leaves.map(l => l.id === editing.id ? { ...l, ...form, handover_to: form.handover_to || null, handover_notes: form.handover_notes || '', contact_during_leave: form.contact_during_leave || '', leave_address: form.leave_address || '' } : l))
      toast.success('Leave request updated')
      setEditModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (id) => {
    try {
      await api.put(`/leaves/${id}/cancel`)
      toast.success('Leave request cancelled')
      setLeaves(leaves.map(l => l.id === id ? { ...l, status: 'Cancelled' } : l))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/leaves/${id}`)
      toast.success('Leave request deleted')
      setLeaves(leaves.filter(l => l.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    }
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <CalendarCheck size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">My Leaves</h1>
              <p className="text-xs text-gray-500">View and track your leave requests</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f ? 'bg-deep-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <Card padding={false}>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarCheck size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No leave records found</p>
              <p className="text-xs mt-1">Submit a leave request to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Start</th>
                    <th className="px-5 py-4">End</th>
                    <th className="px-5 py-4">Days</th>
                    <th className="px-5 py-4">Reason</th>
                    <th className="px-5 py-4">Handover</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Remark</th>
                    <th className="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((leave, i) => (
                    <tr key={leave.id} className={`${i !== filtered.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-5 py-4 font-medium text-deep-600">
                        {leave.leave_type_name}{leave.is_half_day ? ' (½)' : ''}
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{leave.start_date}</td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{leave.end_date}</td>
                      <td className="px-5 py-4">{leave.total_leave_days}</td>
                      <td className="px-5 py-4 text-gray-500 max-w-[150px] truncate">{leave.leave_reason}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs max-w-[120px] truncate">
                        {leave.handover_name || '–'}
                      </td>
                      <td className="px-5 py-4">{statusBadge(leave.status)}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs max-w-[120px] truncate">{leave.remark || '–'}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setViewing(leave); setViewModal(true) }}
                            className="p-1.5 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {leave.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => openEdit(leave)}
                                className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Edit Leave"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => setDialog({ title: 'Cancel Leave', message: 'Are you sure you want to cancel this leave request?', onConfirm: () => handleCancel(leave.id) })}
                                className="p-1.5 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                                title="Cancel Leave"
                              >
                                <XCircle size={14} />
                              </button>
                              <button
                                onClick={() => setDialog({ title: 'Delete Leave', message: 'Are you sure you want to permanently delete this leave request? This action cannot be undone.', onConfirm: () => handleDelete(leave.id) })}
                                className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Delete Leave"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* View Details Modal */}
      <Modal open={viewModal} onClose={() => setViewModal(false)} title={`Leave Details`} size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="h-10 w-10 rounded-full bg-deep-100 flex items-center justify-center text-sm font-bold text-deep-600">
                {viewing.leave_type_name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-deep-600">{viewing.leave_type_name}{viewing.is_half_day ? ' (Half Day)' : ''}</p>
                <p className="text-xs text-gray-400">{viewing.total_leave_days} day(s) · {viewing.start_date} – {viewing.end_date}</p>
              </div>
              <div className="ml-auto">{statusBadge(viewing.status)}</div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Reason</p>
              <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{viewing.leave_reason || 'No reason provided'}</p>
            </div>
            {viewing.handover_name && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Handover To</p>
                <p className="text-sm text-deep-600">{viewing.handover_name}</p>
              </div>
            )}
            {viewing.handover_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Handover Notes</p>
                <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{viewing.handover_notes}</p>
              </div>
            )}
            {viewing.contact_during_leave && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Contact During Leave</p>
                <p className="text-sm text-deep-600">{viewing.contact_during_leave}</p>
              </div>
            )}
            {viewing.leave_address && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Leave Address</p>
                <p className="text-sm text-deep-600">{viewing.leave_address}</p>
              </div>
            )}
            {viewing.remark && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Admin Remark</p>
                <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{viewing.remark}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Leave Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Leave Request" size="lg">
        <form onSubmit={handleEditSubmit} className="space-y-4">
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
            />
            <Input
              label="End Date *"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              min={form.start_date || undefined}
            />
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_half_day}
                  onChange={(e) => setForm({ ...form, is_half_day: e.target.checked })}
                  className="rounded border-gray-300 text-deep-600 focus:ring-deep-500"
                />
                <span className="text-xs font-medium text-deep-500">Half Day</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
              Reason for Leave
            </label>
            <textarea
              value={form.leave_reason}
              onChange={(e) => setForm({ ...form, leave_reason: e.target.value })}
              rows={3}
              className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-base text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-500 focus-visible:ring-offset-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Handover To (optional)"
              placeholder="Who is covering?"
              value={form.handover_to}
              onChange={(e) => setForm({ ...form, handover_to: e.target.value })}
              options={employees.filter(e => e.id !== null).map((emp) => ({ value: emp.id, label: `${emp.name} (${emp.employee_id})` }))}
            />
            <div>
              <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
                Contact Phone (optional)
              </label>
              <input
                type="tel"
                value={form.contact_during_leave}
                onChange={(e) => setForm({ ...form, contact_during_leave: e.target.value })}
                placeholder="Phone during leave"
                className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-base text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-500 focus-visible:ring-offset-1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
                Leave Address (optional)
              </label>
              <textarea
                value={form.leave_address}
                onChange={(e) => setForm({ ...form, leave_address: e.target.value })}
                rows={2}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-500 focus-visible:ring-offset-1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
                Handover Notes (optional)
              </label>
              <textarea
                value={form.handover_notes}
                onChange={(e) => setForm({ ...form, handover_notes: e.target.value })}
                rows={2}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-500 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmText="Yes, continue"
        onConfirm={runDialog}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}
