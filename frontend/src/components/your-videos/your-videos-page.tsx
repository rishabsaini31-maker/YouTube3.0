'use client'

import { useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { VideoCardSkeletonRow } from '@/components/video/video-card-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { yourVideosService } from '@/services/your-videos-service'
import { useRouterStore } from '@/stores/router-store'
import { formatViewCount, formatDuration, formatTimeAgo } from '@/lib/format'
import type { Video, PaginatedResponse } from '@/types'
import { Video as VideoIcon, Upload, Trash2, Eye, ThumbsUp, MessageCircle, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function VideoStatsCard({ video, onDelete }: { video: Video; onDelete: (v: Video) => void }) {
  const { navigate } = useRouterStore()

  return (
    <div className="flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative aspect-video bg-muted">
        <img
          src={video.thumbnailUrl || '/uploads/thumbnails/placeholder.svg'}
          alt={video.title}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
          {formatDuration(video.duration)}
        </span>
        <button
          onClick={() => navigate({ name: 'video', params: { id: video.id } })}
          className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 cursor-pointer"
          aria-label="Play video"
        />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <button
          onClick={() => navigate({ name: 'video', params: { id: video.id } })}
          className="text-left"
        >
          <h3 className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-foreground/80">
            {video.title}
          </h3>
        </button>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatViewCount(video.viewCount)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {formatViewCount(video.likeCount)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {formatViewCount(video.commentCount)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(video.createdAt)}
          </span>
        </div>
        <div className="mt-auto pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start text-xs"
            onClick={() => onDelete(video)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete video
          </Button>
        </div>
      </div>
    </div>
  )
}

export function YourVideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchVideos = useCallback(async (pageNum: number, sort: string, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(false)

    try {
      const res = await yourVideosService.getYourVideos(pageNum, 20, sort)
      const data = res as unknown as PaginatedResponse<Video>
      if (append) {
        setVideos((prev) => [...prev, ...data.data])
      } else {
        setVideos(data.data)
      }
      setTotal(data.total)
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch {
      if (!append) setError(true)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos(1, sortBy)
  }, [fetchVideos, sortBy])

  const handleSortChange = (value: string) => {
    setSortBy(value)
    setPage(1)
  }

  const handleDeleteClick = (video: Video) => {
    setDeleteTarget(video)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await yourVideosService.deleteVideo(deleteTarget.id)
      setVideos((prev) => prev.filter((v) => v.id !== deleteTarget.id))
      setTotal((prev) => Math.max(0, prev - 1))
      toast.success('Video deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete video')
    } finally {
      setDeleting(false)
    }
  }

  const loadMore = () => {
    fetchVideos(page + 1, sortBy, true)
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-xl font-bold">Your Videos</h1>
            <div className="ml-auto h-9 w-32 bg-muted rounded-md animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col">
                <div className="aspect-video rounded-xl bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="flex gap-3">
                    <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold">Your Videos</h1>
          {total > 0 && (
            <span className="text-sm text-muted-foreground">{total} video{total !== 1 ? 's' : ''}</span>
          )}
          <div className="ml-auto">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most popular</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <ErrorState title="Failed to load videos" onRetry={() => fetchVideos(1, sortBy)} />
        ) : videos.length === 0 ? (
          <EmptyState
            icon={<VideoIcon className="h-10 w-10 text-muted-foreground" />}
            title="No videos yet"
            description="Upload your first video to get started and share it with the world."
            action={
              <Button onClick={() => useRouterStore.getState().navigate({ name: 'upload' })}>
                <Upload className="h-4 w-4 mr-2" />
                Upload video
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <VideoStatsCard key={video.id} video={video} onDelete={handleDeleteClick} />
              ))}
            </div>
            {loadingMore && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col">
                    <div className="aspect-video rounded-xl bg-muted animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
                      <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete video?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This action
                cannot be undone. All comments, likes, and watch history for this video will be
                permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  )
}