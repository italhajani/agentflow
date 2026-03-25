import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bot, Workflow, Layers,
  LogOut, Plus, Zap, Menu, X, ChevronRight,
  Activity, Settings
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents',    icon: Bot,             label: 'Agents' },
  { to: '/workflows', icon: Workflow,        label: 'Workflows' },
  { to: '/templates', icon: Layers,          label: 'Templates' },
]

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-brand-500/12 text-brand-400 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.15)] nav-active'
            : 'text-surface-300 hover:bg-surface-700/60 hover:text-surface-50'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            className={clsx('flex-shrink-0 transition-colors', isActive ? 'text-brand-400' : 'text-surface-400 group-hover:text-surface-200')}
          />
          {label}
        </>
      )}
    </NavLink>
  )
}

function UsageBar({ user }) {
  const limit = user?.plan === 'free' ? 10 : 999
  const used  = user?.runs_today || 0
  const pct   = Math.min(100, Math.round((used / limit) * 100))
  const color  = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-brand-500'

  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-brand-400" />
          <span className="text-xs font-medium text-surface-300">Daily usage</span>
        </div>
        <span className="text-xs font-semibold text-surface-200">{used}<span className="text-surface-500">/{limit}</span></span>
      </div>
      <div className="h-1 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {user?.plan === 'free' && (
        <p className="text-xs text-surface-500 mt-1.5">Free plan · resets daily</p>
      )}
    </div>
  )
}

function SidebarContent({ onNav }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-card)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #7e22ce)', boxShadow: '0 0 16px rgba(14,165,233,0.4)' }}
        >
          <Zap size={15} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-base tracking-tight">FlowHolt</span>
          <div className="text-xs text-surface-400 -mt-0.5">AI Workflow Platform</div>
        </div>
      </div>

      {/* Create button */}
      <div className="px-3 pt-4 pb-3">
        <button
          onClick={() => { navigate('/workflows/generate'); onNav?.() }}
          className="btn-primary w-full btn-sm"
          style={{ borderRadius: '10px', padding: '9px 14px', fontSize: '13px' }}
        >
          <Plus size={15} />
          New Workflow
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
        <div className="section-label px-3 mb-2 mt-1">Menu</div>
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onClick={onNav} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <UsageBar user={user} />

        {/* User */}
        <div className="flex items-center gap-2.5 px-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #a855f7)', color: '#fff' }}
          >
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-100 truncate">{user?.username}</p>
            <p className="text-xs text-surface-400 capitalize">{user?.plan} plan</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost btn-icon-sm flex-shrink-0"
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMO] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] flex-shrink-0 border-r" style={{ borderColor: 'var(--border)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMO(false)} />
          <aside className="relative w-[240px] h-full shadow-2xl z-10" style={{ border: 'none' }}>
            <button
              onClick={() => setMO(false)}
              className="btn-ghost btn-icon-sm absolute top-4 right-3 z-10"
            >
              <X size={18} />
            </button>
            <SidebarContent onNav={() => setMO(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile topbar */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
        >
          <button onClick={() => setMO(true)} className="btn-ghost btn-icon-sm">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #7e22ce)' }}
            >
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-bold text-white">FlowHolt</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
