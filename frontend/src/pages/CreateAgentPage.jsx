import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentsApi, templatesApi } from '../lib/api'
import { ChevronLeft, Bot, Zap, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const PROVIDERS = [
  { id: 'groq',        label: 'Groq (Recommended)', sub: 'Fast & free · llama3, mixtral' },
  { id: 'huggingface', label: 'HuggingFace',         sub: 'Huge model library · free tier' },
  { id: 'gemini',      label: 'Google Gemini',       sub: '1M context · free tier' },
  { id: 'ollama',      label: 'Ollama (Local)',      sub: 'Runs on your machine' },
]

const MODELS = {
  groq:        ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  huggingface: ['mistralai/Mixtral-8x7B-Instruct-v0.1', 'microsoft/Phi-3-mini-4k-instruct', 'google/flan-t5-xxl'],
  gemini:      ['gemini-1.5-flash', 'gemini-1.5-pro'],
  ollama:      ['llama3', 'mistral', 'phi3', 'gemma2'],
}

const AVAILABLE_TOOLS = [
  { id: 'web_search', label: 'Web Search',  icon: '🔍', desc: 'DuckDuckGo — free web search' },
  { id: 'calculator', label: 'Calculator',  icon: '🧮', desc: 'Maths and unit conversions' },
]

function ToolToggle({ tool, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tool.id)}
      className={clsx(
        'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
        selected
          ? 'border-brand-400 bg-brand-50 text-brand-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
      )}
    >
      <span className="text-xl">{tool.icon}</span>
      <div>
        <p className="text-sm font-medium">{tool.label}</p>
        <p className="text-xs text-gray-400">{tool.desc}</p>
      </div>
      <div className={clsx(
        'ml-auto w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
        selected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
      )} />
    </button>
  )
}

export default function CreateAgentPage() {
  const navigate      = useNavigate()
  const queryClient   = useQueryClient()
  const [params]      = useSearchParams()
  const fromTemplate  = params.get('template')

  // Pre-fill from template if coming from templates page
  const { data: tplData } = useQuery({
    queryKey:  ['template', fromTemplate],
    queryFn:   () => templatesApi.get(fromTemplate).then((r) => r.data),
    enabled:   !!fromTemplate,
  })

  const defaults = {
    name:           tplData?.name      || '',
    role:           tplData?.role      || '',
    goal:           tplData?.goal      || '',
    backstory:      tplData?.backstory || '',
    instructions:   '',
    model_provider: tplData?.model_provider || 'groq',
    model_name:     tplData?.model_name     || 'llama3-8b-8192',
    temperature:    0.1,
    tools:          tplData?.suggested_tools || [],
    is_public:      false,
    template_id:    fromTemplate || null,
  }

  const [form, setForm] = useState(defaults)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value ?? e }))

  const toggleTool = (toolId) => {
    setForm((f) => ({
      ...f,
      tools: f.tools.includes(toolId) ? f.tools.filter((t) => t !== toolId) : [...f.tools, toolId],
    }))
  }

  const mutation = useMutation({
    mutationFn: (data) => agentsApi.create(data),
    onSuccess:  (res) => {
      queryClient.invalidateQueries(['agents'])
      toast.success(`Agent "${res.data.name}" created!`)
      navigate(`/agents/${res.data.id}/run`)
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to create agent')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
          <Bot size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {fromTemplate ? `Create from template` : 'Create custom agent'}
          </h1>
          <p className="text-sm text-gray-500">Define your agent's identity and capabilities</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-base">🪪</span> Identity
          </h2>

          <div>
            <label className="label">Agent name *</label>
            <input className="input" placeholder="e.g. ShopWise Assistant" value={form.name} onChange={set('name')} required minLength={2} maxLength={100} />
          </div>

          <div>
            <label className="label">Role *</label>
            <input className="input" placeholder="e.g. E-commerce Shopping Assistant" value={form.role} onChange={set('role')} required minLength={5} maxLength={200} />
            <p className="text-xs text-gray-400 mt-1">What job title or function does this agent have?</p>
          </div>

          <div>
            <label className="label">Goal *</label>
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Help users find products, answer FAQs, and complete purchases efficiently."
              value={form.goal} onChange={set('goal')} required minLength={10} maxLength={2000}
            />
          </div>

          <div>
            <label className="label">Backstory <span className="text-gray-400">(optional)</span></label>
            <textarea
              className="input min-h-[72px] resize-none"
              placeholder="You are a friendly, knowledgeable assistant with deep expertise in fashion..."
              value={form.backstory} onChange={set('backstory')} maxLength={3000}
            />
            <p className="text-xs text-gray-400 mt-1">Gives the agent personality and context. Improves quality.</p>
          </div>

          <div>
            <label className="label">Extra instructions <span className="text-gray-400">(optional)</span></label>
            <textarea
              className="input min-h-[60px] resize-none"
              placeholder="Always respond in bullet points. Never mention competitor products."
              value={form.instructions} onChange={set('instructions')} maxLength={3000}
            />
          </div>
        </div>

        {/* Model */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Zap size={16} className="text-brand-500" /> AI Model
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, model_provider: p.id, model_name: MODELS[p.id][0] }))
                }}
                className={clsx(
                  'text-left p-3 rounded-xl border transition-all',
                  form.model_provider === p.id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className={clsx('text-sm font-medium', form.model_provider === p.id ? 'text-brand-700' : 'text-gray-800')}>{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.sub}</p>
              </button>
            ))}
          </div>

          <div>
            <label className="label">Model</label>
            <select className="input" value={form.model_name}
              onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))}>
              {(MODELS[form.model_provider] || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Temperature</label>
              <span className="text-sm font-medium text-gray-700">{form.temperature}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={form.temperature}
              onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Focused (0)</span>
              <span>Creative (1)</span>
            </div>
          </div>
        </div>

        {/* Tools */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">🔧 Tools</h2>
            <span className="badge-gray text-xs">All free</span>
          </div>
          <p className="text-xs text-gray-500">Give your agent abilities beyond just answering questions.</p>
          <div className="space-y-2">
            {AVAILABLE_TOOLS.map((tool) => (
              <ToolToggle
                key={tool.id}
                tool={tool}
                selected={form.tools.includes(tool.id)}
                onToggle={toggleTool}
              />
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="card p-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              checked={form.is_public}
              onChange={(e) => setForm((f) => ({ ...f, is_public: e.target.checked }))}
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Share in marketplace</p>
              <p className="text-xs text-gray-400">Let others discover and clone your agent template</p>
            </div>
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
            {mutation.isPending ? 'Creating…' : '✓ Create agent'}
          </button>
        </div>
      </form>
    </div>
  )
}
