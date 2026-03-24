import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { workflowsApi, agentsApi } from '../lib/api'
import { ChevronLeft, Plus, Trash2, Bot } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreateWorkflowPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    schedule_type: 'manual',
    steps: [{ step_order: 1, agent_id: '', input_mapping: {} }]
  })
  
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list().then(r => r.data),
  })
  
  const createMutation = useMutation({
    mutationFn: (data) => workflowsApi.create(data),
    onSuccess: (res) => {
      toast.success('Workflow created!')
      navigate(`/workflows`)
    },
    onError: () => toast.error('Failed to create workflow'),
  })
  
  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...f.steps, { step_order: f.steps.length + 1, agent_id: '', input_mapping: {} }]
    }))
  }
  
  const removeStep = (index) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== index)
    }))
  }
  
  const updateStep = (index, field, value) => {
    setForm(f => ({
      ...f,
      steps: f.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }))
  }
  
  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }
  
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <button onClick={() => navigate('/workflows')} className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        <ChevronLeft size={16} /> Back
      </button>
      
      <h1 className="text-xl font-bold text-gray-900 mb-6">Create New Workflow</h1>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5 space-y-4">
          <input
            className="input"
            placeholder="Workflow name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <textarea
            className="input min-h-[80px]"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="input"
            value={form.schedule_type}
            onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
          >
            <option value="manual">Manual (run on demand)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">Workflow Steps</h2>
            <button type="button" onClick={addStep} className="text-sm text-brand-600 flex items-center gap-1">
              <Plus size={14} /> Add step
            </button>
          </div>
          
          <div className="space-y-3">
            {form.steps.map((step, index) => (
              <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <select
                    className="input w-full"
                    value={step.agent_id}
                    onChange={(e) => updateStep(index, 'agent_id', parseInt(e.target.value))}
                    required
                  >
                    <option value="">Select agent...</option>
                    {agents?.agents?.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
                {form.steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(index)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {form.steps.length === 0 && (
            <p className="text-center text-gray-400 py-4">Add at least one step</p>
          )}
        </div>
        
        <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full py-2.5">
          {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
        </button>
      </form>
    </div>
  )
}