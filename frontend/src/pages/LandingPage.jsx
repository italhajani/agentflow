import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, ArrowRight, Workflow, Bot, Sparkles, Check,
  Play, GitBranch, Cpu, Globe, Shield, BarChart3,
  ChevronRight, Github, Twitter, ExternalLink
} from 'lucide-react'

/* ── Scroll-reveal hook ─────────────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          observer.unobserve(e.target)
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

/* ── Animated placeholder ───────────────────────────────────────────────── */
const PLACEHOLDERS = [
  'Every morning, scrape top AI news and send me a digest...',
  'Monitor our competitors pricing and alert me if they change...',
  'Summarize all my unread emails and draft replies...',
  'Research trending topics and write a LinkedIn post...',
  'Pull weekly sales data and build a report with insights...',
]

function AnimatedInput({ onSubmit }) {
  const [value, setValue]       = useState('')
  const [placeholder, setPH]    = useState(PLACEHOLDERS[0])
  const [phIdx, setPhIdx]       = useState(0)
  const [isTyping, setTyping]   = useState(true)
  const [charIdx, setCharIdx]   = useState(0)
  const timerRef                = useRef(null)

  /* Cycle placeholder typing animation */
  useEffect(() => {
    if (value) return // Stop when user is typing
    if (isTyping) {
      if (charIdx < PLACEHOLDERS[phIdx].length) {
        timerRef.current = setTimeout(() => setCharIdx((c) => c + 1), 38)
      } else {
        timerRef.current = setTimeout(() => setTyping(false), 2200)
      }
    } else {
      if (charIdx > 0) {
        timerRef.current = setTimeout(() => setCharIdx((c) => c - 1), 18)
      } else {
        const next = (phIdx + 1) % PLACEHOLDERS.length
        setPhIdx(next)
        setTyping(true)
      }
    }
    return () => clearTimeout(timerRef.current)
  }, [charIdx, isTyping, phIdx, value])

  useEffect(() => {
    if (!value) setPH(PLACEHOLDERS[phIdx].slice(0, charIdx))
  }, [charIdx, phIdx, value])

  const handleKey = (e) => {
    if (e.key === 'Enter' && value.trim()) onSubmit(value.trim())
  }

  return (
    <div className="relative w-full">
      <div
        className="relative rounded-2xl p-[1px] transition-all duration-300"
        style={{
          background: value
            ? 'linear-gradient(135deg, rgba(14,165,233,0.6), rgba(168,85,247,0.4))'
            : 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(168,85,247,0.15))',
        }}
      >
        <div className="relative rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
          <Sparkles
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400"
            style={{ pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder + (value ? '' : '|')}
            className="w-full bg-transparent text-sm text-white py-4 pl-11 pr-36 outline-none"
            style={{
              caretColor: '#0ea5e9',
            }}
          />
          <button
            onClick={() => value.trim() && onSubmit(value.trim())}
            disabled={!value.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 btn-primary btn-sm flex items-center gap-2"
            style={{ borderRadius: '10px' }}
          >
            Build workflow <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-2.5 text-center">
        Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Enter</kbd> or click to generate your AI workflow instantly
      </p>
    </div>
  )
}

/* ── Feature cards ──────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: GitBranch,
    color: '#0ea5e9',
    title: 'Visual Workflow Builder',
    desc: 'Drag-and-drop nodes to connect AI agents. Build complex automation pipelines visually — no code needed.',
  },
  {
    icon: Cpu,
    color: '#a855f7',
    title: 'Multi-Agent Orchestration',
    desc: 'Chain LangChain, CrewAI, and LangGraph agents together. Each agent specializes in a single task.',
  },
  {
    icon: Sparkles,
    color: '#f59e0b',
    title: 'AI Workflow Generation',
    desc: 'Describe your task in plain English. Our AI plans the optimal workflow and builds the flowchart for you.',
  },
  {
    icon: Globe,
    color: '#10b981',
    title: 'Free AI Models',
    desc: 'Powered by Groq, Llama 3, and open-source LLMs. Zero API costs on the free tier.',
  },
  {
    icon: BarChart3,
    color: '#0ea5e9',
    title: 'Run History & Analytics',
    desc: 'Track every execution. See durations, outputs, error logs, and performance trends at a glance.',
  },
  {
    icon: Shield,
    color: '#a855f7',
    title: 'Secure & Private',
    desc: 'Your workflows and data stay in your workspace. JWT auth, rate limiting, and isolated execution.',
  },
]

/* ── How it works steps ─────────────────────────────────────────────────── */
const STEPS = [
  { n: '01', title: 'Describe your task', desc: 'Type your repetitive task in plain language. Our AI understands context and intent.' },
  { n: '02', title: 'Review the flowchart', desc: 'A visual workflow appears instantly — agents connected by edges, ready to execute.' },
  { n: '03', title: 'Deploy & automate', desc: 'Run on demand or schedule it. Watch your AI workforce handle the task end-to-end.' },
]

/* ── Social proof numbers ───────────────────────────────────────────────── */
const STATS = [
  { value: '6+',   label: 'Agent templates' },
  { value: '100%', label: 'Open source models' },
  { value: '$0',   label: 'Cost to start' },
  { value: '∞',    label: 'Workflows possible' },
]

/* ── Floating workflow preview card ──────────────────────────────────────── */
function FlowPreviewCard() {
  const nodes = [
    { id: 'trigger', label: '⚡ Trigger', sub: 'Schedule: 9AM daily', x: 90, y: 10, color: '#0ea5e9' },
    { id: 'researcher', label: '🔍 Researcher', sub: 'Groq · llama3-70b', x: 10, y: 130, color: '#a855f7' },
    { id: 'writer', label: '✍️ Writer', sub: 'Groq · llama3-8b', x: 170, y: 130, color: '#10b981' },
    { id: 'output', label: '📧 Email Send', sub: 'Gmail API', x: 90, y: 248, color: '#f59e0b' },
  ]
  const edges = [
    { x1: 150, y1: 56, x2: 95, y2: 148 },
    { x1: 150, y1: 56, x2: 225, y2: 148 },
    { x1: 95, y1: 192, x2: 160, y2: 266 },
    { x1: 225, y1: 192, x2: 195, y2: 266 },
  ]

  return (
    <div
      className="relative w-full max-w-sm mx-auto rounded-2xl p-4 animate-float"
      style={{
        background: 'var(--bg-card-2)',
        border: '1px solid rgba(14,165,233,0.2)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(14,165,233,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {['#ef4444','#f59e0b','#10b981'].map((c) => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <span className="text-xs text-surface-400 font-medium ml-1">Daily Digest Workflow</span>
        </div>
        <span className="badge-green text-xs">● Active</span>
      </div>

      {/* SVG flow */}
      <div className="relative" style={{ height: 320 }}>
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          {edges.map((e, i) => (
            <line
              key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="rgba(14,165,233,0.35)" strokeWidth="1.5" strokeDasharray="4 3"
            />
          ))}
        </svg>
        {nodes.map((n) => (
          <div
            key={n.id}
            className="absolute rounded-xl px-3 py-2 text-left"
            style={{
              left: `${n.x}px`, top: `${n.y}px`, width: 120,
              background: 'var(--bg-elevated)',
              border: `1px solid ${n.color}30`,
              boxShadow: `0 0 12px ${n.color}20`,
            }}
          >
            <div className="text-xs font-semibold text-white leading-tight">{n.label}</div>
            <div className="text-xs mt-0.5" style={{ color: n.color, fontSize: '10px' }}>{n.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Landing Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate()
  useReveal()

  const handleBuild = (task) => {
    navigate(`/register?task=${encodeURIComponent(task)}`)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)', overflow: 'hidden' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #7e22ce)', boxShadow: '0 0 16px rgba(14,165,233,0.4)' }}
          >
            <Zap size={15} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">FlowHolt</span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {['Features', 'How it works', 'Pricing'].map((item) => (
            <button
              key={item}
              onClick={() => document.getElementById(item.toLowerCase().replace(' ', '-'))?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm text-surface-300 hover:text-white transition-colors"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="btn-ghost btn-sm hidden sm:flex">
            Sign in
          </button>
          <button onClick={() => navigate('/register')} className="btn-primary btn-sm">
            Get started free
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center text-center overflow-hidden" style={{ minHeight: '100vh' }}>

        {/* Background glow orbs */}
        <div className="orb w-[600px] h-[600px] opacity-20 -top-32 left-1/2 -translate-x-1/2"
          style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />
        <div className="orb w-[400px] h-[400px] opacity-10 top-64 -left-32"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />
        <div className="orb w-[300px] h-[300px] opacity-10 top-48 -right-16"
          style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />

        {/* Grid background */}
        <div
          className="absolute inset-0 bg-grid-pattern bg-grid opacity-100"
          style={{ maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)' }}
        />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 mb-6 rounded-full px-4 py-1.5 text-xs font-medium"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#38bdf8' }}
          >
            <Sparkles size={12} />
            AI-powered workflow automation platform
            <ChevronRight size={12} />
          </div>

          {/* Headline */}
          <h1 className="font-bold leading-tight mb-6" style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}>
            Automate any task with{' '}
            <span className="gradient-text">AI agents</span>
            <br />
            you build visually
          </h1>

          <p className="text-surface-300 mb-10 mx-auto leading-relaxed" style={{ maxWidth: 560, fontSize: '1.05rem' }}>
            Describe your workflow in plain English. FlowHolt builds a visual flowchart of AI agents — connected, ready to execute, completely free.
          </p>

          {/* AI Input — the hero element */}
          <div className="w-full max-w-2xl mx-auto mb-8">
            <AnimatedInput onSubmit={handleBuild} />
          </div>

          {/* Checklist */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {['Free to start', 'No credit card', 'Open-source models', '6+ agent templates'].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-sm text-surface-400">
                <Check size={14} className="text-brand-400 flex-shrink-0" />
                {t}
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-xl py-4 px-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
              >
                <div className="text-2xl font-bold gradient-text-brand mb-0.5">{s.value}</div>
                <div className="text-xs text-surface-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Flow preview card */}
        <div className="relative z-10 mt-20 w-full max-w-sm mx-auto">
          <FlowPreviewCard />
          {/* Reflection blur */}
          <div
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-64 h-16 blur-3xl opacity-40"
            style={{ background: '#0ea5e9' }}
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal">
            <span className="badge-blue mb-4">How it works</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
              From description to automation<br />in 3 steps
            </h2>
            <p className="text-surface-300 max-w-md mx-auto">No code. No complex setup. Just describe what you want automated.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="reveal card p-6 relative overflow-hidden"
                style={{ '--delay': `${i * 0.15}s`, transitionDelay: `${i * 0.15}s` }}
              >
                <div
                  className="text-5xl font-bold mb-4 select-none"
                  style={{ color: 'rgba(14,165,233,0.12)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {s.n}
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-surface-300 leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight size={20} className="text-surface-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 relative">
        {/* Glow */}
        <div className="orb w-[500px] h-[500px] opacity-10 top-0 left-1/2 -translate-x-1/2"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16 reveal">
            <span className="badge-purple mb-4">Features</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
              Everything you need to build<br />an AI workforce
            </h2>
            <p className="text-surface-300 max-w-md mx-auto">Batteries included. Powered entirely by free and open-source AI models.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="reveal card p-5 hover:border-brand-500/25 transition-all duration-300 group"
                style={{ transitionDelay: `${(i % 3) * 0.1}s` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}25` }}
                >
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-surface-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKFLOW DEMO SECTION ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="reveal rounded-3xl p-8 md:p-12 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(168,85,247,0.06) 100%)',
              border: '1px solid rgba(14,165,233,0.2)',
            }}
          >
            <div className="orb w-72 h-72 opacity-15 -top-20 -right-20"
              style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 text-center md:text-left">
                <span className="badge-blue mb-4">Try it now</span>
                <h2 className="text-2xl md:text-3xl font-bold mb-4 mt-3">
                  Build your first workflow<br />in under a minute
                </h2>
                <p className="text-surface-300 mb-8 max-w-sm leading-relaxed">
                  Type any repetitive task — AI news, competitor monitoring, email management — and watch the workflow build itself.
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <button onClick={() => navigate('/register')} className="btn-primary btn-lg">
                    Start for free <ArrowRight size={16} />
                  </button>
                  <button onClick={() => navigate('/templates')} className="btn-secondary btn-lg">
                    Browse templates
                  </button>
                </div>
              </div>

              {/* Mini workflow nodes demo */}
              <div className="flex-shrink-0">
                <div className="flex flex-col items-center gap-2">
                  {[
                    { icon: '⚡', label: 'Trigger',    color: '#0ea5e9' },
                    { icon: '🔍', label: 'Research',   color: '#a855f7' },
                    { icon: '✍️', label: 'Write',       color: '#10b981' },
                    { icon: '📤', label: 'Send',        color: '#f59e0b' },
                  ].map((node, i) => (
                    <div key={node.label} className="flex flex-col items-center">
                      <div
                        className="flex items-center gap-3 rounded-xl px-4 py-2.5 w-44"
                        style={{
                          background: 'var(--bg-elevated)',
                          border: `1px solid ${node.color}30`,
                          boxShadow: `0 0 16px ${node.color}15`,
                        }}
                      >
                        <span className="text-lg">{node.icon}</span>
                        <div>
                          <div className="text-xs font-semibold text-white">{node.label}</div>
                          <div className="text-xs" style={{ color: node.color, fontSize: '10px' }}>Agent ready</div>
                        </div>
                        <Check size={12} className="ml-auto" style={{ color: node.color }} />
                      </div>
                      {i < 3 && (
                        <div className="w-px h-4" style={{ background: 'rgba(14,165,233,0.25)' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal">
            <span className="badge-green mb-4">Pricing</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">Simple, honest pricing</h2>
            <p className="text-surface-300">Start free. Scale as you grow.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="reveal card p-7">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-white mb-1">Free</h3>
                <div className="text-3xl font-bold text-white">$0<span className="text-base font-normal text-surface-400">/mo</span></div>
              </div>
              <ul className="space-y-2.5 mb-7">
                {['5 active agents', '10 runs/day', 'All 6 templates', 'Free AI models (Groq)', 'Basic analytics'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-surface-300">
                    <Check size={14} className="text-brand-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/register')} className="btn-secondary w-full">
                Get started free
              </button>
            </div>

            {/* Pro — coming soon */}
            <div
              className="reveal reveal-delay-1 p-7 rounded-2xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(168,85,247,0.06))',
                border: '1px solid rgba(14,165,233,0.25)',
                boxShadow: '0 0 40px rgba(14,165,233,0.1)',
              }}
            >
              <div
                className="absolute top-4 right-4 badge-purple text-xs"
              >
                Coming soon
              </div>
              <div className="mb-5">
                <h3 className="text-lg font-bold text-white mb-1">Pro</h3>
                <div className="text-3xl font-bold text-white">$12<span className="text-base font-normal text-surface-400">/mo</span></div>
              </div>
              <ul className="space-y-2.5 mb-7">
                {['Unlimited agents', 'Unlimited runs/day', 'GPT-4 & Claude models', 'Workflow scheduler', 'Priority support', 'Team collaboration'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-surface-300">
                    <Check size={14} className="text-accent-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <button disabled className="btn-accent w-full" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Notify me
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center reveal">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Ready to build your<br />
            <span className="gradient-text">AI workforce?</span>
          </h2>
          <p className="text-surface-300 mb-8 text-lg">It's free. No credit card. Start in 30 seconds.</p>
          <button onClick={() => navigate('/register')} className="btn-primary btn-xl">
            Build my first workflow <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="px-6 py-10" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #7e22ce)' }}
            >
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-bold text-white">FlowHolt</span>
            <span className="text-surface-500 text-sm ml-2">© 2025</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-surface-400">
            <a href="https://github.com" target="_blank" rel="noopener" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Github size={15} /> GitHub
            </a>
            <button onClick={() => navigate('/templates')} className="hover:text-white transition-colors">Templates</button>
            <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Sign in</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
