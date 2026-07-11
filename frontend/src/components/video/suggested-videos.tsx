'use client'

import { useState, useEffect, useCallback } from 'react'
import { videoService } from '@/services/video-service'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardHorizontalSkeleton } from '@/components/video/video-card-skeleton'
import type { VideoWithChannel } from '@/types'

interface SuggestedVideosProps {
  currentVideoId: string
  channelId: string
  category: string
  onVideosLoaded?: (videos: VideoWithChannel[]) => void
}

const MAX_VIDEOS = 15

export function SuggestedVideos({ currentVideoId, channelId, category, onVideosLoaded }: SuggestedVideosProps) {
  const [videos, setVideos] = useState<VideoWithChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const allVideos: VideoWithChannel[] = []

      // Fetch videos from the same channel first
      if (channelId) {
        try {
          const channelRes = await videoService.getVideos({
            channelId,
            pageSize: 20,
            sortBy: 'popular',
          })
          const filtered = channelRes.data.filter((v) => v.id !== currentVideoId)
          allVideos.push(...filtered)
        } catch {
          // Continue with category results
        }
      }

      // Fetch videos from the same category
      if (category && category !== 'All') {
        try {
          const catRes = await videoService.getVideos({
            category,
            pageSize: 20,
            sortBy: 'popular',
          })
          const filtered = catRes.data.filter(
            (v) => v.id !== currentVideoId && !allVideos.some((existing) => existing.id === v.id)
          )
          allVideos.push(...filtered)
        } catch {
          // Continue with what we have
        }
      }

      // If we don't have enough, fetch popular videos
      if (allVideos.length < 5) {
        try {
          const popularRes = await videoService.getVideos({
            pageSize: 20,
            sortBy: 'popular',
          })
          const filtered = popularRes.data.filter(
            (v) => v.id !== currentVideoId && !allVideos.some((existing) => existing.id === v.id)
          )
          allVideos.push(...filtered)
        } catch {
          // Use what we have
        }
      }

      // Deduplicate by id and limit
      const seen = new Set<string>()
      const deduped = allVideos.filter((v) => {
        if (seen.has(v.id)) return false
        seen.add(v.id)
        return true
      })

      const final = deduped.slice(0, MAX_VIDEOS)
      setVideos(final)
      onVideosLoaded?.(final)
    } catch {
      setError('Failed to load suggested videos')
    } finally {
      setLoading(false)
    }
  }, [currentVideoId, channelId, category])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  return (
    <div className="flex flex-col gap-3">
      {/* Header - only shown on larger screens */}
      <h2 className="text-base font-semibold hidden lg:block">
        Up next
      </h2>

      {/* Video list with scroll */}
      <div
        className="flex flex-col gap-3 max-h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-6rem)] overflow-y-auto pr-1
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30
          [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/50"
      >
        {loading && (
          <>
            {Array.from({ length: 10 }).map((_, i) => (
              <VideoCardHorizontalSkeleton key={i} />
            ))}
          </>
        )}

        {error && !loading && (
          <div className="text-sm text-muted-foreground text-center py-8">
            {error}
            <button
              onClick={fetchVideos}
              className="block mx-auto mt-2 text-primary hover:underline text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No suggested videos available
          </div>
        )}

        {!loading &&
          videos.map((video) => (
            <VideoCard key={video.id} video={video} variant="horizontal" />
          ))}
      </div>
    </div>
  )
}