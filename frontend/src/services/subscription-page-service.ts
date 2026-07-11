import { api } from './api'
import type { VideoWithChannel, PaginatedResponse, Channel } from '@/types'

export interface SubscribedChannel extends Channel {
  subscribedAt: string
}

export const subscriptionPageService = {
  async getSubscribedChannels() {
    return api.get<{ data: SubscribedChannel[] }>('/api/subscriptions/channels')
  },

  async getSubscriptionVideos(page = 1, pageSize = 20) {
    return api.get<PaginatedResponse<VideoWithChannel>>('/api/subscriptions/videos', {
      page: String(page),
      pageSize: String(pageSize),
    })
  },
}