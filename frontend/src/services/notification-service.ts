import { apiClient } from './api'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  linkUrl?: string
  createdAt: string
}

export const notificationService = {
  getNotifications: async () => {
    const response = await apiClient.get<{ data: Notification[] }>('/api/notifications')
    return response.data
  },

  markAllAsRead: async () => {
    const response = await apiClient.put<{ success: boolean }>('/api/notifications')
    return response.success
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.put<{ success: boolean }>(`/api/notifications/${id}/read`)
    return response.success
  }
}
