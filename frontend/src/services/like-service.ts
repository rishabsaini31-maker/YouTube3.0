import { api } from './api'
import type { ApiResponse } from '@/types'

interface LikeResponse {
  reaction: 'LIKE' | 'DISLIKE' | null
  likeCount: number
  dislikeCount: number
}

export const likeService = {
  async toggleLike(videoId: string, type: 'LIKE' | 'DISLIKE') {
    return api.post<ApiResponse<LikeResponse>>('/likes', { videoId, type })
  },
}