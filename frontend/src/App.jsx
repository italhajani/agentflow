import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { useAuthStore } from './store/authStore'
import AppLayout from './components/layout/AppLayout'

// Pages
import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import DashboardPage   from './pages/DashboardPage'
import AgentsPage      from './pages/AgentsPage'
import CreateAgentPage from './pages/CreateAgentPage'
import AgentDetailPage from './pages/AgentDetailPage'
import RunTaskPage     from './pages/RunTaskPage'
import HistoryPage     from './pages/HistoryPage'
import TemplatesPage   from './pages/TemplatesPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

// ── Route guards ──────────────────────────────────────────────────────────────
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
            style: { fontSize: '14px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
            success: { iconTheme: { primary: '#4f46e5', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login"    element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="/templates" element={<TemplatesPage />} />

          {/* Protected — wrapped in sidebar layout */}
          <Route path="/" element={<Protected><AppLayout /></Protected>}>
            <Route path="dashboard"                            element={<DashboardPage />} />
            <Route path="agents"                               element={<AgentsPage />} />
            <Route path="agents/new"                           element={<CreateAgentPage />} />
            <Route path="agents/:agentId"                      element={<AgentDetailPage />} />
            <Route path="agents/:agentId/run"                  element={<RunTaskPage />} />
            <Route path="agents/:agentId/history"              element={<HistoryPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
