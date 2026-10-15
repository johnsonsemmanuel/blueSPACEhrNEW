import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, MegaphoneOff, Plus, Send, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

export default function Announcements() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', body: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.get('/announcements').then(r => setItems(r.data)).catch(() => {})
  }, [])

  const openCompose = () => {
    setForm({ title: '', body: '' })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const title = form.title.trim()
    const body = form.body.trim()
    if (!title || !body) {
      toast.error('Title and message are required')
      return
    }
    setSending(true)
    try {
      const { data } = await api.post('/announcements', { title, body })
      setItems([data, ...items])
      setModal(false)
      toast.success('Announcement sent to all staff')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to publish announcement')
    } finally {
      setSending(false)
    }
  }

  const formatDateTime = (d) => {
    if (!d) return ''
    try {
      return new Date(d).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return String(d)
    }
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <Megaphone size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Announcements</h1>
              <p className="text-xs text-gray-500">{items.length} announcement{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button onClick={openCompose} disabled={sending}>
            <Plus size={15} />
            Compose Announcement
          </Button>
        </div>

        {items.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-400">
              <MegaphoneOff size={36} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">No announcements yet</p>
              <p className="text-xs mt-1">Publish announcements to notify all staff via email and bell</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-deep-600 truncate">{a.title}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(a.created_at)}</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap mt-3 leading-relaxed">{a.body}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      <Modal open={modal} onClose={() => !sending && setModal(false)} title="Compose Announcement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Public Holiday Notice"
            required
          />
          <div>
            <label className="form-label mb-1.5">Message *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={6}
              className="form-input"
              placeholder="Enter the announcement message. Line breaks are preserved."
              required
            />
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-600 mt-0.5" />
            <p className="text-[11px] text-amber-700">
              Publishing sends an email and a bell notification to <strong>all active staff</strong>.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={sending}>
              <Send size={14} />
              {sending ? 'Publishing...' : 'Publish Announcement'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setModal(false)} disabled={sending}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
