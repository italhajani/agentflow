import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentsApi } from '../lib/api'
import { ChevronLeft, Bot, Save, Play, History } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const MODELS = {
  groq:        ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
  huggingface: ['mistralai/Mixtral-8x7B-Instruct-v0.1', 'microsoft/Phi-3-mini-4k-instruct'],
  gemini:      ['gemini-1.5-flash', 'gemini-1.5-pro'],
  ollama:      ['llama3', 'mistral', 'phi3'],
}

const TOOLS = [
  { id: 'web_search', label: '🔍 Web Search' },
  { id: 'calculator', label: '🧮 Calculator' },
]

export default function AgentDetailPage() {
  const { agentId }  = useParams()
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const [form, setForm] = useState(null)

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn:  () => agentsApi.get(agentId).then((r) => r.data),
  })

  useEffect(() => {
    if (agent && !form) setForm({ ...agent })
  }, [agent])

  const mutation = useMutation({
    mutationFn: (data) => agentsApi.update(agentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agent', agentId])
      queryClient.invalidateQueries(['agents'])
      toast.success('Agent updated!')
    },
    onError: () => toast.error('Failed to update agent'),
  })

  if (isLoading || !form) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleTool = (id) => setForm((f) => ({
    ...f,
    tools: f.tools.includes(id) ? f.tools.filter((t) => t !== id) : [...f.tools, id],
  }))

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      name: form.name, role: form.role, goal: form.goal,
      backstory: form.backstory, instructions: form.instructions,
      model_provider: form.model_provider, model_name: form.model_name,
      temperature: form.temperature, tools: form.tools, is_public: form.is_public,
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/agents')} className="btn-ghost p-2"><ChevronLeft size={18} /></button>
        <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
          <Bot size={18} className="text-brand-600" />
        </div>
        <h1 className="font-bold text-gray-900 flex-1">Edit agent</h1>
        <button onClick={() => navigate(`/agents/${agentId}/run`)} className="btn-secondary text-sm flex items-center gap-2">
          <Play size={14} fill="currentColor" /> Run
        </button>
        <button onClick={() => navigate(`/agents/${agentId}/history`)} className="btn-secondary text-sm flex items-center gap-2">
          <History size={14} /> History
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Identity</h2>
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input" value={form.role} onChange={set('role')} required />
          </div>
          <div>
            <label className="label">Goal</label>
            <textarea className="input min-h-[80px] resize-none" value={form.goal} onChange={set('goal')} required />
          </div>
          <div>
            <label className="label">Backstory</label>
            <textarea className="input min-h-[72px] resize-none" value={form.backstory || ''} onChange={set('backstory')} />
          </div>
          <div>
            <label className="label">Extra instructions</label>
            <textarea className="input min-h-[60px] resize-none" value={form.instructions || ''} onChange={set('instructions')} />
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Model</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Provider</label>
              <select className="input" value={form.model_provider}
                onChange={(e) => setForm((f) => ({ ...f, model_provider: e.target.value, model_name: MODELS[e.target.value]?.[0] || '' }))}>
                {Object.keys(MODELS).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Model</label>
              <select className="input" value={form.model_name} onChange={set('model_name')}>
                {(MODELS[form.model_provider] || []).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="label mb-0">Temperature</label>
              <span className="text-sm font-medium text-gray-700">{form.temperature}</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={form.temperature}
              onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
              className="w-full" />
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Tools</h2>
          <div className="space-y-2">
            {TOOLS.map((t) => (
              <label key={t.id} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-brand-600"
                  checked={form.tools?.includes(t.id)} onChange={() => toggleTool(t.id)} />
                <span className="text-sm text-gray-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded text-brand-600"
              checked={form.is_public} onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))} />
            <div>
              <p className="text-sm font-medium text-gray-800">Share in marketplace</p>
              <p className="text-xs text-gray-400">Others can discover and clone this agent</p>
            </div>
          </label>
        </div>

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
          <Save size={16} /> {mutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
