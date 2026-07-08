import { api } from './api'
import type { ApiResponse, PaginatedResponse } from '@/types'

export const commentService = {
  async getComments(videoId: string, page = 1) {
    return api.get<PaginatedResponse<CommentResponse>>('/api/comments', { videoId, page: String(page) })
  },

  async addComment(videoId: string, content: string, parentId?: string) {
    return api.post<ApiResponse<CommentResponse>>('/api/comments', { videoId, content, parentId })
  },

  async updateComment(commentId: string, content: string) {
    return api.put<ApiResponse<{ content: string; isEdited: boolean; updatedAt: string }>>(`/api/comments/${commentId}`, { content })
  },

  async deleteComment(commentId: string) {
    return api.delete<ApiResponse>(`/api/comments/${commentId}`)
  },
}

interface CommentResponse {
  id: string
  videoId: string
  profileId: string
  parentId: string | null
  content: string
  likeCount: number
  isEdited: boolean
  createdAt: string
  updatedAt: string
  profile: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  replies: CommentResponse[]
}