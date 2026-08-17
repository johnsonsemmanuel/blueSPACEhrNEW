import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

export default function Branches() {
  const [branches, setBranches] = useState([])
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ name: '' })

  useEffect(() => {
    api.get('/branches').then(r => setBranches(r.data)).catch(() => {})
  }, [])

  const openAdd = () => {
    setEdit(null)
    setForm({ name: '' })
    setModal(true)
  }

  const openEdit = (b) => {
    setEdit(b)
    setForm({ name: b.name })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) {
      toast.error('Branch name required')
      return
    }
    try {
      if (edit) {
        await api.put(`/branches/${edit.id}`, form)
        setBranches(branches.map(b => b.id === edit.id ? { ...b, ...form } : b))
        toast.success('Branch updated')
      } else {
        const { data } = await api.post('/branches', form)
        setBranches([...branches, { ...form, id: data.id }])
        toast.success('Branch added')
      }
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this branch?')) return
    try {
      await api.delete(`/branches/${id}`)
      setBranches(branches.filter(b => b.id !== id))
      toast.success('Branch deleted')
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
              <MapPin size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Branches</h1>
              <p className="text-xs text-gray-500">Manage company branches</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus size={15} />
            Add Branch
          </Button>
        </div>

        <Card padding={false}>
          {branches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MapPin size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No branches configured</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {branches.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-deep-600">{b.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-deep-600 rounded transition-all duration-150 active:scale-95">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-all duration-150 active:scale-95">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Branch' : 'Add Branch'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Branch Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Accra Office"
            required
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit">{edit ? 'Update' : 'Create'}</Button>
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
