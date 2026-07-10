import { api, ApiError } from './api'
import type { Profile, ApiResponse } from '@/types'

export interface ProfileFormData {
  name?: string
  username?: string
  bio?: string
  channelName?: string
  channelDescription?: string
}

export const profileService = {
  async getProfile() {
    return api.get<ApiResponse<Profile>>('/profile')
  },

  async updateProfile(data: ProfileFormData) {
    return api.put<ApiResponse<Profile>>('/profile', data)
  },

  async uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    return api.upload<ApiResponse<{ avatarUrl: string }>>('/profile', formData)
  },
}