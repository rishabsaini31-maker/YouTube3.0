'use client'

import { useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardHorizontalSkeleton } from '@/components/video/video-card-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { watchLaterService } from '@/services/watch-later-service'
import { toast } from 'sonner'
import { Clock, X } from 'lucide-react'
import type { VideoWithChannel } from '@/types'

interface WatchLaterEntry {
  id: string
  videoId: string
  addedAt: string
  video: VideoWithChannel
}

function WatchLaterContent() {
  const [entries, setEntries] = useState<WatchLaterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchWatchLater = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await watchLaterService.list()
      setEntries((res.data || []) as WatchLaterEntry[])
    } catch {
      setError('Failed to load saved videos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWatchLater()
  }, [fetchWatchLater])

  const handleRemove = async (entryId: string) => {
    setRemoving(entryId)
    try {
      await watchLaterService.remove(entryId)
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
      toast.success('Removed from Watch Later')
    } catch {
      toast.error('Failed to remove video')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Watch Later</h1>
          {!loading && entries.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {entries.length} video{entries.length !== 1 ? 's' : ''}
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
        <ErrorState title="Failed to load saved videos" message={error} onRetry={fetchWatchLater} />
      )}

      {!loading && !error && entries.length === 0 && (
        <EmptyState
          icon={<Clock className="h-12 w-12 text-muted-foreground" />}
          title="No saved videos"
          description="Save videos to watch later and they'll show up here."
        />
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <VideoCard video={entry.video} variant="horizontal" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(entry.id)}
                disabled={removing === entry.id}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WatchLaterPage() {
  return (
    <AuthGuard>
      <WatchLaterContent />
    </AuthGuard>
  )
}