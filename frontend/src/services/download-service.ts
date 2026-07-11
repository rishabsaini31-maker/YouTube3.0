import { api, ApiError } from './api'
import type { DownloadEntry, DownloadLimits, PaginatedResponse, ApiResponse } from '@/types'

interface DownloadsResponse extends PaginatedResponse<DownloadEntry> {
  limits: DownloadLimits
}

interface DownloadResult {
  id: string
  videoUrl: string
  videoTitle: string
  quality: string
  status: string
}

interface DownloadLimitReachedInfo {
  plan: string
  downloadLimit: number
  downloadWindow: string
  downloadsUsed: number
  downloadsRemaining: number
  isUnlimited: boolean
}

export const downloadService = {
  async getDownloads(page = 1, pageSize = 20): Promise<DownloadsResponse> {
    return api.get<DownloadsResponse>('/api/downloads', {
      page: String(page),
      pageSize: String(pageSize),
    })
  },

  async downloadVideo(
    videoId: string,
    quality = 'original'
  ): Promise<ApiResponse<DownloadResult>> {
    return api.post<ApiResponse<DownloadResult>>('/api/downloads', {
      videoId,
      quality,
    })
  },

  async deleteDownload(downloadId: string): Promise<ApiResponse<{ success: boolean }>> {
    return api.delete<ApiResponse<{ success: boolean }>>('/api/downloads', {
      downloadId,
    })
  },

  isLimitReachedError(error: unknown): error is ApiError & { limits?: DownloadLimitReachedInfo } {
    return error instanceof ApiError && (error as ApiError & { code?: string }).code === 'LIMIT_REACHED'
  },
}