import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../lib/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,
      error:        null,

      // ── Login ────────────────────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await authApi.login({ email, password })
          localStorage.setItem('access_token',  data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          // fetch user profile
          const { data: user } = await authApi.me()
          set({ user, accessToken: data.access_token, refreshToken: data.refresh_token, isLoading: false })
          return { ok: true }
        } catch (err) {
          const msg = err.response?.data?.detail || 'Login failed'
          set({ isLoading: false, error: msg })
          return { ok: false, error: msg }
        }
      },

      // ── Register ─────────────────────────────────────────────────────────
      register: async (payload) => {
        set({ isLoading: true, error: null })
        try {
          await authApi.register(payload)
          // Auto-login after register
          return await get().login(payload.email, payload.password)
        } catch (err) {
          const detail = err.response?.data?.detail
          const msg = Array.isArray(detail)
            ? detail.map((d) => d.msg).join(', ')
            : detail || 'Registration failed'
          set({ isLoading: false, error: msg })
          return { ok: false, error: msg }
        }
      },

      // ── Logout ───────────────────────────────────────────────────────────
      logout: async () => {
        try { await authApi.logout() } catch (_) {}
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null })
      },

      // ── Refresh user data ─────────────────────────────────────────────────
      refreshUser: async () => {
        try {
          const { data } = await authApi.me()
          set({ user: data })
        } catch (_) {}
      },

      clearError: () => set({ error: null }),
    }),
    {
      name:    'agentflow-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
)

// ── isAuthenticated helper ────────────────────────────────────────────────────
export const useIsAuthenticated = () => !!useAuthStore((s) => s.user)
