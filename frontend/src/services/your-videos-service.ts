import { api } from './api'
import type { Video, PaginatedResponse, ApiResponse } from '@/types'

export const yourVideosService = {
  async getYourVideos(page = 1, pageSize = 20, sortBy = 'newest') {
    return api.get<PaginatedResponse<Video>>('/your-videos', {
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
    })
  },

  async deleteVideo(videoId: string) {
    return api.delete<ApiResponse<{ success: boolean }>>('/your-videos', { videoId })
  },
}