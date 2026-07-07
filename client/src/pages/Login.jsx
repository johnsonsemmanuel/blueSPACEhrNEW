import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Building2, Users, CalendarCheck, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const { login, setUser } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('Staff')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [forceChange, setForceChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.forcePasswordChange) {
        setForceChange(true)
        toast('Your password was reset by admin. Please set a new password.', { icon: '🔐' })
      } else {
        toast.success(`Welcome back, ${user.name}`)
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleForceChange = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 4) {
      toast.error('Password must be at least 4 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChanging(true)
    try {
      await api.put('/auth/password', { current_password: password, new_password: newPassword })
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      stored.forcePasswordChange = false
      localStorage.setItem('user', JSON.stringify(stored))
      setUser(prev => ({ ...prev, forcePasswordChange: false }))
      toast.success('Password updated successfully')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password')
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      <div className="hidden lg:flex w-1/2 bg-deep-600 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="relative z-10 text-center px-12 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img src="/logo-light.png" alt="BlueSPACE" className="h-14 w-auto mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-3">BlueSPACE Africa</h1>
            <p className="text-blue-200 text-sm leading-relaxed">
              Leave Management System – streamline employee leave requests, approvals, and tracking across the organization.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-10 grid grid-cols-3 gap-4"
          >
            {[
              { label: 'Apply', sub: 'Leave requests' },
              { label: 'Track', sub: 'Real-time status' },
              { label: 'Manage', sub: 'Team overview' },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 rounded-lg p-3">
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-blue-300 text-[10px]">{item.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <AnimatePresence mode="wait">
            {forceChange ? (
              <motion.div
                key="forceChange"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                    <Lock size={22} className="text-amber-600" />
                  </div>
                  <h2 className="text-lg font-bold text-deep-600">Set New Password</h2>
                  <p className="text-xs text-gray-500 mt-1">Your password was reset by admin. Please create a new one.</p>
                </div>

                <form onSubmit={handleForceChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        minLength={4}
                        className={`flex h-9 w-full rounded-md border bg-white px-3 py-2 pr-10 text-base text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 border-gray-200`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-0 top-0 h-full flex items-center px-3 text-gray-400 hover:text-deep-500"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                  />
                  <Button type="submit" className="w-full" disabled={changing}>
                    {changing ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Lock size={15} />
                        Update Password
                      </span>
                    )}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-8 text-center lg:text-left">
                  <img src="/logo-dark.png" alt="BlueSPACE" className="h-8 w-auto mx-auto lg:hidden mb-4" />
                  <h2 className="text-xl font-bold text-deep-600">Sign In</h2>
                  <p className="text-sm text-gray-500 mt-1">Access your leave management portal</p>
                </div>

                <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setRole('Staff')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                      role === 'Staff' ? 'bg-white text-deep-600 shadow-sm' : 'text-gray-500 hover:text-deep-600'
                    }`}
                  >
                    <Users size={15} />
                    Staff
                  </button>
                  <button
                    onClick={() => setRole('Management')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                      role === 'Management' ? 'bg-white text-deep-600 shadow-sm' : 'text-gray-500 hover:text-deep-600'
                    }`}
                  >
                    <Building2 size={15} />
                    Management
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@bluespaceafrica.com"
                    required
                  />
                  <div>
                    <label className="block text-xs font-semibold text-deep-500 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className={`flex h-9 w-full rounded-md border bg-white px-3 py-2 pr-10 text-base text-deep-600 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 border-gray-200`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 h-full flex items-center px-3 text-gray-400 hover:text-deep-500"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Sign in as {role}
                          <ArrowRight size={15} />
                        </span>
                      )}
                    </Button>
                  </div>
                </form>

                <p className="text-center text-xs text-gray-400 mt-6">
                  BlueSPACE Africa Leave Management &copy; {new Date().getFullYear()}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
