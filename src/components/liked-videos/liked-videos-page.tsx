'use client'

import { useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardHorizontalSkeleton } from '@/components/video/video-card-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { Separator } from '@/components/ui/separator'
import { likedVideosService } from '@/services/liked-videos-service'
import { ThumbsUp } from 'lucide-react'
import type { VideoWithChannel } from '@/types'

interface LikedVideoEntry {
  id: string
  videoId: string
  likedAt: string
  video: VideoWithChannel
}

function LikedVideosContent() {
  const [videos, setVideos] = useState<VideoWithChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLikedVideos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await likedVideosService.list()
      const entries = (res.data || []) as LikedVideoEntry[]
      setVideos(entries.map((e) => e.video))
    } catch {
      setError('Failed to load liked videos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLikedVideos()
  }, [fetchLikedVideos])

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ThumbsUp className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Liked Videos</h1>
          {!loading && videos.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {videos.length} video{videos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <Separator className="mb-6" />

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardHorizontalSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !loading && (
        <ErrorState title="Failed to load liked videos" message={error} onRetry={fetchLikedVideos} />
      )}

      {!loading && !error && videos.length === 0 && (
        <EmptyState
          icon={<ThumbsUp className="h-12 w-12 text-muted-foreground" />}
          title="No liked videos"
          description="Videos you like will show up here."
        />
      )}

      {!loading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}

export function LikedVideosPage() {
  return (
    <AuthGuard>
      <LikedVideosContent />
    </AuthGuard>
  )
}