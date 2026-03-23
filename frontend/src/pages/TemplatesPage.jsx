import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { templatesApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Zap, ArrowRight, Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CATEGORY_COLORS = {
  'E-commerce': 'bg-blue-50   text-blue-700   border-blue-200',
  'Research':   'bg-purple-50 text-purple-700 border-purple-200',
  'Content':    'bg-pink-50   text-pink-700   border-pink-200',
  'Support':    'bg-green-50  text-green-700  border-green-200',
  'Analytics':  'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Productivity':'bg-orange-50 text-orange-700 border-orange-200',
}

function TemplateCard({ template, onUse, isCloning }) {
  const catColor = CATEGORY_COLORS[template.category] || 'bg-gray-50 text-gray-700 border-gray-200'

  return (
    <div className={clsx('card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow', template.is_featured && 'ring-2 ring-brand-200')}>
      {template.is_featured && (
        <div className="flex items-center gap-1.5 -mb-1">
          <Zap size={12} className="text-brand-500" />
          <span className="text-xs font-semibold text-brand-600">Featured</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="text-3xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{template.name}</h3>
          <span className={clsx('inline-block mt-1 text-xs px-2 py-0.5 rounded-full border', catColor)}>
            {template.category}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed flex-1">{template.description}</p>

      {/* Example tasks */}
      {template.example_tasks?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1.5">Example tasks:</p>
          <div className="space-y-1">
            {template.example_tasks.slice(0, 2).map((ex) => (
              <div key={ex} className="flex items-start gap-1.5 text-xs text-gray-500">
                <span className="text-gray-300 mt-0.5">→</span>
                <span className="truncate">{ex}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {template.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="badge-gray text-xs">{tag}</span>
        ))}
      </div>

      {/* Model info */}
      <div className="text-xs text-gray-400 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        Free · {template.model_name}
      </div>

      {/* Action */}
      <button
        onClick={() => onUse(template)}
        disabled={isCloning}
        className="btn-primary flex items-center justify-center gap-2 text-sm w-full"
      >
        {isCloning ? 'Adding to workspace…' : (
          <>
            Use this template <ArrowRight size={14} />
          </>
        )}
      </button>
    </div>
  )
}

export default function TemplatesPage() {
  const navigate       = useNavigate()
  const queryClient    = useQueryClient()
  const { user }       = useAuthStore()
  const [category, setCat] = useState('All')
  const [cloningId, setCloningId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn:  () => templatesApi.list().then((r) => r.data),
  })

  const cloneMutation = useMutation({
    mutationFn: (id) => templatesApi.clone(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['agents'])
      toast.success(`"${res.data.name}" added to your workspace!`)
      setCloningId(null)
      navigate(`/agents/${res.data.id}/run`)
    },
    onError: (err) => {
      setCloningId(null)
      toast.error(err.response?.data?.detail || 'Failed to clone template')
    },
  })

  const handleUse = (template) => {
    if (!user) {
      navigate('/register')
      return
    }
    setCloningId(template.id)
    cloneMutation.mutate(template.id)
  }

  const templates  = data?.templates || []
  const categories = ['All', ...(data?.categories || [])]
  const filtered   = category === 'All' ? templates : templates.filter((t) => t.category === category)
  const featured   = filtered.filter((t) => t.is_featured)
  const rest       = filtered.filter((t) => !t.is_featured)

  return (
    <div className={clsx('min-h-screen', user ? '' : 'bg-gray-50')}>
      {/* Hero — shown to logged-out visitors */}
      {!user && (
        <div className="bg-gradient-to-br from-brand-600 to-indigo-700 text-white px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold">AgentFlow</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">AI Agent Templates</h1>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Pre-built AI agents for every task. Deploy in one click — completely free.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => navigate('/register')} className="px-6 py-3 bg-white text-brand-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Get started free
            </button>
            <button onClick={() => navigate('/login')} className="px-6 py-3 border border-white/30 text-white font-medium rounded-xl hover:bg-white/10 transition-colors">
              Sign in
            </button>
          </div>
        </div>
      )}

      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        {user && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Agent Templates</h1>
            <p className="text-gray-500 text-sm mt-0.5">Clone a template to your workspace in one click</p>
          </div>
        )}

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCat(cat)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                category === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 h-72 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  ⭐ Featured
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onUse={handleUse}
                      isCloning={cloningId === t.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  All templates
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onUse={handleUse}
                      isCloning={cloningId === t.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA for logged-out */}
        {!user && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-4">Ready to deploy your own AI workforce?</p>
            <button onClick={() => navigate('/register')} className="btn-primary px-8 py-3 text-base">
              Create free account →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
