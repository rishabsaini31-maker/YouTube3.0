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

class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function authRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(data.error || 'An error occurred', response.status, data.code)
  }

  return data as T
}

export const authService = {
  async register(data: RegisterData): Promise<RegisterResponse> {
    const res = await authRequest<ApiResponse<RegisterResponse>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data!
  },

  async login(email: string, password: string): Promise<void> {
    const res = await authRequest<LoginResponse>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        callbackUrl: '/',
        redirect: false,
      }),
    })

    if (res.error) {
      throw new ApiError(res.error, 401, 'AUTH_ERROR')
    }

    if (res.url) {
      window.location.href = res.url
    }
  },

  async getSession(): Promise<SessionResponse | null> {
    const res = await authRequest<ApiResponse<SessionResponse>>('/api/auth/session')
    return res.data || null
  },

  async logout(): Promise<void> {
    await authRequest('/api/auth/signout', {
      method: 'POST',
    })
  },
}
