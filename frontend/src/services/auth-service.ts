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

async function relativeGet<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(text || 'Request failed', res.status)
  }
  return res.json()
}

async function relativePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(text || 'Request failed', res.status)
  }
  return res.json()
}

export const authService = {
  async register(data: RegisterData): Promise<RegisterResponse> {
    const res = await relativePost<ApiResponse<RegisterResponse>>('/api/auth/register', data)
    return res.data!
  },

  async login(email: string, password: string): Promise<void> {
    const res = await relativePost<LoginResponse>('/api/auth/signin', {
      email,
      password,
      callbackUrl: '/',
      redirect: false,
    })

    if ((res as any).error) {
      throw new ApiError((res as any).error, 401, 'AUTH_ERROR')
    }

    if ((res as any).url) {
      window.location.href = (res as any).url
    }
  },

  async getSession(): Promise<SessionResponse | null> {
    const res = await relativeGet<ApiResponse<SessionResponse>>('/api/auth/session')
    return res.data || null
  },

  async logout(): Promise<void> {
    await relativePost('/api/auth/signout', {})
  },
}
