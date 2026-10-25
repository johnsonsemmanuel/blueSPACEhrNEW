import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Receipt, Plus, Filter, Download, ChevronDown, ChevronUp, Trash2, Edit, Calendar, CreditCard, DollarSign, BarChart2, X, Search, MoreVertical, AlertTriangle, Bell, Clock, Repeat } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

const CATEGORIES = ['Office Supplies', 'Utilities', 'Travel', 'Meals', 'Equipment', 'Marketing', 'Maintenance', 'Other']
const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Mobile Money']

export default function Expenses() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [reminders, setReminders] = useState([])
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderForm, setReminderForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [filters, setFilters] = useState({ startDate: '', endDate: '', category: '', branchId: '', departmentId: '', status: '', dueFilter: '' })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([]) 

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: 1, limit: 50, ...filters })
      const [expRes, sumRes, catRes, brRes, deptRes, remRes] = await Promise.all([
        api.get(`/expenses?${params}`),
        api.get(`/expenses/summary?${params}`),
        api.get('/expenses/categories'),
        api.get('/employees/branches'),
        api.get('/employees/departments'),
        api.get('/management/reminders'),
      ])
      setExpenses(expRes.data.data)
      setTotalPages(Math.ceil((expRes.data.total || 0) / 50))
      setSummary(sumRes.data)
      setCategories(catRes.data)
      setBranches(brRes.data)
      setDepartments(deptRes.data)
      setReminders(remRes.data)
    } catch (err) {
      console.error('Fetch error:', err)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, filters])

  const resetForm = () => ({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    payment_method: 'Cash',
    receipt_url: '',
    branch_id: '',
    department_id: '',
  })

  const openAdd = () => { setForm(resetForm()); setEditing(null); setModalOpen(true) }
  const openEdit = (exp) => { setForm({ ...exp, amount: String(exp.amount) }); setEditing(exp); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm({}) }

  const handleSave = async () => {
    if (!form.date || !form.category || !form.description || !form.amount) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      let res
      if (editing) {
        res = await api.put(`/expenses/${editing.id}`, form)
        toast.success('Expense updated')
      } else {
        res = await api.post('/expenses', form)
        toast.success('Expense added')
      }
      // Auto-create reminder for payments due
      if (form.category === 'Utilities' || form.category === 'Rent' || form.category === 'Maintenance' || form.category === 'Insurance' || form.category === 'Loans' || form.category === 'Subscriptions') {
        try {
          await api.post('/management/reminders', {
            title: `${form.category}: ${form.description}`,
            description: `Payment for ${form.description}`,
            amount: form.amount,
            due_date: form.date,
            category: form.category,
            reminder_days_before: 3,
          })
          toast.success('Payment reminder created')
        } catch (remErr) {
          console.error('Failed to create reminder:', remErr)
        }
      }
      closeModal()
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return
    try {
      await api.delete(`/expenses/${id}`)
      toast.success('Expense deleted')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(filters)
      const res = await fetch(`/api/expenses/export?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (err) {
      toast.error('Export failed')
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const thisWeekStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const summaryCards = useMemo(() => [
    { label: 'Today', value: summary?.byCategory?.find(c => c.category === 'Today')?.total || 0, icon: Calendar, color: 'bg-brand-600' },
    { label: 'This Week', value: summary?.byMonth?.[0]?.total || 0, icon: Calendar, color: 'bg-blue-600' },
    { label: 'This Month', value: summary?.byMonth?.find(m => m.month === today.slice(0,7))?.total || 0, icon: Calendar, color: 'bg-emerald-600' },
    { label: 'Total', value: summary?.total || 0, icon: DollarSign, color: 'bg-purple-600' },
  ], [summary, today])

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-sm">
              <Receipt size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Expense Management</h1>
              <p className="text-xs text-gray-500">Track, manage & remind payments • {(expenses || []).length} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download size={14} /> Export
            </Button>
            <Button onClick={openAdd}>
              <Plus size={15} /> Add Expense
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Today', value: (expenses || []).filter(e => e.date === today).reduce((s,e)=>s+Number(e.amount),0), icon: Calendar, color: 'from-brand-500 to-brand-600' },
            { label: 'This Week', value: (expenses || []).filter(e => e.date >= thisWeekStart).reduce((s,e)=>s+Number(e.amount),0), icon: Calendar, color: 'from-blue-500 to-blue-600' },
            { label: 'This Month', value: (expenses || []).filter(e => e.date?.startsWith(today.slice(0,7))).reduce((s,e)=>s+Number(e.amount),0), icon: Calendar, color: 'from-emerald-500 to-emerald-600' },
            { label: 'Total', value: summary?.total || 0, icon: DollarSign, color: 'from-purple-500 to-purple-600' },
          ].map((card, i) => (
            <Card key={i} className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                  <card.icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="text-lg font-bold text-deep-600">₵{Number(card.value).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-deep-600 flex items-center gap-2">
              <Filter size={14} /> Filters
            </h3>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <Input label="From Date" type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
              <Input label="To Date" type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
              <Select label="Category" placeholder="All categories" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}
                options={categories.map(c => ({value: c, label: c}))} />
              <Select label="Status" placeholder="All statuses" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
                options={[{value:'Pending',label:'Pending'},{value:'Paid',label:'Paid'},{value:'Overdue',label:'Overdue'}]} />
              <Select label="Due Filter" placeholder="Any" value={filters.dueFilter} onChange={e => setFilters({...filters, dueFilter: e.target.value})}
                options={[{value:'due_7',label:'Due in 7 days'},{value:'overdue',label:'Overdue'},{value:'recurring',label:'Recurring'}]} />
              <Select label="Branch" placeholder="All branches" value={filters.branchId} onChange={e => setFilters({...filters, branchId: e.target.value})}
                options={branches.map(b => ({value: b.id, label: b.name}))} />
            </div>
          )}
        </Card>

        {/* Overdue/Due Soon Alert */}
        {(expenses || []).filter(e => e.status === 'Overdue' || (e.status === 'Pending' && e.due_date && new Date(e.due_date) <= new Date(Date.now() + 7 * 86400000))).length > 0 && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-600" />
                <h3 className="text-sm font-semibold text-red-800">Expenses Due/Overdue</h3>
              </div>
            </div>
            <div className="space-y-2">
              {(expenses || []).filter(e => e.status === 'Overdue' || (e.status === 'Pending' && e.due_date && new Date(e.due_date) <= new Date(Date.now() + 7 * 86400000))).slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className={e.status === 'Overdue' ? 'text-red-600' : 'text-amber-600'} />
                    <div>
                      <p className="text-sm font-medium text-deep-600">{e.description}</p>
                      <p className="text-xs text-gray-500">{e.category} • Due: {e.due_date ? new Date(e.due_date).toLocaleDateString('en-GB') : new Date(e.date).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={e.status === 'Overdue' ? 'danger' : 'warning'} className="text-[10px]">{e.status}</Badge>
                    {e.amount && <span className="text-sm font-bold">₵{Number(e.amount).toLocaleString()}</span>}
                    {e.is_recurring && <Badge variant="info" className="text-[10px]"><Repeat size={10} /> {e.recurrence_type}</Badge>}
                    {isMgmt && e.status !== 'Paid' && (
                      <Button size="sm" onClick={async () => {
                        try {
                          await api.put(`/expenses/${e.id}/mark-paid`)
                          toast.success('Marked as paid')
                          fetchData()
                        } catch (err) {
                          toast.error('Failed')
                        }
                      }}>
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
        {summary?.byCategory && summary.byCategory.length > 0 && (
          <Card className="mb-6">
            <h3 className="text-sm font-semibold text-deep-600 mb-3 flex items-center gap-2">
              <BarChart2 size={14} /> By Category
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {summary.byCategory.slice(0, 8).map((cat) => (
                <div key={cat.category} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-deep-600 truncate">{cat.category}</p>
                  <p className="text-lg font-bold text-brand-600">₵{Number(cat.total).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Expenses Table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-deep-600">All Expenses</h3>
            <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => {
          const today = new Date().toISOString().split('T')[0]
          setForm({ date: today, category: 'Utilities', description: 'Quick entry', amount: '', payment_method: 'Cash', receipt_url: '', branch_id: '', department_id: '' })
          setEditing(null)
          setModalOpen(true)
        }}>
          <Plus size={14} /> Quick Add
        </Button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (expenses || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Receipt size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No expenses recorded</p>
              {isMgmt && <Button size="sm" onClick={openAdd} className="mt-3">Add First Expense</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
              <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider">
                <th className="pb-3 pr-4">Date/Due</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Description</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Payment</th>
                <th className="pb-3 pr-4">Branch / Dept</th>
                <th className="pb-3">Actions</th>
              </tr>
                </thead>
                <tbody className="text-deep-600">
                  {expenses && expenses.map((exp) => (
                  <tr key={exp.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-4 text-gray-500">
                      <div>{new Date(exp.date).toLocaleDateString('en-GB')}</div>
                      {exp.due_date && <div className="text-[10px] text-amber-600">Due: {new Date(exp.due_date).toLocaleDateString('en-GB')}</div>}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <Badge variant="info" className="text-[10px]">{exp.category}</Badge>
                        {exp.is_recurring && <Repeat size={10} className="text-brand-600" />}
                      </div>
                    </td>
                    <td className="py-3 pr-4 max-w-xs truncate" title={exp.description}>
                      <div>{exp.description}</div>
                      {exp.vendor_name && <div className="text-[10px] text-gray-400">{exp.vendor_name}</div>}
                    </td>
                    <td className="py-3 pr-4 font-semibold">₵{Number(exp.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={exp.status === 'Paid' ? 'success' : exp.status === 'Overdue' ? 'danger' : 'warning'} className="text-[10px]">
                        {exp.status || 'Pending'}
                      </Badge>
                    </td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">
                        {exp.branch_name && <span>{exp.branch_name}</span>}
                        {exp.branch_name && exp.department_name && <span className="mx-1">/</span>}
                        {exp.department_name && <span>{exp.department_name}</span>}
                        {!exp.branch_name && !exp.department_name && <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-3">
                      <div className="flex items-center gap-1">
                        {isMgmt && exp.status !== 'Paid' && (
                          <button onClick={async () => {
                            try {
                              await api.put(`/expenses/${exp.id}/mark-paid`)
                              toast.success('Marked as paid')
                              fetchData()
                            } catch (err) {
                              toast.error('Failed')
                            }
                          }} className="px-2 py-1 text-[10px] bg-green-100 text-green-700 rounded hover:bg-green-200" title="Mark Paid">
                            Paid
                          </button>
                        )}
                        <button onClick={() => openEdit(exp)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded" title="Edit">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDelete(exp.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronDown size={14} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronUp size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Add/Edit Modal */}
        <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Expense' : 'Add Expense'} size="xl">
          <form onSubmit={e => { e.preventDefault(); handleSave() }} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Date *" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              <Select label="Category *" placeholder="Select category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required
                options={CATEGORIES.map(c => ({value: c, label: c}))} />
              <div className="md:col-span-2">
                <label className="form-label mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Expense description"
                  rows={3}
                  className="form-input"
                  required
                />
              </div>
              <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
              <Input label="Vendor Name" value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} placeholder="e.g., ECG, Vodafone" />
              <Input label="Invoice Number" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} />
              <Select label="Status" value={form.status || 'Pending'} onChange={e => setForm({...form, status: e.target.value})}
                options={[{value:'Pending',label:'Pending'},{value:'Paid',label:'Paid'},{value:'Overdue',label:'Overdue'}]} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="recurring" checked={form.is_recurring || false} onChange={e => setForm({...form, is_recurring: e.target.checked})} className="rounded" />
                <label htmlFor="recurring" className="text-sm text-gray-700">Recurring Expense</label>
              </div>
              {form.is_recurring && (
                <>
                  <Select label="Recurrence" value={form.recurrence_type} onChange={e => setForm({...form, recurrence_type: e.target.value})}
                    options={[{value:'daily',label:'Daily'},{value:'weekly',label:'Weekly'},{value:'monthly',label:'Monthly'},{value:'yearly',label:'Yearly'}]} />
                  <Input label="Interval" type="number" min="1" value={form.recurrence_interval || 1} onChange={e => setForm({...form, recurrence_interval: parseInt(e.target.value)})} />
                  <Input label="End Date" type="date" value={form.recurrence_end_date} onChange={e => setForm({...form, recurrence_end_date: e.target.value})} />
                </>
              )}
            </div>
            <div>
              <label className="form-label mb-1">Notes</label>
              <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="form-input" placeholder="Additional notes..." />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={closeModal}><X size={14} /> Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </Modal>
      </motion.div>
    </div>
  )
}