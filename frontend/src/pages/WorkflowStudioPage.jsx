import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Bot, Play, Save, Sparkles, MessageSquare, X, Send, Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// Custom node component for agents
function AgentNode({ data, selected }) {
  return (
    <div className={clsx(
      'px-4 py-3 rounded-xl border-2 bg-white shadow-md min-w-[180px] transition-all',
      selected ? 'border-primary-500 shadow-lg' : 'border-slate-200 hover:border-primary-300'
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Bot size={16} className={data.status === 'running' ? 'text-primary-500 animate-pulse' : 'text-primary-500'} />
        <span className="font-semibold text-slate-800 text-sm">{data.label}</span>
      </div>
      {data.role && (
        <p className="text-xs text-slate-500 truncate">{data.role}</p>
      )}
      {data.duration && (
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <span>⏱️</span> {data.duration}
        </p>
      )}
    </div>
  )
}

const nodeTypes = { agent: AgentNode }

// Chat message component
function ChatMessage({ message, onAction }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={clsx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-primary-600" />
        </div>
      )}
      <div className={clsx(
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
        isUser
          ? 'bg-primary-500 text-white rounded-br-none'
          : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
      )}>
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.actions && (
          <div className="flex gap-2 mt-3">
            {message.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onAction?.(action)}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-slate-600" />
        </div>
      )}
    </div>
  )
}

