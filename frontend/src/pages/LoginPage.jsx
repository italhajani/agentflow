import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Zap, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate             = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(form.email, form.password)
    if (result.ok) {
      toast.success('Welcome back!')
      navigate('/dashboard')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-md">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">AgentFlow</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in to your AI workforce</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 hover:underline font-medium">
              Create one free
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-gray-400 mt-4">
          No credit card required · Free forever for basic use
        </p>
      </div>
    </div>
  )
}
