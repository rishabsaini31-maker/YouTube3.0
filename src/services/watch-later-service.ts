import { api } from './api'
import type { VideoWithChannel, ApiResponse } from '@/types'

interface WatchLaterEntry {
  id: string
  videoId: string
  addedAt: string
  video: VideoWithChannel
}

export const watchLaterService = {
  async list() {
    return api.get<ApiResponse<WatchLaterEntry[]>>('/api/watch-later')
  },

  async add(videoId: string) {
    return api.post<ApiResponse>('/api/watch-later', { videoId })
  },

  async remove(entryId: string) {
    return api.delete<ApiResponse>(`/api/watch-later/${entryId}`)
  },
}