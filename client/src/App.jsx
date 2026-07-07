import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ApplyLeave from './pages/ApplyLeave'
import MyLeaves from './pages/MyLeaves'
import LeaveRequests from './pages/LeaveRequests'
import LeaveTypesPage from './pages/LeaveTypes'
import DepartmentsPage from './pages/Departments'
import Employees from './pages/Employees'
import LeaveCalendar from './pages/LeaveCalendar'
import Profile from './pages/Profile'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={user ? <AppLayout /> : <Navigate to="/login" />}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="apply" element={<ProtectedRoute><ApplyLeave /></ProtectedRoute>} />
        <Route path="my-leaves" element={<ProtectedRoute><MyLeaves /></ProtectedRoute>} />
        <Route path="leave-requests" element={<ProtectedRoute roles={['Management']}><LeaveRequests /></ProtectedRoute>} />
        <Route path="departments" element={<ProtectedRoute roles={['Management']}><DepartmentsPage /></ProtectedRoute>} />
        <Route path="leave-types" element={<ProtectedRoute roles={['Management']}><LeaveTypesPage /></ProtectedRoute>} />
        <Route path="employees" element={<ProtectedRoute roles={['Management']}><Employees /></ProtectedRoute>} />
        <Route path="calendar" element={<ProtectedRoute><LeaveCalendar /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
