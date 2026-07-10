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
  _logoutCalled: boolean

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

export const useAuthStore = create<AuthStore>((set) => {
  const savedUser = typeof window !== 'undefined' ? localStorage.getItem('auth-user') : null
  const initialUser = savedUser ? JSON.parse(savedUser) : null
  const logoutCalled = typeof window !== 'undefined' ? localStorage.getItem('auth-logout-called') === 'true' : false

  return {
    user: initialUser,
    isAuthenticated: !!initialUser,
    isLoading: true,
    isLoginOpen: false,
    isRegisterOpen: false,
    _logoutCalled: logoutCalled,

    setUser: (user) => {
      if (user) {
        localStorage.setItem('auth-user', JSON.stringify(user))
        localStorage.removeItem('auth-logout-called')
      } else {
        localStorage.removeItem('auth-user')
      }
      set({ user, isAuthenticated: !!user, isLoading: false, _logoutCalled: false })
    },

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
      set({ isLoginOpen: false, isRegisterOpen: open })
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
      set({ isLoginOpen: false, isRegisterOpen: true })
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

      localStorage.removeItem('auth-user')
      localStorage.setItem('auth-logout-called', 'true')

      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [name] = cookie.split('=')
        const trimmedName = name.trim()
        if (trimmedName.startsWith('next-auth') || trimmedName === '__next_hmr_refresh_hash__' || trimmedName === 'refresh-token') {
          document.cookie = `${trimmedName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None`
        }
      }

      set({ user: null, isAuthenticated: false, _logoutCalled: true })
    },

    fetchSession: async () => {
      set({ isLoading: true })
      try {
        const state = useAuthStore.getState()
        if (state._logoutCalled) {
          set({ user: null, isAuthenticated: false, isLoading: false })
          return
        }

        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const json = await res.json()
          if (json.data) {
            localStorage.setItem('auth-user', JSON.stringify(json.data))
            localStorage.removeItem('auth-logout-called')
            set({
              user: json.data,
              isAuthenticated: true,
              isLoading: false,
              _logoutCalled: false,
            })
            return
          }
        }
        set({ user: null, isAuthenticated: false, isLoading: false })
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    },
  }
})
