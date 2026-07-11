'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { downloadService } from '@/services/download-service'
import type { DownloadEntry, DownloadLimits } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  ArrowDownToLine,
  Trash2,
  Play,
  Clock,
  Crown,
  Infinity,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import { formatTimeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function DownloadsPage() {
  const { navigate } = useRouterStore()
  const { isAuthenticated, openLogin } = useAuthStore()
  const [downloads, setDownloads] = useState<DownloadEntry[]>([])
  const [limits, setLimits] = useState<DownloadLimits | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DownloadEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDownloads = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const res = await downloadService.getDownloads(pageNum, 20)
      if (append) {
        setDownloads((prev) => [...prev, ...res.data])
      } else {
        setDownloads(res.data)
      }
      setLimits(res.limits)
      setHasMore(res.hasMore)
      setTotal(res.total)
      setPage(pageNum)
    } catch {
      setError('Failed to load downloads')
      toast.error('Failed to load downloads')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      openLogin()
      return
    }
    fetchDownloads(1)
  }, [isAuthenticated, openLogin, fetchDownloads])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await downloadService.deleteDownload(deleteTarget.id)
      setDownloads((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      setTotal((prev) => prev - 1)
      toast.success('Download removed from history')
      // Refresh limits
      fetchDownloads(1)
    } catch {
      toast.error('Failed to remove download')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handlePlay = (entry: DownloadEntry) => {
    navigate({ name: 'video', params: { id: entry.videoId } })
  }

  if (!isAuthenticated) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-xl">
          <ArrowDownToLine className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Downloads</h1>
          <p className="text-sm text-muted-foreground">
            Your downloaded videos and history
          </p>
        </div>
      </div>

      {/* Plan & Limits Card */}
      {limits && (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  {limits.isUnlimited ? (
                    <Infinity className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Crown className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{limits.plan.displayName} Plan</span>
                    {limits.plan.name !== 'free' && (
                      <Badge variant="secondary" className="text-xs">
                        ₹{limits.plan.price}/mo
                      </Badge>
                    )}
                    {limits.plan.name === 'free' && (
                      <Badge variant="outline" className="text-xs">Free</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {limits.isUnlimited
                      ? 'Unlimited downloads'
                      : `${limits.downloadsUsed} of ${limits.plan.downloadLimit} downloads used this ${limits.plan.downloadWindow}`}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {!limits.isUnlimited && (
                <div className="flex-1 sm:max-w-xs">
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        limits.downloadsRemaining === 0
                          ? 'bg-red-500'
                          : limits.downloadsRemaining <= 2
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      )}
                      style={{
                        width: `${Math.min(100, (limits.downloadsUsed / limits.plan.downloadLimit) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {limits.downloadsRemaining} remaining
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {limits.windowResetLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Limit reached warning */}
            {!limits.isUnlimited && limits.downloadsRemaining === 0 && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Download limit reached
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    You&apos;ve used all {limits.plan.downloadLimit} downloads for this {limits.plan.downloadWindow}.
                    Upgrade your plan for more downloads.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator className="mb-6" />

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-3">
              <Skeleton className="w-40 h-24 sm:w-52 sm:h-28 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">{error}</p>
          <Button variant="outline" onClick={() => fetchDownloads(1)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && downloads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-muted rounded-full mb-4">
            <ArrowDownToLine className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No downloads yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Download your favorite videos to watch them offline. Click the download button on any video to get started.
          </p>
          <Button onClick={() => navigate({ name: 'home' })}>
            Browse Videos
          </Button>
        </div>
      )}

      {/* Download List */}
      {!loading && !error && downloads.length > 0 && (
        <>
          <div className="text-sm text-muted-foreground mb-3">
            {total} download{total !== 1 ? 's' : ''}
          </div>
          <div className="space-y-2">
            {downloads.map((entry) => (
              <Card key={entry.id} className="group hover:bg-muted/50 transition-colors">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-3 sm:gap-4">
                    {/* Thumbnail */}
                    <button
                      onClick={() => handlePlay(entry)}
                      className="relative flex-shrink-0 w-36 h-20 sm:w-48 sm:h-27 rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={entry.thumbnailUrl}
                        alt={entry.videoTitle}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1 right-1 text-xs px-1.5 py-0"
                      >
                        {entry.quality}
                      </Badge>
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <button
                        onClick={() => handlePlay(entry)}
                        className="text-sm sm:text-base font-medium line-clamp-2 text-left hover:underline w-full"
                      >
                        {entry.videoTitle}
                      </button>
                      {entry.channelName && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          {entry.channelName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Downloaded {formatTimeAgo(entry.downloadedAt)}</span>
                        {entry.status === 'completed' && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 ml-1">
                            Completed
                          </Badge>
                        )}
                        {entry.status === 'failed' && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0 ml-1">
                            Failed
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePlay(entry)}
                          className="h-7 text-xs gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Watch
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement('a')
                            a.href = entry.videoUrl
                            a.download = entry.videoTitle
                            a.target = '_blank'
                            a.rel = 'noopener noreferrer'
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                          }}
                          className="h-7 text-xs gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          File
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(entry)}
                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => fetchDownloads(page + 1, true)}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from downloads?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &ldquo;{deleteTarget?.videoTitle}&rdquo; from your download history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}