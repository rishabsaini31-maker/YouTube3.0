import { api } from './api'
import type { WatchPartyRoom, WatchPartyMessage, PaginatedResponse, ApiResponse } from '@/types'

export const watchPartyService = {
  listRooms: (params?: { page?: string; pageSize?: string }) =>
    api.get<PaginatedResponse<WatchPartyRoom>>('/api/watch-party', params),

  getRoom: (roomId: string) =>
    api.get<ApiResponse<WatchPartyRoom>>(`/api/watch-party/${roomId}`),

  createRoom: (data: { videoId: string; title: string }) =>
    api.post<ApiResponse<WatchPartyRoom>>('/api/watch-party', data),

  deleteRoom: (roomId: string) =>
    api.delete<ApiResponse<null>>(`/api/watch-party/${roomId}`),

  getMessages: (roomId: string, params?: { page?: string; pageSize?: string }) =>
    api.get<PaginatedResponse<WatchPartyMessage>>(`/api/watch-party/${roomId}/messages`, params),

  joinRoom: (roomId: string, profileId: string) =>
    api.post<ApiResponse<WatchPartyRoom>>(`/api/watch-party/${roomId}/join`, { profileId }),
}