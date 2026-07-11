import { apiClient } from './api'

export interface PlaylistVideo {
  id: string
  videoId: string
  addedAt: string
  video: {
    id: string
    title: string
    thumbnailUrl: string
    duration: number
    channel: {
      id: string
      name: string
    }
  }
}

export interface Playlist {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  createdAt: string
  _count?: {
    videos: number
  }
  videos?: PlaylistVideo[]
}

export const playlistService = {
  getPlaylists: async () => {
    const response = await apiClient.get<{ data: Playlist[] }>('/api/playlists')
    return response.data
  },

  getPlaylist: async (id: string) => {
    const response = await apiClient.get<{ data: Playlist }>(`/api/playlists/${id}`)
    return response.data
  },

  createPlaylist: async (data: { name: string; description?: string; isPrivate?: boolean }) => {
    const response = await apiClient.post<{ data: Playlist }>('/api/playlists', data)
    return response.data
  },

  deletePlaylist: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/api/playlists/${id}`)
    return response.success
  },

  addVideo: async (playlistId: string, videoId: string) => {
    const response = await apiClient.post<{ success: boolean }>(`/api/playlists/${playlistId}/videos`, { videoId })
    return response.success
  },

  removeVideo: async (playlistId: string, videoId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/api/playlists/${playlistId}/videos`, {
      params: { videoId }
    })
    return response.success
  }
}
