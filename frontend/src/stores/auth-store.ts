import { create } from 'zustand'
import type { Profile, Channel } from '@/types'

interface AuthUser {
  id: string
  profileId: string
  userId: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
  channelId: string | null
  channelHandle: string | null
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isLoginOpen: boolean
  isRegisterOpen: boolean

  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setLoginOpen: (open: boolean) => void
  setRegisterOpen: (open: boolean) => void
  openLogin: () => void
  openRegister: () => void
  closeAuthModals: () => void
  logout: () => Promise<void>
  fetchSession: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isLoginOpen: false,
  isRegisterOpen: false,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),

  setLoginOpen: (open) => {
    set({ isLoginOpen: open, isRegisterOpen: false })
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },

  setRegisterOpen: (open) => {
    set({ isRegisterOpen: open, isLoginOpen: false })
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },

  openLogin: () => {
    set({ isLoginOpen: true, isRegisterOpen: false })
    document.body.style.overflow = 'hidden'
  },

  openRegister: () => {
    set({ isRegisterOpen: true, isLoginOpen: false })
    document.body.style.overflow = 'hidden'
  },

  closeAuthModals: () => {
    set({ isLoginOpen: false, isRegisterOpen: false })
    document.body.style.overflow = ''
  },

  logout: async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // ignore
    }
    set({ user: null, isAuthenticated: false })
  },

  fetchSession: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/session')
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          set({
            user: json.data,
            isAuthenticated: true,
            isLoading: false,
          })
          return
        }
      }
      set({ user: null, isAuthenticated: false, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))