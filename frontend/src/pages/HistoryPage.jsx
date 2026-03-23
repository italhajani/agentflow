import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { agentsApi, runsApi } from '../lib/api'
import { ChevronLeft, Play, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Bot } from 'lucide-react'
import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

function StatusIcon({ status }) {
  if (status === 'completed') return <CheckCircle2 size={16} className="text-green-500" />
  if (status === 'failed')    return <XCircle      size={16} className="text-red-500" />
  if (status === 'running')   return <div className="spinner w-4 h-4" />
  return <Clock size={16} className="text-yellow-500" />
}

function RunRow({ run }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        className="w-full flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 flex-shrink-0">
          <StatusIcon status={run.status} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate font-medium">{run.task_input}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">
              {run.created_at
                ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true })
                : ''}
            </span>
            {run.duration_ms && (
              <span className="text-xs text-gray-400">{(run.duration_ms / 1000).toFixed(1)}s</span>
            )}
            {run.user_rating && (
              <span className="text-xs text-gray-400">⭐ {run.user_rating}/5</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={clsx('badge text-xs', {
            'badge-green':  run.status === 'completed',
            'badge-red':    run.status === 'failed',
            'badge-blue':   run.status === 'running',
            'badge-yellow': run.status === 'queued',
            'badge-gray':   run.status === 'cancelled',
          })}>
            {run.status}
          </span>
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 bg-gray-50/50">
          {run.result && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Result</p>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {run.result}
              </div>
            </div>
          )}
          {run.error_message && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 font-mono">
              {run.error_message}
            </div>
          )}
          <div className="flex gap-4 mt-3 text-xs text-gray-400">
            {run.completed_at && (
              <span>Completed: {format(new Date(run.completed_at), 'MMM d, yyyy HH:mm')}</span>
            )}
            {run.tokens_used > 0 && <span>Tokens: {run.tokens_used}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const { agentId } = useParams()
  const navigate    = useNavigate()

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn:  () => agentsApi.get(agentId).then((r) => r.data),
  })

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['runs', agentId],
    queryFn:  () => runsApi.list(agentId).then((r) => r.data),
  })

  const runs       = runsData?.runs || []
  const completed  = runs.filter((r) => r.status === 'completed').length
  const failed     = runs.filter((r) => r.status === 'failed').length
  const successRate = runs.length > 0 ? Math.round((completed / runs.length) * 100) : 0

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ChevronLeft size={18} />
        </button>
        <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
          <Bot size={18} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900">{agent?.name || 'Agent'} — History</h1>
          <p className="text-xs text-gray-500">{runsData?.total || 0} total runs</p>
        </div>
        <button
          onClick={() => navigate(`/agents/${agentId}/run`)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Play size={14} fill="currentColor" /> Run task
        </button>
      </div>

      {/* Summary stats */}
      {runs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{runs.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total runs</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{successRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Success rate</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {runs.filter((r) => r.duration_ms).length > 0
                ? `${(runs.filter((r) => r.duration_ms).reduce((a, r) => a + r.duration_ms, 0) /
                    runs.filter((r) => r.duration_ms).length / 1000).toFixed(1)}s`
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Avg duration</p>
          </div>
        </div>
      )}

      {/* Run list */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="py-16 text-center">
            <Clock size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No runs yet</p>
            <button
              onClick={() => navigate(`/agents/${agentId}/run`)}
              className="btn-primary mt-4 text-sm flex items-center gap-2 mx-auto"
            >
              <Play size={14} fill="currentColor" /> Run first task
            </button>
          </div>
        ) : (
          <div>
            {runs.map((run) => <RunRow key={run.id} run={run} />)}
          </div>
        )}
      </div>
    </div>
  )
}
