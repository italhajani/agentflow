import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import api from '../lib/api'
import {
  Sparkles, Send, Loader2, ChevronLeft, Zap,
  Play, CheckCircle2, AlertCircle, Clock, Bot
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ── Custom Node component ─────────────────────────────────────────────────── */
const NODE_COLORS = {
  trigger:   { border: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', icon: '⚡' },
  agent:     { border: '#a855f7', bg: 'rgba(168,85,247,0.1)', icon: '🤖' },
  tool:      { border: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '🔧' },
  output:    { border: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '📤' },
  condition: { border: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: '🔀' },
  default:   { border: '#8496b0', bg: 'rgba(132,150,176,0.1)', icon: '📦' },
}

function WorkflowNode({ data, selected }) {
  const style = NODE_COLORS[data.nodeType] || NODE_COLORS.default

  return (
    <div
      style={{
        minWidth: 180,
        background: 'var(--bg-elevated)',
        border: `1.5px solid ${selected ? style.border : style.border + '60'}`,
        borderRadius: 14,
        boxShadow: selected
          ? `0 0 0 2px ${style.border}30, 0 8px 32px rgba(0,0,0,0.5)`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.2s ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: style.border, border: '2px solid var(--bg-card)', width: 10, height: 10, top: -5 }}
      />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: style.bg, border: `1px solid ${style.border}30` }}
          >
            {data.icon || style.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{data.label}</div>
            <div className="text-xs" style={{ color: style.border + 'cc', fontSize: '10px' }}>
              {data.nodeType || 'agent'}
            </div>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div className="text-xs text-surface-400 leading-relaxed" style={{ fontSize: '11px' }}>
            {data.description}
          </div>
        )}

        {/* Model badge */}
        {data.model && (
          <div
            className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#8496b0', fontSize: '10px' }}
          >
            🧠 {data.model}
          </div>
        )}

        {/* Status indicator */}
        {data.status && (
          <div className="mt-2 flex items-center gap-1">
            {data.status === 'done' && <span className="badge-green" style={{ fontSize: '10px' }}>✓ done</span>}
            {data.status === 'running' && <span className="badge-blue" style={{ fontSize: '10px' }}>● running</span>}
            {data.status === 'pending' && <span className="badge-gray" style={{ fontSize: '10px' }}>○ pending</span>}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: style.border, border: '2px solid var(--bg-card)', width: 10, height: 10, bottom: -5 }}
      />
    </div>
  )
}

const nodeTypes = { workflowNode: WorkflowNode }

/* ── Build flow from AI plan ────────────────────────────────────────────────── */
function planToFlow(plan) {
  if (!plan?.steps?.length) return { nodes: [], edges: [] }

  const nodes = []
  const edges = []

  // Determine layout
  const totalSteps = plan.steps.length
  const cols = Math.min(3, totalSteps)
  const colWidth = 240
  const rowHeight = 180

  plan.steps.forEach((step, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = col * colWidth + (row % 2 === 0 ? 0 : colWidth / 2)
    const y = row * rowHeight

    let nodeType = 'agent'
    if (step.type === 'external_api') nodeType = 'output'
    if (i === 0) nodeType = 'trigger'

    const agentSpec = step.agent_to_create || {}
    const tools = agentSpec.tools || []

    nodes.push({
      id: String(step.step_order),
      type: 'workflowNode',
      position: { x, y },
      data: {
        label: agentSpec.name || step.description || `Step ${step.step_order}`,
        description: step.description,
        nodeType,
        icon: nodeType === 'trigger' ? '⚡' : nodeType === 'output' ? '📤' : '🤖',
        model: agentSpec.model_name,
        tools,
        status: 'pending',
      },
    })

    // Edges from depends_on
    if (step.depends_on?.length) {
      step.depends_on.forEach((dep) => {
        edges.push({
          id: `e${dep}-${step.step_order}`,
          source: String(dep),
          target: String(step.step_order),
          animated: true,
          style: { stroke: '#0ea5e9', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
        })
      })
    } else if (i > 0) {
      // Default: linear connection
      edges.push({
        id: `e${i - 1}-${i}`,
        source: String(i),
        target: String(step.step_order),
        animated: true,
        style: { stroke: '#0ea5e9', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
      })
    }
  })

  return { nodes, edges }
}

/* ── Chat messages ──────────────────────────────────────────────────────────── */
function ChatMessage({ msg }) {
  return (
    <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {msg.role === 'assistant' && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #7e22ce)' }}
        >
          <Zap size={12} className="text-white" />
        </div>
      )}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed"
        style={
          msg.role === 'user'
            ? { background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.3)', color: '#e0f2fe', borderRadius: '18px 18px 4px 18px' }
            : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '18px 18px 18px 4px' }
        }
      >
        {msg.content}
      </div>
    </div>
  )
}

