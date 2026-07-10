import { api } from './api'
import type { VideoWithChannel, ApiResponse } from '@/types'

interface HistoryEntry {
  id: string
  videoId: string
  watchedAt: string
  video: VideoWithChannel
}

export const historyService = {
  async list() {
    return api.get<ApiResponse<HistoryEntry[]>>('/history')
  },

  async record(videoId: string) {
    return api.post<ApiResponse>('/history', { videoId })
  },

  async clear() {
    return api.delete<ApiResponse>('/history')
  },
}