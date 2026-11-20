import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BookOpen, Lock, Mail } from 'lucide-react'
import { validateEmail, required } from '../utils/validation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const nextErrors = {
      email: validateEmail(email),
      password: required(password, 'Password'),
    }
    setTouched({ email: true, password: true })
    setFieldErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) return
    if (loading) return
    setLoading(true)
    try {
      const user = await login(email, password)
      if (user.role === 'ADMIN') navigate('/admin')
      else if (user.role === 'FACULTY') navigate('/faculty')
      else navigate('/student')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    const creds = {
      ADMIN: ['admin@sms.com', 'admin123'],
      FACULTY: ['faculty@sms.com', 'faculty123'],
      STUDENT: ['student@sms.com', 'student123'],
    }
    setEmail(creds[role][0])
    setPassword(creds[role][1])
    setFieldErrors({})
    setTouched({})
    setError('')
  }

  const validateField = (name, value) => {
    const message = name === 'email' ? validateEmail(value) : required(value, 'Password')
    setFieldErrors(prev => ({ ...prev, [name]: message }))
  }

  const inputClass = (name) => `w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
    touched[name] && fieldErrors[name] ? 'border-red-500' : 'border-gray-200'
  }`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <BookOpen className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management System</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Demo buttons */}
        <div className="flex gap-2 mb-6">
          {['ADMIN', 'FACULTY', 'STUDENT'].map(role => (
            <button key={role} onClick={() => fillDemo(role)}
              className="flex-1 text-xs py-2 px-1 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-600 transition-colors font-medium">
              {role}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 -mt-3 mb-5">Click a role to autofill demo credentials</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); if (touched.email) validateField('email', e.target.value) }}
              onBlur={() => { setTouched(prev => ({...prev, email: true})); validateField('email', email) }} required
              placeholder="Email address"
              className={inputClass('email')} />
            </div>
            {touched.email && fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>
          <div>
            <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); if (touched.password) validateField('password', e.target.value) }}
              onBlur={() => { setTouched(prev => ({...prev, password: true})); validateField('password', password) }} required
              placeholder="Password"
              className={inputClass('password')} />
            </div>
            {touched.password && fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
