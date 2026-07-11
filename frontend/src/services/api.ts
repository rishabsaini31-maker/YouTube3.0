const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

interface FetchOptions extends RequestInit {
  params?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private getUserId: () => string | undefined

  constructor(baseUrl: string, getUserId: () => string | undefined = () => undefined) {
    this.baseUrl = baseUrl
    this.getUserId = getUserId
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options
    let url = `${this.baseUrl}${endpoint}`

    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value)
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    const userId = this.getUserId()
    if (userId) {
      headers['x-user-id'] = userId
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(data.error || 'An error occurred', response.status, data.code)
    }

    return data as T
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async upload<T>(
    endpoint: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
    overrideUserId?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const userId = overrideUserId || this.getUserId()

    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data as T)
          } else {
            reject(new ApiError(data.error || 'Upload failed', xhr.status, data.code))
          }
        } catch {
          reject(new ApiError('Invalid response', xhr.status))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new ApiError('Network error', 0))
      })

      xhr.open('POST', url)
      if (userId) {
        xhr.setRequestHeader('x-user-id', userId)
      }
      xhr.withCredentials = true
      xhr.send(formData)
    })
  }
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export const api = new ApiClient(BASE_URL, () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('auth-user')
    if (user) {
      try {
        const parsed = JSON.parse(user)
        return parsed.userId || parsed.id
      } catch {
        return undefined
      }
    }
  }
  return undefined
})