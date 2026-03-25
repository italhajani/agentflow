import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Sparkles, Play, Clock, TrendingUp, Bot, ArrowRight, Loader2, Moon, Sun, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import clsx from 'clsx'
import toast from 'react-hot-toast'

// Example task suggestions
const EXAMPLE_TASKS = [
  {
    id: 1,
    title: "WooCommerce Product Content Writer",
    description: "Write SEO-optimized product descriptions, meta tags, and alt text for daily product uploads",
    icon: "🛍️",
    category: "E-commerce"
  },
  {
    id: 2,
    title: "Social Media Content Generator",
    description: "Create engaging posts for Twitter, LinkedIn, and Instagram from your blog content",
    icon: "📱",
    category: "Marketing"
  },
  {
    id: 3,
    title: "Customer Support Email Assistant",
    description: "Draft professional responses to customer inquiries and support tickets",
    icon: "✉️",
    category: "Support"
  },
  {
    id: 4,
    title: "Research & Report Generator",
    description: "Research topics, summarize findings, and create structured reports",
    icon: "🔍",
    category: "Research"
  }
]

function WorkflowInput({ onSubmit, isGenerating }) {
  const [description, setDescription] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (description.trim()) {
      onSubmit(description.trim())
    }
  }

  const handleExampleClick = (example) => {
    setDescription(example.description)
    // Auto-submit after a short delay to show the text
    setTimeout(() => {
      onSubmit(example.description)
    }, 100)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className={clsx(
          'bg-white border-2 rounded-2xl transition-all',
          isFocused ? 'border-primary-500 shadow-lg' : 'border-slate-200'
        )}>
          <textarea
            className="w-full px-6 py-5 text-lg rounded-2xl resize-none focus:outline-none placeholder:text-slate-400"
            placeholder="Describe what you want to automate... e.g., 'I run a WooCommerce store and upload 5 products daily. I need AI to write SEO-optimized descriptions, meta tags, and alt text for each product.'"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <div className="flex gap-2 text-xs text-slate-400">
              <span>✨ AI-powered</span>
              <span>•</span>
              <span>⚡ Free to use</span>
              <span>•</span>
              <span>🔒 Private</span>
            </div>
            <button
              type="submit"
              disabled={!description.trim() || isGenerating}
              className={clsx(
                'px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all',
                description.trim() && !isGenerating
                  ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Workflow
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Example tasks */}
      <div className="mt-8">
        <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
          <span>✨ Try these examples</span>
          <span className="text-xs">(click to auto-fill)</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXAMPLE_TASKS.map((task) => (
            <button
              key={task.id}
              onClick={() => handleExampleClick(task)}
              className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all group"
              data-tooltip="Click to use this example"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{task.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
                    {task.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                    {task.description}
                  </p>
                  <span className="inline-block mt-2 text-xs text-primary-500 group-hover:translate-x-1 transition-transform">
                    Try this →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function WorkflowNode({ step, index, totalSteps }) {
  return (
    <div className="relative flex items-center">
      <div className="flex-shrink-0">
        <div className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
          step.status === 'completed' ? 'bg-primary-500 text-white' :
          step.status === 'running' ? 'bg-primary-100 text-primary-600 border-2 border-primary-500' :
          'bg-slate-100 text-slate-400'
        )}>
          {step.status === 'completed' ? '✓' : index + 1}
        </div>
      </div>
      <div className="ml-4 flex-1">
        <h4 className="font-semibold text-slate-800">{step.name}</h4>
        <p className="text-sm text-slate-500">{step.description}</p>
        {step.agent && (
          <div className="mt-1 flex items-center gap-2">
            <Bot size={12} className="text-primary-500" />
            <span className="text-xs text-slate-400">Agent: {step.agent}</span>
          </div>
        )}
      </div>
      {index < totalSteps - 1 && (
        <div className="absolute left-6 top-12 w-px h-8 bg-primary-300" />
      )}
    </div>
  )
}

function WorkflowPreview({ workflow, onRun, onRegenerate }) {
  const [expanded, setExpanded] = useState(true)

  if (!workflow) return null

  return (
    <div className="mt-8 fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-primary-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={18} className="text-primary-500" />
                <h2 className="text-xl font-bold text-slate-800">{workflow.name}</h2>
              </div>
              <p className="text-sm text-slate-500">{workflow.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRegenerate}
                className="btn-secondary text-sm"
                data-tooltip="Generate a different workflow"
              >
                <Sparkles size={14} className="mr-1" />
                Regenerate
              </button>
              <button
                onClick={onRun}
                className="btn-primary text-sm flex items-center gap-2"
                data-tooltip="Run this workflow now"
              >
                <Play size={14} fill="currentColor" />
                Run Workflow
              </button>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-4"
          >
            <ChevronRight size={16} className={clsx('transition-transform', expanded && 'rotate-90')} />
            Workflow Steps ({workflow.steps?.length || 0})
          </button>

          {expanded && (
            <div className="space-y-6">
              {workflow.steps?.map((step, idx) => (
                <WorkflowNode
                  key={idx}
                  step={step}
                  index={idx}
                  totalSteps={workflow.steps.length}
                />
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Total Steps</p>
              <p className="text-xl font-bold text-slate-800">{workflow.steps?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Estimated Time</p>
              <p className="text-xl font-bold text-slate-800">
                ~{workflow.steps?.length * 15}s
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Tools Required</p>
              <p className="text-xl font-bold text-slate-800">
                {workflow.steps?.filter(s => s.tools?.length).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecentWorkflows({ workflows, onSelect }) {
  if (!workflows?.length) return null

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Recent Workflows</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all →
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.slice(0, 3).map((workflow) => (
          <button
            key={workflow.id}
            onClick={() => onSelect(workflow)}
            className="text-left p-4 bg-white border border-slate-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <Bot size={20} className="text-primary-500" />
              <Clock size={14} className="text-slate-400" />
            </div>
            <h4 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
              {workflow.name}
            </h4>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {workflow.description}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Play size={10} />
              <span>{workflow.total_runs || 0} runs</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [generatingWorkflow, setGeneratingWorkflow] = useState(null)
  const [currentWorkflow, setCurrentWorkflow] = useState(null)

  const { data: recentWorkflows, refetch: refetchWorkflows } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows/').then(r => r.data),
    enabled: !!user,
  })

  const generateMutation = useMutation({
    mutationFn: (description) => api.post('/workflows/generate-from-description', { description }),
    onSuccess: (res) => {
      // Start polling for workflow generation
      const workflowId = res.data.workflow_id
      setGeneratingWorkflow(workflowId)
      
      const pollInterval = setInterval(async () => {
        try {
          const workflowRes = await api.get(`/workflows/${workflowId}`)
          if (workflowRes.data.name !== "Generating...") {
            clearInterval(pollInterval)
            setGeneratingWorkflow(null)
            setCurrentWorkflow(workflowRes.data)
            refetchWorkflows()
            toast.success('Workflow generated successfully!')
          }
        } catch (err) {
          // Still generating
        }
      }, 2000)
      
      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(pollInterval), 120000)
    },
    onError: (err) => {
      setGeneratingWorkflow(null)
      toast.error(err.response?.data?.detail || 'Failed to generate workflow')
    }
  })

  const runMutation = useMutation({
    mutationFn: (workflowId) => api.post(`/workflows/${workflowId}/run`, { input_data: {} }),
    onSuccess: () => {
      toast.success('Workflow started! Check back in a moment.')
      refetchWorkflows()
    },
    onError: () => toast.error('Failed to run workflow'),
  })

  const handleGenerate = (description) => {
    generateMutation.mutate(description)
  }

  const handleRunWorkflow = () => {
    if (currentWorkflow) {
      runMutation.mutate(currentWorkflow.id)
    }
  }

  const handleRegenerate = () => {
    setCurrentWorkflow(null)
    // Could re-run with same description
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
              <Sparkles size={14} />
              AI-Powered Workflow Automation
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-3">
              Build your AI workforce
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Describe your repetitive task, and let AI create a complete workflow with specialized agents — completely free.
            </p>
          </div>

          <WorkflowInput 
            onSubmit={handleGenerate} 
            isGenerating={generateMutation.isPending || generatingWorkflow}
          />

          {generateMutation.isPending && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm">
                <Loader2 size={20} className="animate-spin text-primary-500" />
                <span className="text-slate-600">AI is planning your workflow...</span>
                <span className="text-xs text-slate-400">This may take 20-30 seconds</span>
              </div>
            </div>
          )}

          {currentWorkflow && (
            <WorkflowPreview
              workflow={currentWorkflow}
              onRun={handleRunWorkflow}
              onRegenerate={handleRegenerate}
            />
          )}
        </div>
      </div>

      {/* Recent Workflows Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <RecentWorkflows 
          workflows={recentWorkflows?.workflows} 
          onSelect={setCurrentWorkflow}
        />

        {/* Stats Section */}
        {user && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <Bot size={24} className="text-primary-500 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{user.total_runs || 0}</p>
              <p className="text-sm text-slate-500">Total runs</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <TrendingUp size={24} className="text-primary-500 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{user.runs_today || 0}</p>
              <p className="text-sm text-slate-500">Runs today</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <Play size={24} className="text-primary-500 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{recentWorkflows?.workflows?.length || 0}</p>
              <p className="text-sm text-slate-500">Workflows created</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <Clock size={24} className="text-primary-500 mb-2" />
              <p className="text-2xl font-bold text-slate-800">Free</p>
              <p className="text-sm text-slate-500">Plan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}