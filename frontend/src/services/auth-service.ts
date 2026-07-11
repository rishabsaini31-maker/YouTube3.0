import { api, ApiError } from './api'
import type { ApiResponse } from '@/types'

interface RegisterData {
  email: string
  password: string
  name: string
  username: string
}

interface RegisterResponse {
  id: string
  userId: string
  name: string
  username: string
  email: string
}

interface LoginResponse {
  url?: string
  error?: string
}

interface SessionResponse {
  id: string
  userId: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string | null
  channelId: string | null
  channelHandle: string | null
}

export const authService = {
  async register(data: RegisterData): Promise<RegisterResponse> {
    const res = await api.post<ApiResponse<RegisterResponse>>('/api/auth/register', data)
    return res.data!
  },

  async login(email: string, password: string): Promise<void> {
    const res = await api.post<LoginResponse>('/api/auth/signin', {
      email,
      password,
      callbackUrl: '/',
      redirect: false,
    })

    if (res.error) {
      throw new ApiError(res.error, 401, 'AUTH_ERROR')
    }

    if (res.url) {
      window.location.href = res.url
    }
  },

  async getSession(): Promise<SessionResponse | null> {
    const res = await api.get<ApiResponse<SessionResponse>>('/api/auth/session')
    return res.data || null
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/signout', {})
  },
}