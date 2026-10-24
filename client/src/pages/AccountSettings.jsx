import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Building2, DollarSign, CreditCard, Bell, Shield, Database, Download, Upload, RefreshCw, AlertTriangle, CheckCircle, XCircle, Loader2, Save, Eye, EyeOff, Send, Plus, User, KeyRound, Lock } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

const PAY_SCHEDULES = ['weekly', 'biweekly', 'monthly']
const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'NGN']

export default function AccountSettings() {
  const { user, setUser } = useAuth()
  const isMgmt = user?.type === 'Management'
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState(user?.type === 'Management' ? 'company' : 'profile')
  const [initDefaults, setInitDefaults] = useState(false)
  const [reminders, setReminders] = useState([])
  const [reminderLoading, setReminderLoading] = useState(false)
  const [reminderModal, setReminderModal] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)
  const [reminderForm, setReminderForm] = useState({})

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
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const fetchSettings = async () => {
    if (!isMgmt) return
    setLoading(true)
    try {
      const res = await api.get('/management/settings')
      const settingsObj = {}
      res.data.forEach(s => {
        try {
          settingsObj[s.setting_key] = JSON.parse(s.setting_value)
        } catch {
          settingsObj[s.setting_key] = s.setting_value
        }
      })
      setSettings(settingsObj)
    } catch (err) {
      console.error('Settings fetch error:', err)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchReminders = async () => {
    if (!isMgmt) return
    setReminderLoading(true)
    try {
      const res = await api.get('/management/reminders')
      setReminders(res.data)
    } catch (err) {
      console.error('Reminders fetch error:', err)
    } finally {
      setReminderLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchReminders()
  }, [])

  const getSetting = (key, defaultValue = '') => settings[key] ?? defaultValue

  const handleSave = async (key, value) => {
    setSaving(true)
    try {
      await api.put(`/management/settings/${key}`, { setting_value: value })
      setSettings(prev => ({ ...prev, [key]: value }))
      toast.success(`${key} updated`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!profile.name.trim()) { toast.error('Name is required'); return }
    setSavingProfile(true)
    try {
      const res = await api.put('/auth/profile', profile)
      setUser(prev => ({ ...prev, name: profile.name, phone: profile.phone, address: profile.address }))
      localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user') || '{}'), name: profile.name }))
      toast.success(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!password.current_password) { toast.error('Current password is required'); return }
    if (!password.new_password) { toast.error('New password is required'); return }
    if (password.new_password.length < 4) { toast.error('Password must be at least 4 characters'); return }
    if (password.new_password !== password.confirm) { toast.error('Passwords do not match'); return }
    setChangingPassword(true)
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
      setChangingPassword(false)
    }
  }

  const handleInitDefaults = async () => {
    try {
      await api.post('/management/settings/init-defaults')
      toast.success('Default settings initialized')
      fetchSettings()
      setInitDefaults(false)
    } catch (err) {
      toast.error('Failed to initialize defaults')
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch('/api/management/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bluespace-settings-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    } catch (err) {
      toast.error('Export failed')
    }
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result)
        for (const [key, value] of Object.entries(data)) {
          await api.put(`/management/settings/${key}`, { setting_value: value })
        }
        toast.success('Settings imported')
        fetchSettings()
      } catch (err) {
        toast.error('Invalid settings file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const openReminderModal = (reminder = null) => {
    if (reminder) {
      setReminderForm({
        title: reminder.title,
        description: reminder.description || '',
        amount: reminder.amount || '',
        due_date: reminder.due_date?.split('T')[0] || '',
        category: reminder.category || 'General',
        branch_id: reminder.branch_id || '',
        department_id: reminder.department_id || '',
        reminder_days_before: reminder.reminder_days_before || 3,
      })
      setEditingReminder(reminder)
    } else {
      setReminderForm({
        title: '',
        description: '',
        amount: '',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        category: 'General',
        branch_id: '',
        department_id: '',
        reminder_days_before: 3,
      })
      setEditingReminder(null)
    }
    setReminderModal(true)
  }

  const closeReminderModal = () => {
    setReminderModal(false)
    setEditingReminder(null)
    setReminderForm({})
  }

  const handleReminderSave = async () => {
    if (!reminderForm.title || !reminderForm.due_date) {
      toast.error('Title and due date are required')
      return
    }
    try {
      if (editingReminder) {
        await api.put(`/management/reminders/${editingReminder.id}`, reminderForm)
        toast.success('Reminder updated')
      } else {
        await api.post('/management/reminders', reminderForm)
        toast.success('Reminder created')
      }
      closeReminderModal()
      fetchReminders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save reminder')
    }
  }

  const handleReminderNotify = async (id) => {
    try {
      await api.post(`/management/reminders/${id}/notify`)
      toast.success('Reminder sent to management via email')
      fetchReminders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reminder')
    }
  }

  const upcomingReminders = (reminders || []).filter(r => r.status === 'Pending' && new Date(r.due_date) >= new Date()).slice(0, 5)

  const tabs = isMgmt 
    ? [
        { id: 'company', label: 'Company', icon: Building2 },
        { id: 'payroll', label: 'Payroll', icon: CreditCard },
        { id: 'expenses', label: 'Expenses', icon: DollarSign },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'data', label: 'Data', icon: Database },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'password', label: 'Password', icon: KeyRound },
      ]
    : [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'password', label: 'Password', icon: KeyRound },
      ]

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <Settings size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">{isMgmt ? 'Account Settings' : 'My Account'}</h1>
              <p className="text-xs text-gray-500">{isMgmt ? 'Manage organization settings and preferences' : 'Manage your profile and password'}</p>
            </div>
          </div>
          {isMgmt && Object.keys(settings).length === 0 && !initDefaults && (
            <Button variant="outline" onClick={() => setInitDefaults(true)}>
              <RefreshCw size={14} /> Initialize Defaults
            </Button>
          )}
        </div>

        {initDefaults && (
          <Card className="mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">No settings configured</p>
                  <p className="text-sm text-amber-700">Click below to initialize default settings for tax rates, SSNIT, pay schedule, and expense categories.</p>
                </div>
              </div>
              <Button onClick={handleInitDefaults}>Initialize Defaults</Button>
            </div>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-100">
          <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Settings tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-4 flex items-center gap-2">
                <Building2 size={14} /> Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Company Name" placeholder="BlueSPACE HR" value={getSetting('company_name')} onChange={e => handleSave('company_name', e.target.value)} />
                <Input label="Tax ID / Registration Number" placeholder="C123456" value={getSetting('company_tax_id')} onChange={e => handleSave('company_tax_id', e.target.value)} />
                <div className="md:col-span-2">
                  <label className="form-label mb-1">Address</label>
                  <textarea value={getSetting('company_address')} onChange={e => handleSave('company_address', e.target.value)} rows={3} className="form-input" placeholder="123 Business Street, Accra, Ghana" />
                </div>
                <Input label="Logo URL" type="url" placeholder="https://example.com/logo.png" value={getSetting('company_logo')} onChange={e => handleSave('company_logo', e.target.value)} />
                <Select label="Currency" placeholder="Select currency" value={getSetting('currency')} onChange={e => handleSave('currency', e.target.value)}
                  options={CURRENCIES.map(c => ({value: c, label: c}))} />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-4 flex items-center gap-2">
                <CreditCard size={14} /> Payroll Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label mb-1">Tax Rate</label>
                  <div className="relative">
                    <Input type="number" step="0.001" min="0" max="1" placeholder="0.15" value={getSetting('tax_rate')} onChange={e => handleSave('tax_rate', parseFloat(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">(e.g., 0.15 = 15%)</span>
                  </div>
                </div>
                <div>
                  <label className="form-label mb-1">SSNIT Rate</label>
                  <div className="relative">
                    <Input type="number" step="0.001" min="0" max="1" placeholder="0.055" value={getSetting('ssnit_rate')} onChange={e => handleSave('ssnit_rate', parseFloat(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">(e.g., 0.055 = 5.5%)</span>
                  </div>
                </div>
                <Select label="Pay Schedule" placeholder="Select schedule" value={getSetting('pay_schedule')} onChange={e => handleSave('pay_schedule', e.target.value)}
                  options={PAY_SCHEDULES.map(p => ({value: p, label: p.charAt(0).toUpperCase() + p.slice(1)}))} />
                <div>
                  <label className="form-label mb-1">Overtime Multiplier</label>
                  <div className="relative">
                    <Input type="number" step="0.1" min="1" placeholder="1.5" value={getSetting('overtime_multiplier')} onChange={e => handleSave('overtime_multiplier', parseFloat(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">(e.g., 1.5 = 150%)</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-4 flex items-center gap-2">
                <Database size={14} /> Salary Configurations
              </h3>
              <p className="text-xs text-gray-500 mb-4">Configure individual employee salaries in the <a href="/payslips" className="text-brand-600 hover:underline">Payslips</a> page.</p>
            </Card>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-4 flex items-center gap-2">
                <DollarSign size={14} /> Expense Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {((getSetting('expense_categories') || [])).map((cat, i) => (
                  <Badge key={i} variant="info" className="gap-1">
                    {cat}
                    <button onClick={() => {
                      const cats = [...(getSetting('expense_categories') || [])]
                      cats.splice(i, 1)
                      handleSave('expense_categories', cats)
                    }} className="ml-1 hover:text-red-600">×</button>
                  </Badge>
                ))}
                <Input placeholder="New category" value={''} onChange={e => {}} className="w-auto" onKeyDown={e => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const cats = [...(getSetting('expense_categories') || []), e.target.value.trim()]
                    handleSave('expense_categories', cats)
                    e.target.value = ''
                  }
                }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">Press Enter to add a new category. Click × to remove.</p>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-deep-600 flex items-center gap-2">
                  <Bell size={14} /> Payment Reminders
                </h3>
                <Button onClick={() => openReminderModal()} size="sm">
                  <Plus size={13} /> Add Reminder
                </Button>
              </div>

              {upcomingReminders && Array.isArray(upcomingReminders) && upcomingReminders.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <p className="text-sm font-medium text-amber-800">{(upcomingReminders || []).length} upcoming reminder(s)</p>
                  </div>
                  <div className="space-y-1">
                    {upcomingReminders && Array.isArray(upcomingReminders) && upcomingReminders.map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm">
                        <span className="text-amber-700">{r.title} - due {new Date(r.due_date).toLocaleDateString('en-GB')}</span>
                        {r.amount && <span className="font-medium">₵{Number(r.amount).toLocaleString()}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider">
                      <th className="pb-3 pr-4">Title</th>
                      <th className="pb-3 pr-4">Due Date</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3 pr-4">Category</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Remind Before</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-deep-600">
                    {reminderLoading ? (
                      <tr><td colSpan={7} className="text-center py-8"><Loader2 size={20} className="mx-auto animate-spin" /></td></tr>
                    ) : (reminders || []).length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">No reminders yet</td></tr>
                    ) : (
                      reminders.map(r => (
                        <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                          <td className="py-3 pr-4 font-medium">{r.title}</td>
                          <td className="py-3 pr-4 text-gray-500">{new Date(r.due_date).toLocaleDateString('en-GB')}</td>
                          <td className="py-3 pr-4">{r.amount ? `₵${Number(r.amount).toLocaleString()}` : '-'}</td>
                          <td className="py-3 pr-4"><Badge variant="info" className="text-[10px]">{r.category}</Badge></td>
                          <td className="py-3 pr-4">
                            <Badge variant={r.status === 'Pending' ? 'warning' : r.status === 'Completed' ? 'success' : 'secondary'} className="text-[10px]">
                              {r.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-gray-500">{r.reminder_days_before} day(s)</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openReminderModal(r)} className="p-1.5 text-gray-400 hover:text-brand-600" title="Edit"><Eye size={13} /></button>
                              <button onClick={() => handleReminderNotify(r.id)} className="p-1.5 text-gray-400 hover:text-green-600" title="Send Reminder"><Send size={13} /></button>
                              <button onClick={() => handleReminderDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600" title="Delete"><XCircle size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-4 flex items-center gap-2">
                <Shield size={14} /> Security Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-deep-600">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">Require 2FA for all management accounts</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-deep-600">Session Timeout</p>
                    <p className="text-xs text-gray-500">Auto-logout after inactivity</p>
                  </div>
                  <Select value="30" onChange={e => {}} options={[{value:'15',label:'15 min'},{value:'30',label:'30 min'},{value:'60',label:'1 hour'},{value:'120',label:'2 hours'}]} className="w-40" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-deep-600">Password Policy</p>
                    <p className="text-xs text-gray-500">Enforce strong passwords</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-semibold text-deep-600 mb-4 flex items-center gap-2">
                <Database size={14} /> Data Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Download size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-deep-600">Export All Settings</p>
                      <p className="text-xs text-gray-500">Download settings as JSON backup</p>
                    </div>
                  </div>
                  <Button onClick={handleExport} variant="outline" className="w-full">
                    <Download size={14} /> Export Settings
                  </Button>
                </div>
                <div className="p-4 border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Upload size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-deep-600">Import Settings</p>
                      <p className="text-xs text-gray-500">Restore settings from JSON backup</p>
                    </div>
                  </div>
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" id="import-file" />
                  <Button onClick={() => document.getElementById('import-file').click()} variant="outline" className="w-full">
                    <Upload size={14} /> Import Settings
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} /> Danger Zone
              </h3>
              <p className="text-xs text-red-600 mb-4">These actions are irreversible. Use with extreme caution.</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  <Database size={14} /> Reset All Data
                </Button>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
                  <Shield size={14} /> Revoke All Sessions
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Reminder Modal */}
        <Modal open={reminderModal} onClose={closeReminderModal} title={editingReminder ? 'Edit Reminder' : 'Add Payment Reminder'} size="lg">
          <form onSubmit={e => { e.preventDefault(); handleReminderSave() }} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title *" placeholder="e.g., Rent Payment" value={reminderForm.title} onChange={e => setReminderForm({...reminderForm, title: e.target.value})} required />
              <Input label="Due Date *" type="date" value={reminderForm.due_date} onChange={e => setReminderForm({...reminderForm, due_date: e.target.value})} required />
              <Input label="Amount" type="number" step="0.01" placeholder="0.00" value={reminderForm.amount} onChange={e => setReminderForm({...reminderForm, amount: e.target.value})} />
              <Select label="Category" placeholder="Select category" value={reminderForm.category} onChange={e => setReminderForm({...reminderForm, category: e.target.value})}
                options={['General', 'Rent', 'Utilities', 'Salaries', 'Taxes', 'Insurance', 'Loans', 'Subscriptions', 'Other'].map(c => ({value: c, label: c}))} />
              <Select label="Branch" placeholder="All branches" value={reminderForm.branch_id} onChange={e => setReminderForm({...reminderForm, branch_id: e.target.value})}
                options={[{value:'', label:'All branches'}]} />
              <Select label="Department" placeholder="All departments" value={reminderForm.department_id} onChange={e => setReminderForm({...reminderForm, department_id: e.target.value})}
                options={[{value:'', label:'All departments'}]} />
              <Input label="Remind Before (days)" type="number" min="1" max="30" placeholder="3" value={reminderForm.reminder_days_before} onChange={e => setReminderForm({...reminderForm, reminder_days_before: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="form-label mb-1">Description</label>
              <textarea value={reminderForm.description} onChange={e => setReminderForm({...reminderForm, description: e.target.value})} rows={3} className="form-input" placeholder="Additional details..." />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={closeReminderModal}>Cancel</Button>
              <Button type="submit">{editingReminder ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      </motion.div>
    </div>
  )
}