import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, CheckCircle, XCircle, Download, Trash2, Eye } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { statusBadge } from '../components/ui/Badge'
import toast from 'react-hot-toast'

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState([])
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [viewOnly, setViewOnly] = useState(null)
  const [remark, setRemark] = useState('')

  useEffect(() => {
    api.get('/leaves').then(r => setLeaves(r.data)).catch(() => {})
  }, [])

  const filtered = filter === 'All' ? leaves : leaves.filter(l => l.status === filter)

  const handleAction = async (id, status) => {
    try {
      await api.put(`/leaves/${id}/status`, { status, remark })
      toast.success(`Leave ${status.toLowerCase()}`)
      setLeaves(leaves.map(l => l.id === id ? { ...l, status, remark } : l))
      setSelected(null)
      setRemark('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this leave request? This cannot be undone.')) return
    try {
      await api.delete(`/leaves/${id}`)
      toast.success('Leave request deleted')
      setLeaves(leaves.filter(l => l.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    }
  }

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/leaves/export', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'leave-report.csv'; a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch (e) {
      toast.error('Export failed')
    }
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <FileText size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Leave Requests</h1>
              <p className="text-xs text-gray-500">Review and manage employee leave requests</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="h-9 px-3 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download size={14} />
            Export CSV
          </button>
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
              <FileText size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Dates</th>
                    <th className="px-5 py-4">Days</th>
                    <th className="px-5 py-4">Handover</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((leave, i) => (
                    <tr key={leave.id} className={`${i !== filtered.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium text-deep-600">{leave.employee_name}</p>
                          <p className="text-[11px] text-gray-400">{leave.employee_code}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{leave.department_name || '–'}</td>
                      <td className="px-5 py-4 font-medium">
                        {leave.leave_type_name}{leave.is_half_day ? ' (½)' : ''}
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                        {leave.start_date} – {leave.end_date}
                      </td>
                      <td className="px-5 py-4">{leave.total_leave_days}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{leave.handover_name || '–'}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs max-w-[180px] truncate">
                        {leave.leave_reason || '–'}
                      </td>
                      <td className="px-5 py-4">{statusBadge(leave.status)}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setViewOnly(leave)}
                            className="p-1.5 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                          {leave.status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => { setSelected(leave); setRemark('') }}
                                className="p-1.5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle size={15} />
                              </button>
                              <button
                                onClick={() => { setSelected(leave); setRemark('') }}
                                className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Reject"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          ) : null}
                          <button
                            onClick={() => handleDelete(leave.id)}
                            className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete Leave"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* Approve/Reject Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Review: ${selected?.employee_name}'s ${selected?.leave_type_name}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Dates</p>
                <p className="font-medium text-deep-600">{selected.start_date} – {selected.end_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Days</p>
                <p className="font-medium text-deep-600">{selected.total_leave_days}{selected.is_half_day ? ' (Half Day)' : ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Handover To</p>
                <p className="font-medium text-deep-600">{selected.handover_name || 'None'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Reason</p>
              <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{selected.leave_reason}</p>
            </div>
            {selected.contact_during_leave && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Contact During Leave</p>
                <p className="text-sm text-deep-600">{selected.contact_during_leave}</p>
              </div>
            )}
            {selected.leave_address && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Leave Address</p>
                <p className="text-sm text-deep-600">{selected.leave_address}</p>
              </div>
            )}
            {selected.handover_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Handover Notes</p>
                <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{selected.handover_notes}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
                Remark (optional)
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-500 focus-visible:ring-offset-1"
                placeholder="Add a remark..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="primary" onClick={() => handleAction(selected.id, 'Approved')} className="flex-1">
                <CheckCircle size={14} />
                Approve
              </Button>
              <Button variant="danger" onClick={() => handleAction(selected.id, 'Rejected')} className="flex-1">
                <XCircle size={14} />
                Reject
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* View Details Modal */}
      <Modal open={!!viewOnly} onClose={() => setViewOnly(null)} title={`${viewOnly?.employee_name}'s ${viewOnly?.leave_type_name}`} size="lg">
        {viewOnly && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="h-10 w-10 rounded-full bg-deep-100 flex items-center justify-center text-sm font-bold text-deep-600">
                {viewOnly.employee_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-deep-600">{viewOnly.employee_name}</p>
                <p className="text-xs text-gray-400">{viewOnly.employee_code} · {viewOnly.department_name || 'No department'}</p>
              </div>
              <div className="ml-auto">{statusBadge(viewOnly.status)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Leave Type</p>
                <p className="font-medium text-deep-600">{viewOnly.leave_type_name}{viewOnly.is_half_day ? ' (Half Day)' : ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Days</p>
                <p className="font-medium text-deep-600">{viewOnly.total_leave_days}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="font-medium text-deep-600">{viewOnly.start_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="font-medium text-deep-600">{viewOnly.end_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Handover To</p>
                <p className="font-medium text-deep-600">{viewOnly.handover_name || 'None'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Applied On</p>
                <p className="font-medium text-deep-600">{viewOnly.applied_on ? new Date(viewOnly.applied_on).toLocaleDateString('en-GB') : '–'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Reason / Description</p>
              <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{viewOnly.leave_reason || 'No reason provided'}</p>
            </div>
            {viewOnly.contact_during_leave && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Contact During Leave</p>
                <p className="text-sm text-deep-600">{viewOnly.contact_during_leave}</p>
              </div>
            )}
            {viewOnly.leave_address && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Leave Address</p>
                <p className="text-sm text-deep-600">{viewOnly.leave_address}</p>
              </div>
            )}
            {viewOnly.handover_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Handover Notes</p>
                <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{viewOnly.handover_notes}</p>
              </div>
            )}
            {viewOnly.remark && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Admin Remark</p>
                <p className="text-sm text-deep-600 bg-gray-50 rounded-md p-3">{viewOnly.remark}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
