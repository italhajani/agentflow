import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Zap, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm]     = useState({ email: '', username: '', password: '', full_name: '' })
  const [showPw, setShowPw] = useState(false)
  const { register, isLoading } = useAuthStore()
  const navigate                 = useNavigate()

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await register(form)
    if (result.ok) {
      toast.success('Account created! Welcome to AgentFlow 🎉')
      navigate('/templates')   // send new users to templates first
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-md">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">AgentFlow</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">Build your AI workforce in minutes — free</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name <span className="text-gray-400">(optional)</span></label>
              <input type="text" className="input" placeholder="Jane Smith" value={form.full_name} onChange={set('full_name')} />
            </div>

            <div>
              <label className="label">Username</label>
              <input
                type="text" className="input" placeholder="janedoe"
                value={form.username} onChange={set('username')}
                pattern="[a-zA-Z0-9_\-]+" title="Letters, numbers, _ and - only"
                minLength={3} maxLength={30} required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="jane@example.com" value={form.email} onChange={set('email')} required />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10" placeholder="Min 8 chars, include a number"
                  value={form.password} onChange={set('password')}
                  minLength={8} required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>

        <div className="mt-4 flex justify-center gap-6 text-xs text-gray-400">
          <span>✓ 5 agents free</span>
          <span>✓ 10 runs/day</span>
          <span>✓ All templates</span>
        </div>
      </div>
    </div>
  )
}
