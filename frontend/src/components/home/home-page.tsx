'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { videoService } from '@/services/video-service'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardSkeletonRow } from '@/components/video/video-card-skeleton'
import { CategoryChips } from '@/components/shared/category-chips'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import type { VideoWithChannel } from '@/types'
import { Film, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Date added (newest)' },
  { value: 'popular', label: 'Most popular' },
  { value: 'oldest', label: 'Date added (oldest)' },
] as const

export function HomePage() {
  const { categoryFilter } = useRouterStore()
  const [videos, setVideos] = useState<VideoWithChannel[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('newest')
  const [total, setTotal] = useState(0)
  const isFirstLoad = useRef(true)

  const fetchVideos = useCallback(
    async (pageNum: number, append: boolean, currentCategory: string, currentSort: string) => {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      try {
        const res = await videoService.getVideos({
          page: pageNum,
          category: currentCategory,
          sortBy: currentSort,
        })

        if (append) {
          setVideos((prev) => [...prev, ...res.data])
        } else {
          setVideos(res.data)
        }

        setHasMore(res.hasMore)
        setTotal(res.total)
        setPage(pageNum)
      } catch {
        setError('Failed to load videos')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        isFirstLoad.current = false
      }
    },
    []
  )

  useEffect(() => {
    fetchVideos(1, false, categoryFilter, sortBy)
  }, [categoryFilter, sortBy, fetchVideos])

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    fetchVideos(page + 1, true, categoryFilter, sortBy)
  }, [hasMore, isLoadingMore, page, categoryFilter, sortBy, fetchVideos])

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  })

  if (isLoading && isFirstLoad.current) {
    return (
      <div>
        <CategoryChips />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 p-4 sm:p-6">
          <VideoCardSkeletonRow count={12} />
        </div>
      </div>
    )
  }

  if (error && videos.length === 0) {
    return (
      <div>
        <CategoryChips />
        <ErrorState
          title="Failed to load videos"
          message="Something went wrong while loading videos. Please try again."
          onRetry={() => fetchVideos(1, false, categoryFilter, sortBy)}
        />
      </div>
    )
  }

  if (videos.length === 0 && !isLoading) {
    return (
      <div>
        <CategoryChips />
        <EmptyState
          icon={<Film className="h-10 w-10 text-muted-foreground" />}
          title={categoryFilter !== 'All' ? `No videos in "${categoryFilter}"` : 'No videos yet'}
          description={
            categoryFilter !== 'All'
              ? `There are no videos in the ${categoryFilter} category yet. Try browsing a different category.`
              : 'No videos have been uploaded yet. Be the first to share your content!'
          }
        />
      </div>
    )
  }

  return (
    <div>
      <CategoryChips />

      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-2">
        {categoryFilter !== 'All' && (
          <p className="text-sm text-muted-foreground">
            {total} video{total !== 1 ? 's' : ''} in {categoryFilter}
          </p>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm text-muted-foreground gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Sort by</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={sortBy === opt.value ? 'bg-muted' : ''}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 p-4 sm:p-6 pb-2">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {isLoadingMore && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 p-4 sm:p-6">
          <VideoCardSkeletonRow count={4} />
        </div>
      )}

      {!hasMore && videos.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          You&apos;ve seen all {total} video{total !== 1 ? 's' : ''}
        </p>
      )}

      <div ref={sentinelRef} className="h-1" />
    </div>
  )
}