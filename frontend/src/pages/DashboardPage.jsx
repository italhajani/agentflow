import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bot, Play, CheckCircle2, XCircle, Plus, ArrowRight, Zap, TrendingUp } from 'lucide-react'
import { dashboardApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:  'bg-brand-50 text-brand-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon size={20} />
        </div>
      </div>
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

function EmptyDashboard({ navigate }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
        <Zap size={32} className="text-brand-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Build your first AI agent</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">
        Start from a template or create a custom agent. Your ShopWise agent from the notebook is ready to deploy.
      </p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/templates')} className="btn-secondary flex items-center gap-2">
          <Bot size={16} /> Browse templates
        </button>
        <button onClick={() => navigate('/agents/new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Create agent
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user }   = useAuthStore()
  const navigate   = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  () => dashboardApi.get().then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-24 animate-pulse bg-gray-50" />
          ))}
        </div>
      </div>
    )
  }

  const hasData = data?.total_agents > 0

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
            {user?.full_name?.split(' ')[0] || user?.username} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here's your AI workforce overview</p>
        </div>
        <button
          onClick={() => navigate('/agents/new')}
          className="btn-primary hidden md:flex items-center gap-2"
        >
          <Plus size={16} /> New Agent
        </button>
      </div>

      {!hasData ? (
        <EmptyDashboard navigate={navigate} />
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Bot}          label="Total agents"   value={data.total_agents}   sub={`${data.active_agents} active`}            color="brand" />
            <StatCard icon={TrendingUp}   label="Total runs"     value={data.total_runs}     sub="all time"                                   color="brand" />
            <StatCard icon={CheckCircle2} label="Successful"     value={data.successful_runs} sub="completed runs"                            color="green" />
            <StatCard icon={Play}         label="Today's runs"   value={data.runs_today}
              sub={`${data.runs_limit - data.runs_today} remaining`}
              color={data.runs_today >= data.runs_limit * 0.9 ? 'yellow' : 'brand'}
            />
          </div>

          {/* Daily usage bar */}
          {user?.plan === 'free' && (
            <div className="card p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Daily run usage</span>
                <span className="text-sm text-gray-500">{data.runs_today} / {data.runs_limit}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    data.runs_today / data.runs_limit >= 0.9 ? 'bg-red-500' :
                    data.runs_today / data.runs_limit >= 0.6 ? 'bg-yellow-500' : 'bg-brand-500'
                  )}
                  style={{ width: `${Math.min(100, (data.runs_today / data.runs_limit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Recent runs */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent runs</h2>
              <button
                onClick={() => navigate('/agents')}
                className="text-sm text-brand-600 hover:underline flex items-center gap-1"
              >
                View all agents <ArrowRight size={14} />
              </button>
            </div>

            {data.recent_runs?.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No runs yet — select an agent and run your first task!
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recent_runs?.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/agents/${run.agent_id}/history`)}
                  >
                    <div className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      run.status === 'completed' ? 'bg-green-100' :
                      run.status === 'failed'    ? 'bg-red-100'   : 'bg-yellow-100'
                    )}>
                      {run.status === 'completed'
                        ? <CheckCircle2 size={14} className="text-green-600" />
                        : run.status === 'failed'
                        ? <XCircle size={14} className="text-red-500" />
                        : <Play size={14} className="text-yellow-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{run.task_input}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {run.created_at
                          ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true })
                          : ''}
                        {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
                      </p>
                    </div>
                    <StatusBadge status={run.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
