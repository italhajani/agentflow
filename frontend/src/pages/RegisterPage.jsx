import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Zap, Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [params]        = useSearchParams()
  const [form, setForm] = useState({
    email: '', username: '', password: '', full_name: '',
  })
  const [showPw, setShowPw]        = useState(false)
  const { register, isLoading }    = useAuthStore()
  const navigate                   = useNavigate()

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await register(form)
    if (result.ok) {
      toast.success('Account created! Welcome to FlowHolt 🎉')
      // If they came from hero input with a task, send them to workflow generator
      const task = params.get('task')
      navigate(task ? `/workflows/generate?task=${encodeURIComponent(task)}` : '/dashboard')
    } else {
      toast.error(result.error)
    }
  }

  const perks = ['5 agents free', '10 runs/day', 'All templates', 'Free AI models']

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #a855f7, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid opacity-100"
        style={{ maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)', pointerEvents: 'none' }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #7e22ce)', boxShadow: '0 0 20px rgba(14,165,233,0.4)' }}
            >
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-white text-xl">FlowHolt</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-sm text-surface-400">Build your AI workforce in minutes</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name <span className="text-surface-500">(optional)</span></label>
              <input
                type="text" className="input" placeholder="Jane Smith"
                value={form.full_name} onChange={set('full_name')}
              />
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
              <input
                type="email" className="input" placeholder="jane@example.com"
                value={form.email} onChange={set('email')} required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min 8 chars, include a number"
                  value={form.password} onChange={set('password')}
                  minLength={8} required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              style={{ padding: '11px', borderRadius: '10px' }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <>Create free account <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>

        {/* Perks */}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {perks.map((p) => (
            <div key={p} className="flex items-center gap-1.5 text-xs text-surface-500">
              <Check size={12} className="text-brand-400" />{p}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-surface-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}