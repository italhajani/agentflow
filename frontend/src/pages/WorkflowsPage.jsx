import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, History, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { workflowsApi } from '../lib/api'  // You'll need to add this to api.js

export default function WorkflowsPage() {
  const navigate = useNavigate()
  
  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => workflowsApi.list().then(r => r.data),
  })
  
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 text-sm">Multi-step AI automations</p>
        </div>
        <button 
          onClick={() => navigate('/workflows/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Workflow
        </button>
      </div>
      
      {/* Simple list for now */}
      <div className="space-y-3">
        {data?.workflows?.map(wf => (
          <div key={wf.id} className="card p-4 flex justify-between items-center">
            <div>
              <h3 className="font-medium">{wf.name}</h3>
              <p className="text-xs text-gray-500">{wf.steps?.length || 0} steps · {wf.schedule_type}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost p-2" onClick={() => navigate(`/workflows/${wf.id}/run`)}>
                <Play size={16} />
              </button>
              <button className="btn-ghost p-2" onClick={() => navigate(`/workflows/${wf.id}/history`)}>
                <History size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}