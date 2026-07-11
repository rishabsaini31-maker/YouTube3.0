import { api, ApiError } from './api'
import type { VideoWithChannel, PaginatedResponse, ApiResponse } from '@/types'

export const videoService = {
  async getVideos(params: {
    page?: number
    pageSize?: number
    category?: string
    channelId?: string
    sortBy?: string
  } = {}): Promise<PaginatedResponse<VideoWithChannel>> {
    const queryParams: Record<string, string> = {}
    if (params.page) queryParams.page = String(params.page)
    if (params.pageSize) queryParams.pageSize = String(params.pageSize)
    if (params.category) queryParams.category = params.category
    if (params.channelId) queryParams.channelId = params.channelId
    if (params.sortBy) queryParams.sortBy = params.sortBy

    const res = await api.get<PaginatedResponse<VideoWithChannel>>('/api/videos', queryParams)
    return res
  },

  async getVideo(id: string): Promise<VideoWithChannel> {
    const res = await api.get<ApiResponse<VideoWithChannel>>(`/api/videos/${id}`)
    if (!res.data) throw new ApiError('Video not found', 404)
    return res.data
  },

  async recordView(videoId: string, profileId: string): Promise<void> {
    await api.post('/api/videos/views', { videoId, profileId })
  },
}