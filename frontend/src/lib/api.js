import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Request: attach Bearer token ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: auto-refresh on 401 ────────────────────────────────────────────
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing    = true

      try {
        const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        })
        localStorage.setItem('access_token',  data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`
        processQueue(null, data.access_token)
        return api(original)
      } catch (err) {
        processQueue(err, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register:  (data) => api.post('/auth/register',  data),
  login:     (data) => api.post('/auth/login',     data),
  refresh:   (data) => api.post('/auth/refresh',   data),
  me:        ()     => api.get('/auth/me'),
  logout:    ()     => api.post('/auth/logout'),
}

// ── Agents ────────────────────────────────────────────────────────────────────
export const agentsApi = {
  list:   (params) => api.get('/agents/',         { params }),
  create: (data)   => api.post('/agents/',        data),
  get:    (id)     => api.get(`/agents/${id}`),
  update: (id, d)  => api.patch(`/agents/${id}`, d),
  delete: (id)     => api.delete(`/agents/${id}`),
}

// ── Runs ──────────────────────────────────────────────────────────────────────
export const runsApi = {
  run:      (agentId, data)          => api.post(`/agents/${agentId}/runs/`,           data),
  get:      (agentId, runId)         => api.get(`/agents/${agentId}/runs/${runId}`),
  list:     (agentId, params)        => api.get(`/agents/${agentId}/runs/`,            { params }),
  feedback: (agentId, runId, data)   => api.post(`/agents/${agentId}/runs/${runId}/feedback`, data),
}

// ── Templates ─────────────────────────────────────────────────────────────────
export const templatesApi = {
  list:  ()   => api.get('/templates/'),
  get:   (id) => api.get(`/templates/${id}`),
  clone: (id) => api.post(`/templates/${id}/clone`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard/'),
}

export default api
