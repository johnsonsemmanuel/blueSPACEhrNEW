import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Save, KeyRound } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, setUser } = useAuth()

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  })

  const [password, setPassword] = useState({
    current_password: '',
    new_password: '',
    confirm: '',
  })

  const [saving, setSaving] = useState(false)
  const [changing, setChanging] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!profile.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const res = await api.put('/auth/profile', profile)
      setUser(prev => ({ ...prev, name: profile.name, phone: profile.phone, address: profile.address }))
      localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user') || '{}'), name: profile.name }))
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!password.current_password) { toast.error('Current password is required'); return }
    if (!password.new_password) { toast.error('New password is required'); return }
    if (password.new_password.length < 4) { toast.error('Password must be at least 4 characters'); return }
    if (password.new_password !== password.confirm) { toast.error('Passwords do not match'); return }
    setChanging(true)
    try {
      const res = await api.put('/auth/password', {
        current_password: password.current_password,
        new_password: password.new_password,
      })
      toast.success(res.data.message)
      setPassword({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally {
      setChanging(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center">
          <User size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-deep-600">My Profile</h1>
          <p className="text-xs text-gray-400">Manage your account details and password</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-deep-600" />
            <h2 className="text-sm font-semibold text-deep-600">Account Details</h2>
          </div>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
              <Input
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <Input value={profile.email} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
              <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <Input
                value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
              <textarea
                value={profile.address}
                onChange={e => setProfile({ ...profile, address: e.target.value })}
                placeholder="Your address"
                rows={2}
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-base text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 resize-none"
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-5">
            <KeyRound size={16} className="text-deep-600" />
            <h2 className="text-sm font-semibold text-deep-600">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={password.current_password}
              onChange={e => setPassword({ ...password, current_password: e.target.value })}
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              type="password"
              value={password.new_password}
              onChange={e => setPassword({ ...password, new_password: e.target.value })}
              placeholder="Enter new password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={password.confirm}
              onChange={e => setPassword({ ...password, confirm: e.target.value })}
              placeholder="Confirm new password"
            />
            <Button type="submit" disabled={changing}>
              <Lock size={14} />
              {changing ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </Card>
      </div>
    </motion.div>
  )
}
