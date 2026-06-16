import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Mail, Phone, Calendar } from 'lucide-react'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

export default function Employees() {
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    api.get('/employees').then(r => setEmployees(r.data)).catch(() => {})
  }, [])

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-deep-100 flex items-center justify-center">
            <Users size={18} className="text-deep-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-deep-600">Employees</h1>
            <p className="text-xs text-gray-500">{employees.length} active employees</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-deep-100 flex items-center justify-center text-sm font-bold text-deep-600 shrink-0">
                  {emp.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-deep-600 truncate">{emp.name}</p>
                  <p className="text-xs text-gray-400">{emp.designation_name || 'No designation'}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Mail size={11} /> {emp.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    {emp.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={11} /> {emp.phone}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} /> {emp.employee_id}
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
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