/* ── EXAMPLE TASKS ─────────────────────────────────────────────────────────── */
const EXAMPLES = [
  'Monitor competitor pricing daily and email me if changes',
  'Scrape AI news every morning and post a summary to Slack',
  'Research a topic, write a blog post, and schedule it',
  'Analyze sales data and generate a weekly insight report',
]

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function WorkflowGeneratorPage() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const initialTask   = params.get('task') || ''

  const [description, setDescription] = useState(initialTask)
  const [plan, setPlan]               = useState(null)
  const [workflowName, setName]       = useState('')
  const [messages, setMessages]       = useState([
    {
      role: 'assistant',
      content: "Hi! I'm FlowHolt AI. Describe any repetitive task and I'll design a multi-agent workflow for you — visually, as a flowchart.\n\nTry: 'Every morning, research AI news and send me a digest email'",
    },
  ])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#0ea5e9', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' } }, eds)), [])

  // Auto-submit if task came from landing page
  useEffect(() => {
    if (initialTask) handleGenerate(initialTask)
  }, [])

  const generateMutation = useMutation({
    mutationFn: (desc) => api.post('/workflows/generate-from-description', { description: desc }),
    onSuccess: (res) => {
      const wfId = res.data.workflow_id

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `⏳ Planning your workflow (ID: ${wfId})…\n\nBuilding the flowchart — this takes about 15-30 seconds.`,
      }])

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const wfRes = await api.get(`/workflows/${wfId}`)
          const wf = wfRes.data
          if (wf.name && wf.name !== 'Generating...') {
            clearInterval(poll)
            setName(wf.name)

            // Rebuild plan from steps to render flow
            const fakePlan = {
              steps: wf.steps.map((s, i) => ({
                step_order: s.step_order || i + 1,
                type: 'agent',
                description: s.custom_instructions || `Step ${i + 1}`,
                depends_on: i > 0 ? [i] : [],
                agent_to_create: { name: s.agent_name || `Agent ${i + 1}`, model_name: 'llama3-8b-8192' },
              })),
            }
            setPlan(fakePlan)
            const { nodes: n, edges: e } = planToFlow(fakePlan)
            setNodes(n)
            setEdges(e)

            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: `✅ Workflow ready!\n\n**"${wf.name}"**\n${wf.steps?.length || 0} agents connected.\n\nYou can now edit the nodes, rearrange them, or save the workflow.`,
            }])
            toast.success('Workflow generated!')
          }
        } catch (_) {}
      }, 3000)

      setTimeout(() => clearInterval(poll), 120_000)
    },
    onError: (err) => {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `❌ Something went wrong: ${err.response?.data?.detail || err.message}\n\nMake sure your GROQ_API_KEY is set in the backend.`,
      }])
      toast.error('Generation failed')
    },
  })

  const handleGenerate = (text) => {
    const task = (typeof text === 'string' ? text : description).trim()
    if (!task) return
    setMessages((prev) => [...prev, { role: 'user', content: task }])
    setDescription('')
    setNodes([])
    setEdges([])
    setPlan(null)
    generateMutation.mutate(task)
  }

  const showFlow = nodes.length > 0

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── LEFT PANEL: Chat ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col w-full md:w-[380px] flex-shrink-0"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <button onClick={() => navigate('/workflows')} className="btn-ghost btn-icon-sm">
            <ChevronLeft size={18} />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #7e22ce)' }}
          >
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">AI Workflow Builder</div>
            <div className="text-xs text-surface-500">Powered by Groq · llama3-70b</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}

          {generateMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #7e22ce)' }}
              >
                <Loader2 size={12} className="text-white animate-spin" />
              </div>
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                  <span className="text-xs text-surface-400 ml-1">Planning workflow…</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Example chips */}
        {!generateMutation.isPending && messages.length <= 1 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setDescription(ex); }}
                className="text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)', color: '#38bdf8' }}
              >
                {ex.length > 42 ? ex.slice(0, 42) + '…' : ex}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex gap-2">
            <textarea
              className="input flex-1 text-sm resize-none"
              style={{ minHeight: 60, maxHeight: 120, borderRadius: 12 }}
              placeholder="Describe your automation task…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={generateMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate()
              }}
            />
            <button
              onClick={() => handleGenerate()}
              disabled={!description.trim() || generateMutation.isPending}
              className="btn-primary btn-icon flex-shrink-0 self-end"
              title="Generate (Ctrl+Enter)"
            >
              {generateMutation.isPending
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
          <p className="text-xs text-surface-600 mt-1.5">Ctrl+Enter to generate</p>
        </div>
      </div>

      {/* ── RIGHT PANEL: Flow canvas ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Canvas header */}
        {showFlow && (
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={15} style={{ color: '#0ea5e9' }} />
              <div>
                <div className="text-sm font-semibold text-white">{workflowName || 'Generated Workflow'}</div>
                <div className="text-xs text-surface-500">{nodes.length} agents · {edges.length} connections</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/workflows')}
                className="btn-secondary btn-sm"
              >
                View all workflows
              </button>
              <button
                onClick={() => navigate('/workflows')}
                className="btn-primary btn-sm"
              >
                <CheckCircle2 size={14} /> Save workflow
              </button>
            </div>
          </div>
        )}

        {/* Canvas */}
        {showFlow ? (
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.3}
              maxZoom={2}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: '#0ea5e9', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
              }}
            >
              <Background color="rgba(14,165,233,0.08)" gap={24} size={1} />
              <Controls />
              <MiniMap
                nodeColor={(n) => {
                  const t = n.data?.nodeType || 'default'
                  return NODE_COLORS[t]?.border || '#8496b0'
                }}
                style={{ background: 'var(--bg-card)' }}
              />
            </ReactFlow>
          </div>
        ) : (
          /* Empty canvas state */
          <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-card-2)' }}>
            <div
              className="absolute inset-0 bg-grid-pattern bg-grid opacity-100"
              style={{ maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)' }}
            />
            <div className="relative text-center max-w-sm mx-auto px-4">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}
              >
                <Sparkles size={36} style={{ color: 'rgba(14,165,233,0.5)' }} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Your workflow appears here</h3>
              <p className="text-sm text-surface-400 leading-relaxed">
                Describe your task on the left. The AI will build a visual flowchart of connected agents — drag and drop to rearrange.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { icon: Bot, label: 'AI agents', color: '#a855f7' },
                  { icon: Zap, label: 'Connections', color: '#0ea5e9' },
                  { icon: Play, label: 'Run ready', color: '#10b981' },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                  >
                    <f.icon size={18} className="mx-auto mb-1.5" style={{ color: f.color }} />
                    <div className="text-xs text-surface-400">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}