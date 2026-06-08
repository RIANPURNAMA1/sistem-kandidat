import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export interface User {
  id: string
  email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'FINANCE' | 'AFFILIATE' | 'KANDIDAT'
  candidate?: { id: string; fullName: string } | null
  affiliate?: { id: string; code: string; referralLink: string } | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isOtpLoading: boolean
  otpSent: boolean
  login: (email: string, password: string) => Promise<void>
  sendOtp: (phone: string) => Promise<void>
  verifyOtp: (phone: string, code: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isOtpLoading: false,
      otpSent: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/login', { email, password })
          localStorage.setItem('token', data.data.token)
          set({
            user: data.data.user,
            token: data.data.token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      sendOtp: async (phone) => {
        set({ isOtpLoading: true, otpSent: false })
        try {
          await api.post('/auth/send-otp', { phone })
          set({ isOtpLoading: false, otpSent: true })
        } catch (error) {
          set({ isOtpLoading: false })
          throw error
        }
      },

      verifyOtp: async (phone, code) => {
        set({ isLoading: true })
        try {
          const { data } = await api.post('/auth/verify-otp', { phone, code })
          localStorage.setItem('token', data.data.token)
          set({
            user: data.data.user,
            token: data.data.token,
            isAuthenticated: true,
            isLoading: false,
            otpSent: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, isAuthenticated: false, otpSent: false })
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)
