import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, Plus, Edit2, Trash2 } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import ConfirmModal from '../components/ui/ConfirmModal'
import toast from 'react-hot-toast'

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ name: '', branch_id: '' })
  const [dialog, setDialog] = useState(null)

  const runDialog = async () => {
    if (!dialog?.onConfirm) return
    await dialog.onConfirm()
    setDialog(null)
  }

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data)).catch(() => {})
    api.get('/employees/branches').then(r => setBranches(r.data)).catch(() => {})
  }, [])

  const openAdd = () => {
    setEdit(null)
    setForm({ name: '', branch_id: branches[0]?.id || '' })
    setModal(true)
  }

  const openEdit = (d) => {
    setEdit(d)
    setForm({ name: d.name, branch_id: String(d.branch_id) })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) {
      toast.error('Department name required')
      return
    }
    try {
      if (edit) {
        await api.put(`/departments/${edit.id}`, form)
        setDepartments(departments.map(d => d.id === edit.id ? { ...d, ...form, branch_id: parseInt(form.branch_id) } : d))
        toast.success('Department updated')
      } else {
        const { data } = await api.post('/departments', form)
        setDepartments([...departments, { ...form, branch_id: parseInt(form.branch_id), id: data.id }])
        toast.success('Department added')
      }
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/departments/${id}`)
      setDepartments(departments.filter(d => d.id !== id))
      toast.success('Department deleted')
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
              <Building2 size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Departments</h1>
              <p className="text-xs text-gray-500">Manage company departments</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus size={15} />
            Add Department
          </Button>
        </div>

        <Card padding={false}>
          {departments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Building2 size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No departments configured</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {departments.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-deep-600">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.branch_name || 'No branch'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-deep-600 rounded transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDialog({ title: 'Delete Department', message: 'Are you sure you want to delete this department?', onConfirm: () => handleDelete(d.id) })} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Department Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Human Resources"
            required
          />
          <Select
            label="Branch"
            value={form.branch_id}
            onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
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
