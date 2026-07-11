import { api } from './api'
import type { ApiResponse, PaginatedResponse, ReportedComment } from '@/types'

interface LikeToggleResponse {
  likeCount: number
  dislikeCount: number
  isLikedByUser: boolean
  isDislikedByUser: boolean
}

interface TranslateResponse {
  translatedContent: string
  originalContent: string
}

interface CommentResponse {
  id: string
  videoId: string
  profileId: string
  parentId: string | null
  content: string
  likeCount: number
  dislikeCount: number
  isEdited: boolean
  isHidden: boolean
  isPinned: boolean
  isSpam: boolean
  createdAt: string
  updatedAt: string
  profile: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  }
  replies: CommentResponse[]
  isLikedByUser: boolean
  isDislikedByUser: boolean
}

export const commentService = {
  async getComments(videoId: string, page = 1, sort?: string) {
    const params: Record<string, string> = { videoId, page: String(page) }
    if (sort) params.sort = sort
    return api.get<PaginatedResponse<CommentResponse>>('/api/comments', params)
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

  async toggleLike(commentId: string) {
    return api.post<ApiResponse<LikeToggleResponse>>(`/api/comments/${commentId}/like`)
  },

  async toggleDislike(commentId: string) {
    return api.post<ApiResponse<LikeToggleResponse>>(`/api/comments/${commentId}/dislike`)
  },

  async reportComment(commentId: string, reason: string, description?: string) {
    return api.post<ApiResponse<{ reportCount: number }>>(`/api/comments/${commentId}/report`, { reason, description })
  },

  async translateComment(commentId: string) {
    return api.post<ApiResponse<TranslateResponse>>(`/api/comments/${commentId}/translate`)
  },

  async getReportedComments(page = 1) {
    return api.get<PaginatedResponse<ReportedComment>>('/api/comments/moderation', { page: String(page) })
  },

  async moderateComment(commentId: string, action: string) {
    return api.put<ApiResponse>(`/api/comments/moderation/${commentId}`, { action })
  },
}