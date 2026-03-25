import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'
import { Sparkles, Send, Loader2, ChevronLeft, Bot, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function WorkflowGeneratorPage() {
  const navigate = useNavigate()
  const [description, setDescription] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! Describe the task you want to automate. I'll build a workflow for you — for free! 🚀\n\nFor example:\n- 'Scrape product prices from 5 websites daily and email me if any drop below $100'\n- 'Monitor Twitter for my brand, summarize mentions, and post insights to Slack'\n- 'Every morning, research AI news, write a summary, and post to LinkedIn'" }
  ])
  
  const generateMutation = useMutation({
    mutationFn: (desc) => api.post('/workflows/generate-from-description', { description: desc }),
    onSuccess: (res) => {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: `⏳ Workflow generation started!\n\n**ID:** ${res.data.workflow_id}\n\nAI is planning your workflow in the background. This may take 30-60 seconds.\n\nRefresh the Workflows page in a moment to see your new workflow.` }
      ])
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const workflowRes = await api.get(`/workflows/${res.data.workflow_id}`)
          if (workflowRes.data.name !== "Generating...") {
            clearInterval(pollInterval)
            setMessages(prev => [...prev, 
              { role: 'assistant', content: `✅ Workflow ready!\n\n**Name:** ${workflowRes.data.name}\n**Steps:** ${workflowRes.data.steps?.length || 0} steps\n\n[View in Workflows](/workflows)` }
            ])
            toast.success('Workflow generated!')
            setTimeout(() => navigate('/workflows'), 2000)
          }
        } catch (e) {
          // Still generating
        }
      }, 3000)
      
      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(pollInterval), 120000)
    },
    onError: (err) => {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: `❌ Sorry, something went wrong: ${err.response?.data?.detail || err.message}. Please try again.` }
      ])
      toast.error('Failed to generate workflow')
    }
  })
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!description.trim()) return
    
    setMessages(prev => [...prev, { role: 'user', content: description }])
    generateMutation.mutate(description)
    setDescription('')
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/workflows')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">AI Workflow Builder</h1>
            <p className="text-xs text-gray-500">Describe your task — I'll build it</p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={clsx(
              'flex gap-3',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="text-brand-600" />
              </div>
            )}
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
              )}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}
        
        {generateMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
              <Loader2 size={14} className="animate-spin text-brand-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce delay-200" />
                <span className="text-sm text-gray-500 ml-1">Planning your workflow...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="border-t border-gray-100 bg-white sticky bottom-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 flex gap-3">
          <textarea
            className="flex-1 input min-h-[60px] resize-none"
            placeholder="Describe the task you want to automate..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={generateMutation.isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit(e)
              }
            }}
          />
          <button
            type="submit"
            disabled={!description.trim() || generateMutation.isPending}
            className="btn-primary self-end flex items-center gap-2"
          >
            <Send size={16} />
            Send
          </button>
        </form>
        <p className="text-xs text-center text-gray-400 pb-3">Ctrl+Enter to send</p>
      </div>
    </div>
  )
}