import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

export default function LeaveTypes() {
  const [types, setTypes] = useState([])
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({
    title: '',
    days: '',
    max_consecutive_days: '',
    requires_approval: true,
    allow_carry_forward: false,
    carry_forward_limit: '',
  })

  useEffect(() => {
    api.get('/leave-types').then(r => setTypes(r.data)).catch(() => {})
  }, [])

  const openAdd = () => {
    setEdit(null)
    setForm({
      title: '',
      days: '',
      max_consecutive_days: '',
      requires_approval: true,
      allow_carry_forward: false,
      carry_forward_limit: '',
    })
    setModal(true)
  }

  const openEdit = (t) => {
    setEdit(t)
    setForm({
      title: t.title,
      days: String(t.days),
      max_consecutive_days: t.max_consecutive_days ? String(t.max_consecutive_days) : '',
      requires_approval: t.requires_approval === 1 || t.requires_approval === true,
      allow_carry_forward: t.allow_carry_forward === 1 || t.allow_carry_forward === true,
      carry_forward_limit: t.carry_forward_limit ? String(t.carry_forward_limit) : '',
    })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.days) {
      toast.error('Title and days required')
      return
    }
    try {
      if (edit) {
        await api.put(`/leave-types/${edit.id}`, form)
        setTypes(types.map(t => t.id === edit.id ? {
          ...t,
          ...form,
          days: parseInt(form.days),
          max_consecutive_days: form.max_consecutive_days ? parseInt(form.max_consecutive_days) : null,
          requires_approval: form.requires_approval ? 1 : 0,
          allow_carry_forward: form.allow_carry_forward ? 1 : 0,
          carry_forward_limit: form.carry_forward_limit ? parseInt(form.carry_forward_limit) : 0,
        } : t))
        toast.success('Leave type updated')
      } else {
        const { data } = await api.post('/leave-types', form)
        setTypes([...types, {
          ...form,
          id: data.id,
          days: parseInt(form.days),
          max_consecutive_days: form.max_consecutive_days ? parseInt(form.max_consecutive_days) : null,
          requires_approval: form.requires_approval ? 1 : 0,
          allow_carry_forward: form.allow_carry_forward ? 1 : 0,
          carry_forward_limit: form.carry_forward_limit ? parseInt(form.carry_forward_limit) : 0,
        }])
        toast.success('Leave type added')
      }
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this leave type?')) return
    try {
      await api.delete(`/leave-types/${id}`)
      setTypes(types.filter(t => t.id !== id))
      toast.success('Leave type deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <Settings size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Leave Types</h1>
              <p className="text-xs text-gray-500">Configure leave categories and policies</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus size={15} />
            Add Type
          </Button>
        </div>

        <Card padding={false}>
          {types.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Settings size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No leave types configured</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {types.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-deep-600">{t.title}</p>
                      <span className="text-xs text-gray-500">{t.days} days/year</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {t.max_consecutive_days && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          Max {t.max_consecutive_days} consecutive
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${
                        t.requires_approval ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {t.requires_approval ? <CheckCircle size={9} /> : <XCircle size={9} />}
                        {t.requires_approval ? 'Requires approval' : 'Auto-approve'}
                      </span>
                      {(t.allow_carry_forward === 1 || t.allow_carry_forward === true) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                          Carry forward{t.carry_forward_limit ? ` (${t.carry_forward_limit} days)` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-3">
                    <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-deep-600 rounded transition-all duration-150 active:scale-95">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-all duration-150 active:scale-95">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Leave Type' : 'Add Leave Type'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Leave Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Annual Leave"
                required
              />
            </div>
            <Input
              label="Annual Days *"
              type="number"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              placeholder="e.g. 21"
              min="1"
              required
            />
            <Input
              label="Max Consecutive Days"
              type="number"
              value={form.max_consecutive_days}
              onChange={(e) => setForm({ ...form, max_consecutive_days: e.target.value })}
              placeholder="Leave blank for no limit"
              min="1"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Policy Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-deep-600">Requires Approval</p>
                  <p className="text-[11px] text-gray-500">Leave requests must be approved by management</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.requires_approval}
                    onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 bg-gray-200 rounded-full peer peer-checked:bg-brand-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
              </label>

              <label className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-deep-600">Allow Carry Forward</p>
                  <p className="text-[11px] text-gray-500">Unused days can be carried to the next year</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.allow_carry_forward}
                    onChange={(e) => setForm({ ...form, allow_carry_forward: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 bg-gray-200 rounded-full peer peer-checked:bg-brand-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
              </label>

              {form.allow_carry_forward && (
                <div className="pl-2">
                  <Input
                    label="Carry Forward Limit"
                    type="number"
                    value={form.carry_forward_limit}
                    onChange={(e) => setForm({ ...form, carry_forward_limit: e.target.value })}
                    placeholder="Max days to carry forward"
                    min="0"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">{edit ? 'Update' : 'Create'}</Button>
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
