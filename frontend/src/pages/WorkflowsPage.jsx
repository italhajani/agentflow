import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, History, Trash2, ChevronRight, Clock, Bot } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// You'll add this to api.js later
const workflowsApi = {
  list: () => api.get('/workflows/').then(r => r.data),
  delete: (id) => api.delete(`/workflows/${id}`),
  run: (id, data) => api.post(`/workflows/${id}/run`, data),
}

function WorkflowCard({ workflow, onRun, onDelete }) {
  const navigate = useNavigate()
  
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
            <Bot size={16} className="text-brand-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => onRun(workflow.id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-brand-600"
            title="Run workflow"
          >
            <Play size={14} />
          </button>
          <button 
            onClick={() => onDelete(workflow.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {workflow.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{workflow.description}</p>
      )}
      
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="badge-gray text-xs">
          {workflow.steps?.length || 0} step{workflow.steps?.length !== 1 ? 's' : ''}
        </span>
        <span className={clsx('badge text-xs', {
          'badge-green': workflow.schedule_type === 'daily',
          'badge-blue': workflow.schedule_type === 'weekly',
          'badge-gray': workflow.schedule_type === 'manual',
        })}>
          {workflow.schedule_type === 'manual' ? 'Manual' : 
           workflow.schedule_type === 'daily' ? 'Daily' : 'Weekly'}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{workflow.total_runs || 0} runs</span>
        <button 
          onClick={() => navigate(`/workflows/${workflow.id}`)}
          className="text-xs text-brand-600 hover:underline flex items-center gap-1"
        >
          View details <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list(),
  })
  
  const deleteMutation = useMutation({
    mutationFn: (id) => workflowsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows'])
      toast.success('Workflow deleted')
    },
    onError: () => toast.error('Failed to delete workflow'),
  })
  
  const runMutation = useMutation({
    mutationFn: ({ id, data }) => workflowsApi.run(id, data),
    onSuccess: () => {
      toast.success('Workflow started! Check back in a moment.')
      queryClient.invalidateQueries(['workflows'])
    },
    onError: () => toast.error('Failed to run workflow'),
  })
  
  const handleRun = (id) => {
    runMutation.mutate({ id, data: { input_data: {} } })
  }
  
  const handleDelete = (id) => {
    if (confirm('Delete this workflow?')) {
      deleteMutation.mutate(id)
    }
  }
  
  const workflows = data?.workflows || []
  
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Multi-step AI automations — chain multiple agents together
          </p>
        </div>
        <button 
          onClick={() => navigate('/workflows/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Workflow
        </button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 h-48 animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
            <Bot size={32} className="text-brand-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No workflows yet</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            Create multi-step automations by chaining agents together.
          </p>
          <button 
            onClick={() => navigate('/workflows/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Create your first workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard 
              key={workflow.id}
              workflow={workflow}
              onRun={handleRun}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}