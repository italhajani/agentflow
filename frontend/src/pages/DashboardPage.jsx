import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Bot, Play, CheckCircle2, XCircle, Plus, ArrowRight,
  Zap, TrendingUp, Clock, Workflow, Sparkles, Activity
} from 'lucide-react'
import { dashboardApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

function StatCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'rgba(14,165,233,0.1)',  border: 'rgba(14,165,233,0.2)',  icon: '#0ea5e9' },
    green:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  icon: '#10b981' },
    red:    { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   icon: '#ef4444' },
    yellow: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: '#f59e0b' },
    purple: { bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.2)',  icon: '#a855f7' },
  }
  const c = colors[color]

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}
        >
          <Icon size={17} style={{ color: c.icon }} />
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-400 flex items-center gap-1">
            <TrendingUp size={11} />{trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-sm text-surface-400">{label}</div>
      {sub && <div className="text-xs text-surface-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    completed: 'badge-green',
    failed:    'badge-red',
    running:   'badge-blue',
    queued:    'badge-yellow',
    cancelled: 'badge-gray',
  }
  return <span className={map[status] || 'badge-gray'}>{status}</span>
}

function EmptyState({ navigate }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 relative"
        style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}
      >
        <Zap size={36} style={{ color: '#0ea5e9' }} />
        <div
          className="absolute inset-0 rounded-3xl animate-pulse-slow"
          style={{ boxShadow: '0 0 40px rgba(14,165,233,0.3)' }}
        />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">Build your AI workforce</h2>
      <p className="text-surface-300 text-sm mb-8 max-w-sm leading-relaxed">
        Start from a template or describe your task to the AI. Your first workflow takes under a minute.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => navigate('/workflows/generate')}
          className="btn-primary"
        >
          <Sparkles size={16} /> Generate with AI
        </button>
        <button onClick={() => navigate('/templates')} className="btn-secondary">
          <Bot size={16} /> Browse templates
        </button>
      </div>
    </div>
  )
}

function RunRow({ run, navigate }) {
  const statusIcon = {
    completed: <CheckCircle2 size={14} style={{ color: '#10b981' }} />,
    failed:    <XCircle size={14} style={{ color: '#ef4444' }} />,
    running:   <Activity size={14} style={{ color: '#0ea5e9' }} className="animate-pulse" />,
    queued:    <Clock size={14} style={{ color: '#f59e0b' }} />,
  }

  return (
    <div
      className="flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
      style={{ borderTop: '1px solid var(--border)' }}
      onClick={() => navigate(`/agents/${run.agent_id}/history`)}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: run.status === 'completed' ? 'rgba(16,185,129,0.12)'
            : run.status === 'failed' ? 'rgba(239,68,68,0.12)'
            : 'rgba(14,165,233,0.12)'
        }}
      >
        {statusIcon[run.status] || statusIcon.queued}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-100 truncate">{run.task_input}</p>
        <p className="text-xs text-surface-500 mt-0.5">
          {run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : ''}
          {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
        </p>
      </div>
      <StatusBadge status={run.status} />
    </div>
  )
}

export default function DashboardPage() {
  const { user }  = useAuthStore()
  const navigate  = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => dashboardApi.get().then((r) => r.data),
  })

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const name = user?.full_name?.split(' ')[0] || user?.username

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-56 skeleton" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
        <div className="h-72 skeleton rounded-2xl" />
      </div>
    )
  }

  const hasData = data?.total_agents > 0

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {greeting}, {name} 👋
          </h1>
          <p className="text-surface-400 text-sm">Here's your AI workforce overview</p>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => navigate('/workflows/generate')}
            className="btn-primary btn-sm"
          >
            <Sparkles size={15} /> Generate workflow
          </button>
          <button onClick={() => navigate('/agents/new')} className="btn-secondary btn-sm">
            <Plus size={15} /> New agent
          </button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState navigate={navigate} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Bot}          label="Total agents"     value={data.total_agents}    sub={`${data.active_agents} active`}                     color="blue"   />
            <StatCard icon={TrendingUp}   label="Total runs"       value={data.total_runs}      sub="all time"                                           color="purple" />
            <StatCard icon={CheckCircle2} label="Successful"       value={data.successful_runs} sub="completed runs"                                     color="green"  />
            <StatCard
              icon={Play}
              label="Today's runs"
              value={data.runs_today}
              sub={`${Math.max(0, data.runs_limit - data.runs_today)} remaining`}
              color={data.runs_today >= data.runs_limit * 0.9 ? 'yellow' : 'blue'}
            />
          </div>

          {/* Daily usage bar */}
          {user?.plan === 'free' && (
            <div className="card p-4 mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Activity size={14} style={{ color: '#0ea5e9' }} />
                  <span className="text-sm font-medium text-surface-200">Daily run usage</span>
                </div>
                <span className="text-sm text-surface-400">
                  {data.runs_today} <span className="text-surface-600">/ {data.runs_limit}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (data.runs_today / data.runs_limit) * 100)}%`,
                    background: data.runs_today / data.runs_limit >= 0.9
                      ? '#ef4444'
                      : data.runs_today / data.runs_limit >= 0.6
                      ? '#f59e0b'
                      : 'linear-gradient(90deg, #0ea5e9, #7c3aed)',
                  }}
                />
              </div>
              <p className="text-xs text-surface-500 mt-1.5">Resets daily at midnight</p>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {[
              { icon: Sparkles, label: 'AI workflow generator', sub: 'Describe → build', onClick: () => navigate('/workflows/generate'), color: '#0ea5e9' },
              { icon: Bot,      label: 'Browse agent templates', sub: '6 ready-made agents', onClick: () => navigate('/templates'),           color: '#a855f7' },
              { icon: Workflow, label: 'View all workflows',     sub: `${data.total_runs} runs so far`, onClick: () => navigate('/workflows'), color: '#10b981' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="card p-4 text-left hover:border-brand-500/20 transition-all duration-200 group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                  style={{ background: `${action.color}15`, border: `1px solid ${action.color}25` }}
                >
                  <action.icon size={15} style={{ color: action.color }} />
                </div>
                <div className="text-sm font-semibold text-white mb-0.5">{action.label}</div>
                <div className="text-xs text-surface-500">{action.sub}</div>
              </button>
            ))}
          </div>

          {/* Recent runs */}
          <div className="card overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Activity size={15} style={{ color: '#0ea5e9' }} />
                <h2 className="font-semibold text-white text-sm">Recent runs</h2>
              </div>
              <button
                onClick={() => navigate('/agents')}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1"
              >
                All agents <ArrowRight size={13} />
              </button>
            </div>

            {data.recent_runs?.length === 0 ? (
              <div className="py-10 text-center text-surface-500 text-sm">
                No runs yet — pick an agent and run your first task!
              </div>
            ) : (
              <div>
                {data.recent_runs.map((run) => (
                  <RunRow key={run.id} run={run} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}