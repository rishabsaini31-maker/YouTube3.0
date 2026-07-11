import { api } from './api'
import type { ApiResponse } from '@/types'

export const uploadService = {
  async uploadVideo(
    data: {
      video: File
      thumbnail?: File
      title: string
      description: string
      category: string
      tags: string[]
      userId?: string
    },
    onProgress?: (percent: number) => void
  ) {
    const formData = new FormData()
    formData.append('video', data.video)
    if (data.thumbnail) formData.append('thumbnail', data.thumbnail)
    formData.append('title', data.title)
    formData.append('description', data.description)
    formData.append('category', data.category)
    formData.append('tags', JSON.stringify(data.tags))

    return api.upload<ApiResponse<{ id: string; title: string }>>('/api/upload', formData, onProgress, data.userId)
  },
}