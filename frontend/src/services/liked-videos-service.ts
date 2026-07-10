import { api } from './api'
import type { VideoWithChannel, ApiResponse } from '@/types'

interface LikedVideoEntry {
  id: string
  videoId: string
  likedAt: string
  video: VideoWithChannel
}

export const likedVideosService = {
  async list() {
    return api.get<ApiResponse<LikedVideoEntry[]>>('/likes/videos')
  },
}