import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { authService } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [visible, setVisible] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const strong = form.newPassword.length >= 8
    && /[A-Z]/.test(form.newPassword) && /[a-z]/.test(form.newPassword)
    && /\d/.test(form.newPassword) && /[^A-Za-z0-9]/.test(form.newPassword)
  const mismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (mismatch) return setError('New password and confirmation do not match')
    if (!strong) return setError('New password does not meet all strength requirements')
    setLoading(true)
    try {
      await authService.changePassword(form)
      setSuccess(true)
      setTimeout(async () => {
        await logout()
        navigate('/login')
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change password')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (field) => setVisible(prev => ({ ...prev, [field]: !prev[field] }))
  const field = (name, label) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input type={visible[name] ? 'text' : 'password'} value={form[name]}
          onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))}
          className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          required />
        <button type="button" onClick={() => toggle(name)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {visible[name] ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto text-green-600 mb-4" size={56} />
            <h1 className="text-2xl font-bold text-gray-900">Password changed successfully</h1>
            <p className="text-gray-500 mt-2">Redirecting to login...</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Change your password</h1>
            <p className="text-sm text-gray-500 mb-6">You must change the temporary password before continuing.</p>
            <form onSubmit={submit} className="space-y-4">
              {field('currentPassword', 'Current temporary password')}
              {field('newPassword', 'New password')}
              {field('confirmPassword', 'Confirm new password')}
              {mismatch && <p className="text-sm text-red-600">Passwords do not match</p>}
              <div className="bg-blue-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-gray-700 mb-1">Password requirements</p>
                <ul className="text-gray-600 space-y-1">
                  <li>{strong ? '✓' : '•'} 8+ characters with uppercase, lowercase, digit and special character</li>
                </ul>
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl">
                {loading ? 'Changing password...' : 'Change password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
