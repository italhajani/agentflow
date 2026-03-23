import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bot, Plus, Layers, LogOut,
  ChevronRight, Zap, Settings, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents',     icon: Bot,             label: 'My Agents' },
  { to: '/templates',  icon: Layers,          label: 'Templates' },
]

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}

function UsageBar({ user }) {
  const limit = user?.plan === 'free' ? 10 : 999
  const used  = user?.runs_today || 0
  const pct   = Math.min(100, Math.round((used / limit) * 100))
  const color  = pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-brand-500'

  return (
    <div className="px-3 py-3 rounded-lg bg-gray-50 border border-gray-100">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500 font-medium">Daily runs</span>
        <span className="text-xs font-semibold text-gray-700">{used} / {limit}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      {user?.plan === 'free' && (
        <p className="text-xs text-gray-400 mt-1.5">Free tier · resets daily</p>
      )}
    </div>
  )
}

export default function AppLayout() {
  const { user, logout }   = useAuthStore()
  const navigate            = useNavigate()
  const [mobileOpen, setMO] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const Sidebar = ({ onNav }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg tracking-tight">AgentFlow</span>
      </div>

      {/* Create button */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => { navigate('/agents/new'); onNav?.() }}
          className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
        >
          <Plus size={16} />
          New Agent
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} onClick={onNav} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
        <UsageBar user={user} />

        {/* User row */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center
                          text-brand-700 text-sm font-semibold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
            <p className="text-xs text-gray-400 truncate capitalize">{user?.plan} plan</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMO(false)} />
          <aside className="relative w-64 bg-white h-full shadow-xl z-10">
            <button
              onClick={() => setMO(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
            >
              <X size={18} className="text-gray-500" />
            </button>
            <Sidebar onNav={() => setMO(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setMO(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">AgentFlow</span>
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
