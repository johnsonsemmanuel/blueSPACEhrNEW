import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CalendarOff, Plus, Edit2, Trash2, Calendar } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

export default function Holidays() {
  const [holidays, setHolidays] = useState([])
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ occasion: '', date: '', end_date: '' })

  useEffect(() => {
    api.get('/holidays').then(r => setHolidays(r.data)).catch(() => {})
  }, [])

  const openAdd = () => {
    setEdit(null)
    setForm({ occasion: '', date: '', end_date: '' })
    setModal(true)
  }

  const openEdit = (h) => {
    setEdit(h)
    setForm({
      occasion: h.occasion,
      date: h.date,
      end_date: h.end_date || h.date,
    })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.occasion || !form.date) {
      toast.error('Holiday name and date are required')
      return
    }
    if (form.end_date && form.end_date < form.date) {
      toast.error('End date must be on or after start date')
      return
    }
    try {
      if (edit) {
        await api.put(`/holidays/${edit.id}`, form)
        setHolidays(holidays.map(h => h.id === edit.id ? { ...h, ...form } : h))
        toast.success('Holiday updated')
      } else {
        const { data } = await api.post('/holidays', form)
        setHolidays([...holidays, { ...form, id: data.id, end_date: form.end_date || form.date }].sort((a, b) => a.date.localeCompare(b.date)))
        toast.success('Holiday added')
      }
      setModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return
    try {
      await api.delete(`/holidays/${id}`)
      setHolidays(holidays.filter(h => h.id !== id))
      toast.success('Holiday deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const formatDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const now = new Date()
  const upcoming = holidays.filter(h => new Date(h.date + 'T00:00:00') >= now)
  const past = holidays.filter(h => new Date(h.date + 'T00:00:00') < now)

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <CalendarOff size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Holidays</h1>
              <p className="text-xs text-gray-500">{holidays.length} configured holiday{holidays.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus size={15} />
            Add Holiday
          </Button>
        </div>

        {holidays.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-400">
              <CalendarOff size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No holidays configured</p>
              <p className="text-xs mt-1">Add holidays to exclude them from leave day calculations</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar size={12} />
                  Upcoming
                </h3>
                <Card padding={false}>
                  <div className="divide-y divide-gray-50">
                    {upcoming.map((h) => (
                      <div key={h.id} className="flex items-center justify-between px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-deep-600">{h.occasion}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(h.date)}
                            {h.end_date && h.end_date !== h.date && ` - ${formatDate(h.end_date)}`}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(h)} className="p-1.5 text-gray-400 hover:text-deep-600 rounded transition-all duration-150 active:scale-95">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(h.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-all duration-150 active:scale-95">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Past</h3>
                <Card padding={false}>
                  <div className="divide-y divide-gray-50">
                    {past.map((h) => (
                      <div key={h.id} className="flex items-center justify-between px-5 py-4 opacity-60">
                        <div>
                          <p className="text-sm font-medium text-deep-600">{h.occasion}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(h.date)}
                            {h.end_date && h.end_date !== h.date && ` - ${formatDate(h.end_date)}`}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(h)} className="p-1.5 text-gray-400 hover:text-deep-600 rounded transition-all duration-150 active:scale-95">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(h.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-all duration-150 active:scale-95">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Holiday' : 'Add Holiday'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Holiday Name *"
            value={form.occasion}
            onChange={(e) => setForm({ ...form, occasion: e.target.value })}
            placeholder="e.g. Independence Day"
            required
          />
          <Input
            label="Start Date *"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <Input
            label="End Date (optional)"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            min={form.date || undefined}
          />
          <p className="text-[11px] text-gray-400 -mt-2">Leave blank for a single-day holiday. Set an end date for multi-day holidays.</p>
          <div className="flex gap-3 pt-2">
            <Button type="submit">{edit ? 'Update' : 'Create'}</Button>
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
