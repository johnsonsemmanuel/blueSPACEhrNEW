import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Mail, Phone, Calendar, MapPin, User, Briefcase, Building2, ChevronRight, Shield, Edit3, Save, X } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

function Avatar({ src, name, size = 'h-10 w-10', textSize = 'text-sm' }) {
  const [broken, setBroken] = useState(false)
  const isUrl = src && (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'))
  if (isUrl && !broken) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setBroken(true)}
        className={`${size} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div className={`${size} rounded-full bg-deep-100 flex items-center justify-center font-bold text-deep-600 ${textSize} shrink-0`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

export default function Employees() {
  const { user } = useAuth()
  const isMgmt = user?.type === 'Management'
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [designations, setDesignations] = useState([])
  const [resetModal, setResetModal] = useState(false)
  const [resetForm, setResetForm] = useState({ new_password: '', confirm: '' })
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    api.get('/employees').then(r => setEmployees(r.data)).catch(() => {})
    if (isMgmt) {
      api.get('/employees/departments').then(r => setDepartments(r.data)).catch(() => {})
      api.get('/employees/branches').then(r => setBranches(r.data)).catch(() => {})
      api.get('/employees/designations').then(r => setDesignations(r.data)).catch(() => {})
    }
  }, [isMgmt])

  const startEdit = () => {
    setForm({
      name: selected.name || '',
      email: selected.email || '',
      phone: selected.phone || '',
      address: selected.address || '',
      dob: selected.dob ? selected.dob.split('T')[0] : '',
      gender: selected.gender || '',
      department_id: selected.department_id || '',
      branch_id: selected.branch_id || '',
      designation_id: selected.designation_id || '',
      company_doj: selected.company_doj ? selected.company_doj.split('T')[0] : '',
      employee_id: selected.employee_id || '',
      is_active: selected.is_active,
    })
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setForm({})
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const res = await api.put(`/employees/${selected.id}`, form)
      setEmployees(prev => prev.map(e => e.id === selected.id ? res.data : e))
      setSelected(res.data)
      setEditing(false)
      toast.success('Employee updated successfully')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update employee')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!resetForm.new_password || resetForm.new_password.length < 4) {
      toast.error('Password must be at least 4 characters')
      return
    }
    if (resetForm.new_password !== resetForm.confirm) {
      toast.error('Passwords do not match')
      return
    }
    setResetting(true)
    try {
      await api.post('/auth/admin/reset-employee-password', {
        user_id: selected.user_id,
        new_password: resetForm.new_password,
      })
      toast.success('Password reset. Employee must change on next login.')
      setResetModal(false)
      setResetForm({ new_password: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
            <Users size={18} className="text-deep-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-deep-600">Employees</h1>
            <p className="text-xs text-gray-500">{employees.length} employees</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card
              key={emp.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { setSelected(emp); setEditing(false) }}
            >
              <div className="flex items-start gap-3">
                <Avatar src={emp.avatar} name={emp.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-deep-600 truncate">{emp.name}</p>
                  <p className="text-xs text-gray-400">{emp.designation_name || 'No designation'}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 min-w-0">
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                    {emp.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={11} className="shrink-0" />
                        <span>{emp.phone}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} className="shrink-0" />
                      {emp.employee_id}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {emp.department_name && (
                      <Badge variant="info">{emp.department_name}</Badge>
                    )}
                    {emp.branch_name && (
                      <Badge>{emp.branch_name}</Badge>
                    )}
                    <Badge variant={emp.is_active ? 'success' : 'danger'}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-300 mt-1 shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      <Modal open={!!selected && !resetModal} onClose={() => { setSelected(null); setEditing(false) }} title={selected?.name || ''} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar src={selected.avatar} name={selected.name} size="h-14 w-14 sm:h-16 sm:w-16" textSize="text-lg sm:text-xl" />
              <div className="min-w-0 flex-1">
                <p className="text-base sm:text-lg font-bold text-deep-600 truncate">{selected.name}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{selected.designation_name || 'No designation'}</p>
                <p className="text-xs text-gray-400">{selected.employee_id}</p>
              </div>
            </div>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input label="Employee ID" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} />
                <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <Input label="Date of Birth" type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} />
                <Select label="Gender" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                  options={[{value:'',label:'Select gender'},{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}]} />
                <Select label="Department" value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})}
                  options={[{value:'',label:'Select department'},...departments.map(d => ({value:d.id,label:d.name}))]} />
                <Select label="Branch" value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})}
                  options={[{value:'',label:'Select branch'},...branches.map(b => ({value:b.id,label:b.name}))]} />
                <Select label="Designation" value={form.designation_id} onChange={e => setForm({...form, designation_id: e.target.value})}
                  options={[{value:'',label:'Select designation'},...designations.map(d => ({value:d.id,label:d.name}))]} />
                <Input label="Date Joined" type="date" value={form.company_doj} onChange={e => setForm({...form, company_doj: e.target.value})} />
                <Select label="Status" value={form.is_active} onChange={e => setForm({...form, is_active: parseInt(e.target.value)})}
                  options={[{value:1,label:'Active'},{value:0,label:'Inactive'}]} />
                <div className="md:col-span-2">
                  <label className="form-label mb-1">Address</label>
                  <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                    rows={2} className="form-input" placeholder="Employee address..." />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={14} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-deep-600 truncate">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-deep-600">{selected.phone || '–'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="font-medium text-deep-600">{selected.dob ? new Date(selected.dob).toLocaleDateString('en-GB') : '–'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="font-medium text-deep-600">{selected.gender || '–'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-medium text-deep-600 truncate">{selected.department_name || '–'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Branch</p>
                    <p className="font-medium text-deep-600">{selected.branch_name || '–'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Date Joined</p>
                    <p className="font-medium text-deep-600">{selected.company_doj ? new Date(selected.company_doj).toLocaleDateString('en-GB') : '–'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={selected.is_active ? 'success' : 'danger'}>{selected.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            )}

            {!editing && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm font-medium text-deep-600 break-words">{selected.address || '–'}</p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 flex items-center justify-end gap-3">
              {editing ? (
                <>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2"><Save size={14} /> Save</span>
                    )}
                  </Button>
                  <Button variant="outline" onClick={cancelEdit}>
                    <X size={14} /> Cancel
                  </Button>
                </>
              ) : (
                <>
                  {isMgmt && (
                    <Button variant="outline" onClick={startEdit}>
                      <Edit3 size={14} /> Edit Details
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { setResetModal(true) }}>
                    <Shield size={14} /> Reset Password
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={resetModal} onClose={() => setResetModal(false)} title={`Reset Password: ${selected?.name || ''}`} size="sm">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-xs text-gray-500">
            The employee will be prompted to set a new password on their next login.
          </p>
          <Input
            label="New Password"
            type="password"
            value={resetForm.new_password}
            onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
            placeholder="Min 4 characters"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={resetForm.confirm}
            onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })}
            placeholder="Confirm new password"
            required
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={resetting}>
              {resetting ? 'Resetting...' : 'Reset Password'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setResetModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