function WorkflowStudioContent() {
  const { workflowId } = useParams()
  const navigate = useNavigate()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI workflow builder. 🚀\n\nDescribe what you want to automate, and I'll help you build a visual workflow with agents.\n\n**Examples:**\n• 'I need to scrape product prices from 5 websites daily and email me if any drop below $100'\n• 'Monitor Twitter for my brand, summarize mentions, and post insights to Slack'\n• 'Every morning, research AI news, write a summary, and save to Notion'\n\nTry describing your task!"
    }
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [workflowName, setWorkflowName] = useState('Untitled Workflow')
  const [editingName, setEditingName] = useState(false)
  const chatEndRef = useRef(null)

  // Load existing workflow if editing
  const { data: workflow, refetch } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => api.get(`/workflows/${workflowId}`).then(r => r.data),
    enabled: !!workflowId && workflowId !== 'new',
    onSuccess: (data) => {
      setWorkflowName(data.name)
      // Convert workflow steps to nodes and edges
      const newNodes = (data.steps || []).map((step, idx) => ({
        id: `node-${step.id || idx}`,
        type: 'agent',
        position: { x: 100 + idx * 250, y: 150 },
        data: {
          label: step.agent_name || `Step ${idx + 1}`,
          role: step.custom_instructions || 'Agent',
        },
      }))
      const newEdges = []
      for (let i = 0; i < newNodes.length - 1; i++) {
        newEdges.push({
          id: `edge-${i}`,
          source: newNodes[i].id,
          target: newNodes[i + 1].id,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#34eb6e', strokeWidth: 2 },
        })
      }
      setNodes(newNodes)
      setEdges(newEdges)
    }
  })

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds))
  }, [setEdges])

  const addAgentNode = useCallback(() => {
    const newNodeId = `node-${nodes.length + 1}`
    const newNode = {
      id: newNodeId,
      type: 'agent',
      position: { x: 100 + nodes.length * 250, y: 150 },
      data: {
        label: 'New Agent',
        role: 'Click to configure',
      },
    }
    setNodes((nds) => [...nds, newNode])
    
    // Connect previous node to new node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1]
      setEdges((eds) => [...eds, {
        id: `edge-${edges.length + 1}`,
        source: lastNode.id,
        target: newNodeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#34eb6e', strokeWidth: 2 },
      }])
    }
  }, [nodes, setNodes, setEdges, edges.length])

  const generateWorkflow = async (description) => {
    setIsGenerating(true)
    setChatMessages(prev => [...prev, { role: 'user', content: description }])
    setChatInput('')
    
    try {
      const res = await api.post('/workflows/generate-from-description', { description })
      const workflowId = res.data.workflow_id
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "✨ I'm generating your workflow now. This may take 20-30 seconds...",
      }])
      
      // Poll for completion
      let attempts = 0
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          const workflowRes = await api.get(`/workflows/${workflowId}`)
          if (workflowRes.data.name !== "Generating...") {
            clearInterval(pollInterval)
            setWorkflowName(workflowRes.data.name)
            
            // Convert to nodes and edges
            const newNodes = (workflowRes.data.steps || []).map((step, idx) => ({
              id: `node-${step.id || idx}`,
              type: 'agent',
              position: { x: 100 + idx * 250, y: 150 },
              data: {
                label: step.agent_name || `Step ${idx + 1}`,
                role: step.custom_instructions || workflowRes.data.description?.slice(0, 60),
              },
            }))
            const newEdges = []
            for (let i = 0; i < newNodes.length - 1; i++) {
              newEdges.push({
                id: `edge-${i}`,
                source: newNodes[i].id,
                target: newNodes[i + 1].id,
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: '#34eb6e', strokeWidth: 2 },
              })
            }
            setNodes(newNodes)
            setEdges(newEdges)
            
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ Workflow "${workflowRes.data.name}" is ready!\n\n**Steps:** ${newNodes.length} agents connected in sequence.\n\nYou can now:\n• Run the workflow\n• Add more agents\n• Edit existing agents\n• Connect them differently`,
              actions: [
                { label: 'Run Workflow', action: 'run' },
                { label: 'Add Agent', action: 'add' }
              ]
            }])
            setIsGenerating(false)
          }
        } catch (err) {
          if (attempts > 60) {
            clearInterval(pollInterval)
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: "⚠️ Workflow generation is taking longer than expected. You can continue building manually or try again.",
            }])
            setIsGenerating(false)
          }
        }
      }, 2000)
      
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${err.response?.data?.detail || err.message}. Please try again.`,
      }])
      setIsGenerating(false)
    }
  }

  const saveWorkflow = async () => {
    if (!workflowId || workflowId === 'new') {
      // Create new workflow
      const payload = {
        name: workflowName,
        description: chatMessages.find(m => m.role === 'assistant' && m.content.includes('✅'))?.content.slice(0, 200) || 'AI-generated workflow',
        steps: nodes.map((node, idx) => ({
          step_order: idx + 1,
          agent_id: null, // Will need to create agents first
          input_mapping: { task: idx === 0 ? "{{input}}" : "{{previous.result}}" },
        })),
      }
      try {
        const res = await api.post('/workflows/', payload)
        toast.success('Workflow saved!')
        navigate(`/workflows/${res.data.id}`)
      } catch (err) {
        toast.error('Failed to save workflow')
      }
    } else {
      // Update existing
      toast.success('Workflow updated')
    }
  }

  const handleChatSubmit = (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isGenerating) return
    generateWorkflow(chatInput.trim())
  }

  const handleAction = (action) => {
    if (action === 'run') {
      toast.success('Running workflow...')
    } else if (action === 'add') {
      addAgentNode()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/workflows')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={18} />
          </button>
          {editingName ? (
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="text-lg font-semibold px-2 py-1 border border-primary-500 rounded-lg focus:outline-none"
              autoFocus
            />
          ) : (
            <h1 className="text-lg font-semibold cursor-pointer" onClick={() => setEditingName(true)}>
              {workflowName}
            </h1>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={addAgentNode}
            className="btn-secondary text-sm flex items-center gap-1"
            data-tooltip="Add a new agent to the workflow"
          >
            <Plus size={14} /> Add Agent
          </button>
          <button
            onClick={saveWorkflow}
            className="btn-primary text-sm flex items-center gap-1"
            data-tooltip="Save workflow"
          >
            <Save size={14} /> Save
          </button>
          <button
            onClick={() => toast.success('Running workflow...')}
            className="btn-primary text-sm flex items-center gap-1"
            data-tooltip="Run the entire workflow"
          >
            <Play size={14} fill="currentColor" /> Run
          </button>
        </div>
      </div>

      {/* Main content: Flow + Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-slate-50"
          >
            <Background color="#e2e8f0" gap={16} />
            <Controls />
            <MiniMap />
            <Panel position="top-left" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm px-3 py-1.5 text-xs text-slate-500">
              Drag to connect agents
            </Panel>
          </ReactFlow>
        </div>

        {/* Chat Panel */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare size={18} className="text-primary-500" />
            <span className="font-semibold text-slate-800">AI Assistant</span>
            <span className="text-xs text-slate-400 ml-auto">Describe your automation</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} onAction={handleAction} />
            ))}
            {isGenerating && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <Loader2 size={14} className="animate-spin text-primary-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200" />
                    <span className="text-sm text-slate-500 ml-1">Planning workflow...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <textarea
                className="flex-1 input min-h-[60px] resize-none text-sm"
                placeholder="Describe what you want to automate..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleChatSubmit(e)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isGenerating}
                className="btn-primary self-end px-3 py-2"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-2">
              Ctrl+Enter to send
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function WorkflowStudioPage() {
  return (
    <ReactFlowProvider>
      <WorkflowStudioContent />
    </ReactFlowProvider>
  )
}