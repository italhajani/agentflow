import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'

// Pages
import LandingPage           from './pages/LandingPage'
import LoginPage             from './pages/LoginPage'
import RegisterPage          from './pages/RegisterPage'
import DashboardPage         from './pages/DashboardPage'
import AgentsPage            from './pages/AgentsPage'
import CreateAgentPage       from './pages/CreateAgentPage'
import AgentDetailPage       from './pages/AgentDetailPage'
import RunTaskPage           from './pages/RunTaskPage'
import HistoryPage           from './pages/HistoryPage'
import TemplatesPage         from './pages/TemplatesPage'
import WorkflowsPage         from './pages/WorkflowsPage'
import CreateWorkflowPage    from './pages/CreateWorkflowPage'
import WorkflowGeneratorPage from './pages/WorkflowGeneratorPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

// ── Guards ────────────────────────────────────────────────────────────────────
function Protected({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function GuestOnly({ children }) {
  const user = useAuthStore((s) => s.user)
  return !user ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontSize: '13px',
              borderRadius: '12px',
              background: '#161b27',
              color: '#f0f4f8',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            },
            success: { iconTheme: { primary: '#0ea5e9', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public landing */}
          <Route path="/" element={<GuestOnly><LandingPage /></GuestOnly>} />

          {/* Auth */}
          <Route path="/login"    element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

          {/* Templates — public (works logged in or out) */}
          <Route path="/templates" element={<TemplatesPage />} />

          {/* Protected — inside sidebar layout */}
          <Route path="/" element={<Protected><AppLayout /></Protected>}>
            <Route path="dashboard"                  element={<DashboardPage />} />
            <Route path="agents"                     element={<AgentsPage />} />
            <Route path="agents/new"                 element={<CreateAgentPage />} />
            <Route path="agents/:agentId"            element={<AgentDetailPage />} />
            <Route path="agents/:agentId/run"        element={<RunTaskPage />} />
            <Route path="agents/:agentId/history"    element={<HistoryPage />} />
            <Route path="workflows"                  element={<WorkflowsPage />} />
            <Route path="workflows/new"              element={<CreateWorkflowPage />} />
            <Route path="workflows/generate"         element={<WorkflowGeneratorPage />} />
          </Route>

          {/* Catch-all → landing or dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}