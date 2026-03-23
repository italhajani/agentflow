import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi, runsApi } from '../lib/api'
import { Play, History, ChevronLeft, Bot, Copy, ThumbsUp, ThumbsDown, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ── Thinking animation ─────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-sm text-gray-500">Agent is thinking</span>
      <div className="flex gap-1 ml-1">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 dot-1" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 dot-2" />
        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 dot-3" />
      </div>
    </div>
  )
}

// ── Result card ───────────────────────────────────────────────────────────
function ResultCard({ run, onRate }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(run.result || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <span className="text-sm font-medium text-gray-700">Result</span>
          {run.duration_ms && (
            <span className="badge-gray">{(run.duration_ms / 1000).toFixed(1)}s</span>
          )}
        </div>
        <button onClick={copy} className="btn-ghost text-xs flex items-center gap-1.5 py-1.5">
          <Copy size={13} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Body — markdown-like rendering */}
      <div className="px-5 py-4">
        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {run.result}
        </div>
      </div>

      {/* Feedback row */}
      {!run.user_rating && (
        <div className="px-5 pb-4 flex items-center gap-3">
          <span className="text-xs text-gray-400">Was this helpful?</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onRate(n)}
              className="text-gray-300 hover:text-yellow-400 transition-colors"
              title={`Rate ${n}/5`}
            >
              <Star size={16} />
            </button>
          ))}
        </div>
      )}
      {run.user_rating && (
        <div className="px-5 pb-4">
          <span className="text-xs text-gray-400">
            You rated this {run.user_rating}/5 ⭐ — thanks!
          </span>
        </div>
      )}
    </div>
  )
}

// ── Error card ─────────────────────────────────────────────────────────────
function ErrorCard({ message }) {
  return (
    <div className="card border-red-200 bg-red-50 p-5">
      <p className="text-sm font-medium text-red-700 mb-1">Run failed</p>
      <p className="text-sm text-red-600 font-mono">{message}</p>
      <p className="text-xs text-red-400 mt-2">
        Check your API key in the backend .env file and make sure the model provider is configured.
      </p>
    </div>
  )
}

// ── Example task chips ─────────────────────────────────────────────────────
const EXAMPLE_TASKS = {
  shopwise:        ['Show me blue cotton shirts', "What's your return policy?", 'Add f001 to my cart', 'What are the top-rated items?'],
  researcher:      ['Research AI agent frameworks in 2025', 'Summarise top 5 competitors of Notion'],
  content_writer:  ['Write a blog post about standing desks', 'Create 5 Instagram captions for a coffee shop'],
  customer_support:['Handle a refund request for a damaged item', 'What is the cancellation policy?'],
  data_analyst:    ['Analyse this data: sales grew 12% in Q1 but fell 3% in Q2', 'Calculate churn rate: 500 customers, 40 left'],
  email_assistant: ['Draft a follow-up to a client who hasn't replied', 'Write a cold outreach email for a SaaS tool'],
}

export default function RunTaskPage() {
  const { agentId }  = useParams()
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const [input, setInput]     = useState('')
  const [activeRunId, setRunId] = useState(null)
  const [currentRun, setRun]    = useState(null)
  const pollRef                 = useRef(null)

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn:  () => agentsApi.get(agentId).then((r) => r.data),
  })

  // Start a run
  const runMutation = useMutation({
    mutationFn: (data) => runsApi.run(agentId, data),
    onSuccess: (res) => {
      setRunId(res.data.id)
      setRun(res.data)
      queryClient.invalidateQueries(['dashboard'])
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Failed to start run'
      toast.error(msg)
    },
  })

  // Poll for result
  useEffect(() => {
    if (!activeRunId) return
    if (currentRun?.status === 'completed' || currentRun?.status === 'failed') return

    pollRef.current = setInterval(async () => {
      try {
        const res = await runsApi.get(agentId, activeRunId)
        setRun(res.data)
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(pollRef.current)
          queryClient.invalidateQueries(['runs', agentId])
          queryClient.invalidateQueries(['dashboard'])
          if (res.data.status === 'completed') toast.success('Task completed!')
        }
      } catch (_) { clearInterval(pollRef.current) }
    }, 1500)

    return () => clearInterval(pollRef.current)
  }, [activeRunId, currentRun?.status])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    setRun(null)
    setRunId(null)
    runMutation.mutate({ task_input: input.trim() })
  }

  const handleRate = async (rating) => {
    if (!activeRunId) return
    try {
      await runsApi.feedback(agentId, activeRunId, { rating })
      setRun((r) => ({ ...r, user_rating: rating }))
      toast.success('Thanks for the feedback!')
    } catch (_) { toast.error('Could not save rating') }
  }

  const isRunning = runMutation.isPending ||
    (currentRun?.status === 'queued' || currentRun?.status === 'running')

  const examples = EXAMPLE_TASKS[agent?.template_id] || []

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/agents')} className="btn-ghost p-2">
          <ChevronLeft size={18} />
        </button>
        <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
          <Bot size={18} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{agent?.name || 'Agent'}</h1>
          <p className="text-xs text-gray-500 truncate">{agent?.role}</p>
        </div>
        <button
          onClick={() => navigate(`/agents/${agentId}/history`)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <History size={15} /> History
        </button>
      </div>

      {/* Task input form */}
      <div className="card p-5 mb-5">
        <form onSubmit={handleSubmit}>
          <label className="label mb-2">Task</label>
          <textarea
            className="input min-h-[100px] resize-none mb-3"
            placeholder={`What do you want ${agent?.name || 'this agent'} to do?`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isRunning}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e) }}
          />

          {/* Example tasks */}
          {examples.length > 0 && !isRunning && (
            <div className="flex flex-wrap gap-2 mb-3">
              {examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setInput(ex)}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-brand-50 hover:text-brand-700
                             text-gray-600 rounded-full transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Ctrl+Enter to run</p>
            <button
              type="submit"
              disabled={!input.trim() || isRunning}
              className="btn-primary flex items-center gap-2"
            >
              <Play size={15} fill="currentColor" />
              {isRunning ? 'Running…' : 'Run task'}
            </button>
          </div>
        </form>
      </div>

      {/* Status / Result area */}
      {isRunning && (
        <div className="card p-5">
          <ThinkingDots />
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-400 rounded-full animate-pulse w-2/3" />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Using {agent?.model_provider} · {agent?.model_name}
          </p>
        </div>
      )}

      {currentRun?.status === 'completed' && (
        <ResultCard run={currentRun} onRate={handleRate} />
      )}

      {currentRun?.status === 'failed' && (
        <ErrorCard message={currentRun.error_message} />
      )}
    </div>
  )
}
