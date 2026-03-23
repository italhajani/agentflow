import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { agentsApi } from '../lib/api'
import { Bot, Plus, Play, History, Trash2, MoreVertical, Zap, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const MODEL_LABELS = {
  groq:        { label: 'Groq',         color: 'badge-green' },
  huggingface: { label: 'HuggingFace',  color: 'badge-blue'  },
  gemini:      { label: 'Gemini',       color: 'badge-brand' },
  ollama:      { label: 'Ollama (local)', color: 'badge-gray' },
}

function AgentMenu({ agent, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef()
  const navigate        = useNavigate()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 w-40">
          <button
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}`); setOpen(false) }}
          >
            <Settings size={14} /> Edit agent
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}/history`); setOpen(false) }}
          >
            <History size={14} /> View history
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); onDelete(agent.id); setOpen(false) }}
          >
            <Trash2 size={14} /> Archive agent
          </button>
        </div>
      )}
    </div>
  )
}

function AgentCard({ agent, onDelete }) {
  const navigate = useNavigate()
  const model    = MODEL_LABELS[agent.model_provider] || { label: agent.model_provider, color: 'badge-gray' }

  return (
    <div
      className="card p-5 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => navigate(`/agents/${agent.id}/run`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bot size={20} className="text-brand-600" />
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <AgentMenu agent={agent} onDelete={onDelete} />
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1 truncate">{agent.name}</h3>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{agent.role}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className={model.color}>{model.label}</span>
        <span className="badge-gray">{agent.model_name}</span>
        {agent.template_id && <span className="badge-brand">Template</span>}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{agent.total_runs} runs</span>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/agents/${agent.id}/run`) }}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600
                     hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Play size={12} fill="currentColor" /> Run task
        </button>
      </div>
    </div>
  )
}

function EmptyAgents({ navigate }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
        <Bot size={32} className="text-brand-400" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">No agents yet</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        Create your first AI agent from a template or build a custom one.
      </p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/templates')} className="btn-secondary">
          Browse templates
        </button>
        <button onClick={() => navigate('/agents/new')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Create agent
        </button>
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn:  () => agentsApi.list().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => agentsApi.delete(id),
    onSuccess:  () => {
      queryClient.invalidateQueries(['agents'])
      toast.success('Agent archived')
    },
    onError: () => toast.error('Failed to archive agent'),
  })

  const handleDelete = (id) => {
    if (confirm('Archive this agent? Its history will be preserved.')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Agents</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {data?.total ?? 0} agent{data?.total !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/templates')} className="btn-secondary hidden sm:flex items-center gap-2">
            <Zap size={16} /> From template
          </button>
          <button onClick={() => navigate('/agents/new')} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Agent
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-44 animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : data?.agents?.length === 0 ? (
        <EmptyAgents navigate={navigate} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
          ))}

          {/* Create new card */}
          <button
            onClick={() => navigate('/agents/new')}
            className="card p-5 border-dashed border-2 border-gray-200 hover:border-brand-300
                       hover:bg-brand-50/30 transition-all flex flex-col items-center justify-center
                       gap-3 text-gray-400 hover:text-brand-600 min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span className="text-sm font-medium">Add agent</span>
          </button>
        </div>
      )}
    </div>
  )
}
