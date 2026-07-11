import { api } from './api'
import type { ApiResponse } from '@/types'

export const subscriptionService = {
  async toggleSubscribe(channelId: string) {
    return api.post<ApiResponse<{ subscribed: boolean; subscriberCount: number }>>('/api/subscriptions', { channelId })
  },

  async checkSubscription(channelId: string) {
    return api.get<ApiResponse<{ subscribed: boolean }>>('/api/subscriptions', { channelId })
  },
}