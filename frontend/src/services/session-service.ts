import { api } from '@/services/api'
import type { LoginSessionInfo } from '@/types'

interface CreateSessionResponse {
  sessionId: string
  isNewDevice: boolean
  requiresOtp: boolean
}

export const sessionService = {
  createSession(deviceInfo: { device: string; browser: string; os: string; userAgent?: string }) {
    return api.post<{ data: CreateSessionResponse }>('/api/sessions', deviceInfo)
  },

  getSessions() {
    return api.get<{ data: LoginSessionInfo[] }>('/api/sessions')
  },

  verifyOtp(sessionId: string, otp: string) {
    return api.post('/api/sessions/verify-otp', { sessionId, otp })
  },

  resendOtp(sessionId: string) {
    return api.post('/api/sessions/resend-otp', { sessionId })
  },

  revokeSession(sessionId: string) {
    return api.delete(`/api/sessions/${sessionId}`)
  },
}