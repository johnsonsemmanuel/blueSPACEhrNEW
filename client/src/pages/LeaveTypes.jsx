import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Plus, Edit2, Trash2 } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import toast from 'react-hot-toast'

export default function LeaveTypes() {
  const [types, setTypes] = useState([])
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ title: '', days: '' })
  const [dialog, setDialog] = useState(null)

  const runDialog = async () => {
    if (!dialog?.onConfirm) return
    await dialog.onConfirm()
    setDialog(null)
  }

  useEffect(() => {
    api.get('/leave-types').then(r => setTypes(r.data)).catch(() => {})
  }, [])

  const openAdd = () => {
    setEdit(null)
    setForm({ title: '', days: '' })
    setModal(true)
  }

  const openEdit = (t) => {
    setEdit(t)
    setForm({ title: t.title, days: String(t.days) })
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
        setTypes(types.map(t => t.id === edit.id ? { ...t, ...form, days: parseInt(form.days) } : t))
        toast.success('Leave type updated')
      } else {
        const { data } = await api.post('/leave-types', form)
        setTypes([...types, { ...form, days: parseInt(form.days), id: data.id }])
        toast.success('Leave type added')
      }
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    }
  }

  const handleDelete = async (id) => {
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <Settings size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Leave Types</h1>
              <p className="text-xs text-gray-500">Configure leave categories and allocations</p>
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
                  <div>
                    <p className="text-sm font-medium text-deep-600">{t.title}</p>
                    <p className="text-xs text-gray-500">{t.days} days per year</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-deep-600 rounded transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDialog({ title: 'Delete Leave Type', message: 'Are you sure you want to delete this leave type?', onConfirm: () => handleDelete(t.id) })} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Leave Type' : 'Add Leave Type'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Leave Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Annual Leave"
            required
          />
          <Input
            label="Annual Days"
            type="number"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
            placeholder="e.g. 21"
            min="1"
            required
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit">{edit ? 'Update' : 'Create'}</Button>
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmText="Yes, delete"
        onConfirm={runDialog}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}
