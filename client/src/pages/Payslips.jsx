import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Plus, Filter, Download, ChevronDown, ChevronUp, Edit, Calendar, DollarSign, FileText, Eye, AlertTriangle, Bell, Send, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

const STATUSES = ['Draft', 'Generated', 'Paid', 'Cancelled']

export default function Payslips() {
  const { user } = useAuth()
  const isMgmt = user?.type === 'Management'
  const [payslips, setPayslips] = useState([])
  const [summary, setSummary] = useState(null)
  const [salaries, setSalaries] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('list')
  const [selectedPayslip, setSelectedPayslip] = useState(null)
  const [editingSalary, setEditingSalary] = useState(null)
  const [salaryForm, setSalaryForm] = useState({})
  const [generateForm, setGenerateForm] = useState({
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    employee_ids: [],
    overwrite: false
  })
  const [filters, setFilters] = useState({ employeeId: '', periodStart: '', periodEnd: '', status: '' })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 50, ...filters })
      const [payRes, sumRes, salRes, empRes] = await Promise.all([
        api.get(`/payslips?${params}`),
        api.get(`/payslips/summary?${params}`),
        api.get('/salaries'),
        api.get('/employees/list'),
      ])
      setPayslips(payRes.data.data)
      setTotalPages(Math.ceil(payRes.data.total / 50))
      setSummary(sumRes.data)
      setSalaries(salRes.data)
      setEmployees(empRes.data)
    } catch (err) {
      console.error('Fetch error:', err)
      toast.error('Failed to load payslips')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, filters])

  const resetSalaryForm = (empId = '') => ({
    employee_id: empId,
    basic_salary: '',
    housing_allowance: '',
    transport_allowance: '',
    other_allowances: '',
    overtime_rate: '',
    tax_exempt: false,
    effective_from: new Date().toISOString().split('T')[0],
  })

  const openSalaryModal = (salary = null) => {
    if (salary) {
      setSalaryForm({
        employee_id: salary.employee_id,
        basic_salary: salary.basic_salary,
        housing_allowance: salary.housing_allowance,
        transport_allowance: salary.transport_allowance,
        other_allowances: salary.other_allowances,
        overtime_rate: salary.overtime_rate || '',
        tax_exempt: salary.tax_exempt,
        effective_from: salary.effective_from?.split('T')[0] || new Date().toISOString().split('T')[0],
      })
      setEditingSalary(salary)
    } else {
      setSalaryForm(resetSalaryForm())
      setEditingSalary(null)
    }
    setModalOpen(true)
    setModalMode('salary')
  }

  const openGenerateModal = () => {
    setGenerateForm({
      period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      employee_ids: [],
      overwrite: false
    })
    setModalOpen(true)
    setModalMode('generate')
  }

  const openViewModal = (payslip) => {
    setSelectedPayslip(payslip)
    setModalOpen(true)
    setModalMode('view')
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalMode('list')
    setSelectedPayslip(null)
    setEditingSalary(null)
    setSalaryForm({})
  }

  const handleSalarySave = async () => {
    if (!salaryForm.employee_id || !salaryForm.basic_salary) {
      toast.error('Employee and basic salary are required')
      return
    }
    try {
      await api.post('/salaries', salaryForm)
      toast.success(editingSalary ? 'Salary updated' : 'Salary saved')
      closeModal()
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save salary')
    }
  }

  const handleGenerate = async () => {
    if (!generateForm.period_start || !generateForm.period_end) {
      toast.error('Period start and end are required')
      return
    }
    setGenerating(true)
    try {
      const res = await api.post('/payslips/generate', generateForm)
      toast.success(res.data.message)
      closeModal()
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate payslips')
    } finally {
      setGenerating(false)
    }
  }

  const handleStatusChange = async (id, status, notes = '') => {
    try {
      await api.put(`/payslips/${id}/status`, { status, notes })
      toast.success(`Payslip marked as ${status}`)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status')
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(filters)
      const res = await fetch(`/api/payslips/export?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslips-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (err) {
      toast.error('Export failed')
    }
  }

  const getSalaryForEmployee = (empId) => salaries.find(s => s.employee_id === empId)

  const employeeOptions = employees.map(e => ({ value: e.id, label: `${e.name} (${e.employee_id})` }))

  const summaryCards = useMemo(() => [
    { label: 'Total', value: summary?.total || 0, icon: FileText, color: 'bg-brand-600' },
    { label: 'Draft', value: summary?.draft || 0, icon: FileText, color: 'bg-gray-500' },
    { label: 'Generated', value: summary?.generated || 0, icon: CreditCard, color: 'bg-blue-600' },
    { label: 'Paid', value: summary?.paid || 0, icon: DollarSign, color: 'bg-emerald-600' },
    { label: 'Total Gross', value: `₵${Number(summary?.total_gross || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-purple-600' },
    { label: 'Total Net', value: `₵${Number(summary?.total_net || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-teal-600' },
  ], [summary])

  const statusBadge = (status) => {
    const variants = { Draft: 'secondary', Generated: 'info', Paid: 'success', Cancelled: 'danger' }
    return <Badge variant={variants[status] || 'secondary'} className="text-[10px]">{status}</Badge>
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
              <CreditCard size={18} className="text-deep-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-deep-600">Payslips</h1>
              <p className="text-xs text-gray-500">{(payslips || []).length} payslips • {summary?.total || 0} total</p>
            </div>
          </div>
          {isMgmt && (
            <div className="flex gap-2">
              <Button onClick={openSalaryModal} variant="outline">
                <Plus size={14} /> Salary Config
              </Button>
              <Button onClick={openGenerateModal}>
                <Loader2 size={14} /> Generate Payslips
              </Button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {summaryCards.map((card, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <card.icon size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{card.label}</p>
                  <p className="text-lg font-bold text-deep-600 truncate">{card.value}</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select label="Employee" placeholder="All employees" value={filters.employeeId} onChange={e => setFilters({...filters, employeeId: e.target.value})}
                options={employeeOptions} />
              <Input label="Period From" type="date" value={filters.periodStart} onChange={e => setFilters({...filters, periodStart: e.target.value})} />
              <Input label="Period To" type="date" value={filters.periodEnd} onChange={e => setFilters({...filters, periodEnd: e.target.value})} />
              <Select label="Status" placeholder="All statuses" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
                options={STATUSES.map(s => ({value: s, label: s}))} />
            </div>
          )}
        </Card>

        {/* Salary Config Overview */}
        {isMgmt && (salaries || []).length > 0 && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-deep-600">Salary Configurations</h3>
              <Button size="sm" onClick={() => openSalaryModal()}>
                <Plus size={13} /> Add Config
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider">
                    <th className="pb-3 pr-4">Employee</th>
                    <th className="pb-3 pr-4">Basic</th>
                    <th className="pb-3 pr-4">Housing</th>
                    <th className="pb-3 pr-4">Transport</th>
                    <th className="pb-3 pr-4">Other</th>
                    <th className="pb-3 pr-4">OT Rate</th>
                    <th className="pb-3 pr-4">Tax Exempt</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-deep-600">
                  {(salaries || []).map((sal) => (
                    <tr key={sal.employee_id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 pr-4 font-medium">{sal.employee_name}</td>
                      <td className="py-3 pr-4">₵{Number(sal.basic_salary).toLocaleString()}</td>
                      <td className="py-3 pr-4">₵{Number(sal.housing_allowance).toLocaleString()}</td>
                      <td className="py-3 pr-4">₵{Number(sal.transport_allowance).toLocaleString()}</td>
                      <td className="py-3 pr-4">₵{Number(sal.other_allowances).toLocaleString()}</td>
                      <td className="py-3 pr-4">{sal.overtime_rate ? `₵${sal.overtime_rate}/hr` : '-'}</td>
                      <td className="py-3 pr-4">{sal.tax_exempt ? <Badge variant="success" className="text-[10px]">Yes</Badge> : <Badge variant="secondary" className="text-[10px]">No</Badge>}</td>
                      <td className="py-3">
                        <button onClick={() => openSalaryModal(sal)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded" title="Edit">
                          <Edit size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Payslips Table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-deep-600">All Payslips</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download size={14} /> Export CSV
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (payslips || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No payslips found</p>
              {isMgmt && <Button size="sm" onClick={openGenerateModal} className="mt-3">Generate First Payslips</Button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider">
                    <th className="pb-3 pr-4">Employee</th>
                    <th className="pb-3 pr-4">Period</th>
                    <th className="pb-3 pr-4">Basic</th>
                    <th className="pb-3 pr-4">Allowances</th>
                    <th className="pb-3 pr-4">Gross</th>
                    <th className="pb-3 pr-4">Deductions</th>
                    <th className="pb-3 pr-4">Net Pay</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-deep-600">
                  {payslips && payslips.map((p) => (
                    <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 pr-4 font-medium">{p.employee_name} <span className="text-gray-400 text-xs">({p.employee_code})</span></td>
                      <td className="py-3 pr-4 text-gray-500 text-xs">
                        {new Date(p.period_start).toLocaleDateString('en-GB', {month: 'short', year: 'numeric'})}
                      </td>
                      <td className="py-3 pr-4">₵{Number(p.basic_salary).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-3 pr-4">₵{Number(p.allowances).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-3 pr-4 font-semibold">₵{Number(p.gross_pay).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-3 pr-4 text-red-600">-₵{Number(p.total_deductions).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-3 pr-4 font-bold text-emerald-600">₵{Number(p.net_pay).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td className="py-3 pr-4">{statusBadge(p.status)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openViewModal(p)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded" title="View">
                            <Eye size={13} />
                          </button>
                          {isMgmt && p.status === 'Draft' && (
                            <button onClick={() => handleStatusChange(p.id, 'Generated')} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Generate">
                              <FileText size={13} />
                            </button>
                          )}
                          {isMgmt && p.status === 'Generated' && (
                            <button onClick={() => handleStatusChange(p.id, 'Paid')} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Mark Paid">
                              <DollarSign size={13} />
                            </button>
                          )}
                          {isMgmt && ['Draft', 'Generated'].includes(p.status) && (
                            <button onClick={() => handleStatusChange(p.id, 'Cancelled')} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Cancel">
                              <AlertTriangle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

        {/* Modals */}
        <Modal open={modalOpen} onClose={closeModal} title={
          modalMode === 'salary' ? (editingSalary ? 'Edit Salary Config' : 'Add Salary Config')
            : modalMode === 'generate' ? 'Generate Payslips'
            : 'View Payslip'
        } size={modalMode === 'generate' ? 'lg' : 'xl'}>
          {modalMode === 'salary' && (
            <form onSubmit={e => { e.preventDefault(); handleSalarySave() }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Employee *" placeholder="Select employee" value={salaryForm.employee_id} onChange={e => setSalaryForm({...salaryForm, employee_id: e.target.value})} required
                  options={employeeOptions} />
                <Input label="Effective From" type="date" value={salaryForm.effective_from} onChange={e => setSalaryForm({...salaryForm, effective_from: e.target.value})} />
                <Input label="Basic Salary *" type="number" step="0.01" placeholder="0.00" value={salaryForm.basic_salary} onChange={e => setSalaryForm({...salaryForm, basic_salary: e.target.value})} required />
                <Input label="Housing Allowance" type="number" step="0.01" placeholder="0.00" value={salaryForm.housing_allowance} onChange={e => setSalaryForm({...salaryForm, housing_allowance: e.target.value})} />
                <Input label="Transport Allowance" type="number" step="0.01" placeholder="0.00" value={salaryForm.transport_allowance} onChange={e => setSalaryForm({...salaryForm, transport_allowance: e.target.value})} />
                <Input label="Other Allowances" type="number" step="0.01" placeholder="0.00" value={salaryForm.other_allowances} onChange={e => setSalaryForm({...salaryForm, other_allowances: e.target.value})} />
                <Input label="Overtime Rate (/hr)" type="number" step="0.01" placeholder="0.00" value={salaryForm.overtime_rate} onChange={e => setSalaryForm({...salaryForm, overtime_rate: e.target.value})} />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tax_exempt" checked={salaryForm.tax_exempt} onChange={e => setSalaryForm({...salaryForm, tax_exempt: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                  <label htmlFor="tax_exempt" className="text-sm text-deep-600">Tax Exempt</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit">{editingSalary ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          )}

          {modalMode === 'generate' && (
            <form onSubmit={e => { e.preventDefault(); handleGenerate() }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Period Start *" type="date" value={generateForm.period_start} onChange={e => setGenerateForm({...generateForm, period_start: e.target.value})} required />
                <Input label="Period End *" type="date" value={generateForm.period_end} onChange={e => setGenerateForm({...generateForm, period_end: e.target.value})} required />
              </div>
              <div>
                <label className="form-label mb-1.5">Employees (leave empty for all)</label>
                <Select placeholder="Select employees..." value={generateForm.employee_ids} onChange={e => setGenerateForm({...generateForm, employee_ids: Array.from(e.target.selectedOptions).map(o => o.value)})}
                  options={employeeOptions} multiple />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="overwrite" checked={generateForm.overwrite} onChange={e => setGenerateForm({...generateForm, overwrite: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                <label htmlFor="overwrite" className="text-sm text-deep-600">Overwrite existing payslips for this period</label>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  This will calculate payslips using configured salaries and tax/SSNIT rates from settings.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Generating...
                    </>
                  ) : (
                    'Generate Payslips'
                  )}
                </Button>
              </div>
            </form>
          )}

          {modalMode === 'view' && selectedPayslip && (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs text-gray-500">Employee</p>
                  <p className="font-semibold text-deep-600">{selectedPayslip.employee_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Employee ID</p>
                  <p className="font-semibold text-deep-600">{selectedPayslip.employee_code}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="font-semibold text-deep-600">{selectedPayslip.department_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Period</p>
                  <p className="font-semibold text-deep-600">
                    {new Date(selectedPayslip.period_start).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'})}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-semibold">{statusBadge(selectedPayslip.status)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Generated By</p>
                  <p className="font-semibold text-deep-600">{selectedPayslip.generated_by_name || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-emerald-50 border-emerald-100">
                  <h4 className="text-xs font-semibold text-emerald-700 mb-3">Earnings</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Basic Salary</span><span className="font-medium">₵{Number(selectedPayslip.basic_salary).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>Allowances</span><span className="font-medium">₵{Number(selectedPayslip.allowances).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>Overtime</span><span className="font-medium">₵{Number(selectedPayslip.overtime_pay).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>Bonus</span><span className="font-medium">₵{Number(selectedPayslip.bonus).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold text-lg">
                      <span>Gross Pay</span><span>₵{Number(selectedPayslip.gross_pay).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </Card>
                <Card className="bg-red-50 border-red-100">
                  <h4 className="text-xs font-semibold text-red-700 mb-3">Deductions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Tax</span><span className="font-medium">₵{Number(selectedPayslip.tax_deduction).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>SSNIT</span><span className="font-medium">₵{Number(selectedPayslip.ssnit_deduction).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>Other Deductions</span><span className="font-medium">₵{Number(selectedPayslip.other_deductions).toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="border-t border-red-200 pt-2 flex justify-between font-bold text-lg">
                      <span>Total Deductions</span><span>₵{Number(selectedPayslip.total_deductions).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                <p className="text-xs text-blue-600">Net Pay</p>
                <p className="text-3xl font-bold text-blue-700">₵{Number(selectedPayslip.net_pay).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>

              {selectedPayslip.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm text-deep-600">{selectedPayslip.notes}</p>
                </div>
              )}

              {isMgmt && selectedPayslip.status !== 'Paid' && selectedPayslip.status !== 'Cancelled' && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {selectedPayslip.status === 'Draft' && (
                    <Button onClick={() => { handleStatusChange(selectedPayslip.id, 'Generated'); closeModal() }} className="flex-1">
                      <FileText size={14} /> Generate
                    </Button>
                  )}
                  {selectedPayslip.status === 'Generated' && (
                    <Button onClick={() => { handleStatusChange(selectedPayslip.id, 'Paid'); closeModal() }} className="flex-1">
                      <DollarSign size={14} /> Mark Paid
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { handleStatusChange(selectedPayslip.id, 'Cancelled'); closeModal() }} className="flex-1">
                    <AlertTriangle size={14} /> Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </motion.div>
    </div>
  )
}