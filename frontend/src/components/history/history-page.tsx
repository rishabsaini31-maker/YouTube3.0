'use client'

import { useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardHorizontalSkeleton } from '@/components/video/video-card-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { historyService } from '@/services/history-service'
import { toast } from 'sonner'
import { History, Trash2 } from 'lucide-react'
import type { VideoWithChannel } from '@/types'

function HistoryContent() {
  const [videos, setVideos] = useState<VideoWithChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await historyService.list()
      const entries = (res.data || []) as Array<{ video: VideoWithChannel }>
      setVideos(entries.map((e) => e.video))
    } catch {
      setError('Failed to load watch history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await historyService.clear()
      setVideos([])
      toast.success('Watch history cleared')
    } catch {
      toast.error('Failed to clear history')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Watch History</h1>
          {!loading && videos.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {videos.length} video{videos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {videos.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear all</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear watch history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all videos from your watch history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} disabled={clearing}>
                  {clearing ? 'Clearing...' : 'Clear all'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
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
        <ErrorState title="Failed to load history" message={error} onRetry={fetchHistory} />
      )}

      {!loading && !error && videos.length === 0 && (
        <EmptyState
          icon={<History className="h-12 w-12 text-muted-foreground" />}
          title="No watch history"
          description="Videos you watch will show up here."
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

export function HistoryPage() {
  return (
    <AuthGuard>
      <HistoryContent />
    </AuthGuard>
  )
}