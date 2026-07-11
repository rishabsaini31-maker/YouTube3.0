'use client'

import { useState, useCallback } from 'react'
import { ThumbsUp, ThumbsDown, Share, ArrowDownToLine, Clock, Ellipsis, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { likeService } from '@/services/like-service'
import { watchLaterService } from '@/services/watch-later-service'
import { downloadService } from '@/services/download-service'
import { useAuthStore } from '@/stores/auth-store'
import { useRouterStore } from '@/stores/router-store'
import { cn } from '@/lib/utils'
import { formatViewCount } from '@/lib/format'
import { toast } from 'sonner'

interface VideoActionsProps {
  videoId: string
  likeCount: number
  dislikeCount: number
  initialReaction: 'LIKE' | 'DISLIKE' | null
  isSavedToWatchLater?: boolean
  watchLaterEntryId?: string | null
}

export function VideoActions({
  videoId,
  likeCount: initialLikeCount,
  dislikeCount: initialDislikeCount,
  initialReaction,
  isSavedToWatchLater: initialSaved,
  watchLaterEntryId: initialEntryId,
}: VideoActionsProps) {
  const [reaction, setReaction] = useState<'LIKE' | 'DISLIKE' | null>(initialReaction)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount)
  const [saved, setSaved] = useState(!!initialSaved)
  const [watchLaterId, setWatchLaterId] = useState<string | null>(initialEntryId ?? null)
  const [likeLoading, setLikeLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const { isAuthenticated, openLogin } = useAuthStore()
  const { navigate } = useRouterStore()

  const handleLike = useCallback(async () => {
    if (likeLoading) return
    setLikeLoading(true)

    const prevReaction = reaction
    const prevLikeCount = likeCount
    const prevDislikeCount = dislikeCount

    if (reaction === 'LIKE') {
      setReaction(null)
      setLikeCount((c) => c - 1)
    } else {
      setReaction('LIKE')
      setLikeCount((c) => c + 1)
      if (reaction === 'DISLIKE') {
        setDislikeCount((c) => c - 1)
      }
    }

    try {
      const res = await likeService.toggleLike(videoId, 'LIKE')
      if (res.data) {
        setReaction(res.data.reaction)
        setLikeCount(res.data.likeCount)
        setDislikeCount(res.data.dislikeCount)
      }
    } catch {
      setReaction(prevReaction)
      setLikeCount(prevLikeCount)
      setDislikeCount(prevDislikeCount)
      toast.error('Failed to update reaction')
    } finally {
      setLikeLoading(false)
    }
  }, [videoId, reaction, likeCount, dislikeCount, likeLoading])

  const handleDislike = useCallback(async () => {
    if (likeLoading) return
    setLikeLoading(true)

    const prevReaction = reaction
    const prevLikeCount = likeCount
    const prevDislikeCount = dislikeCount

    if (reaction === 'DISLIKE') {
      setReaction(null)
      setDislikeCount((c) => c - 1)
    } else {
      setReaction('DISLIKE')
      setDislikeCount((c) => c + 1)
      if (reaction === 'LIKE') {
        setLikeCount((c) => c - 1)
      }
    }

    try {
      const res = await likeService.toggleLike(videoId, 'DISLIKE')
      if (res.data) {
        setReaction(res.data.reaction)
        setLikeCount(res.data.likeCount)
        setDislikeCount(res.data.dislikeCount)
      }
    } catch {
      setReaction(prevReaction)
      setLikeCount(prevLikeCount)
      setDislikeCount(prevDislikeCount)
      toast.error('Failed to update reaction')
    } finally {
      setLikeLoading(false)
    }
  }, [videoId, reaction, likeCount, dislikeCount, likeLoading])

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/#/watch/${videoId}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }, [videoId])

  const handleDownload = useCallback(async () => {
    if (!isAuthenticated) {
      openLogin()
      return
    }
    if (downloadLoading) return
    setDownloadLoading(true)

    try {
      const res = await downloadService.downloadVideo(videoId)
      if (res.data?.videoUrl) {
        const a = document.createElement('a')
        a.href = res.data.videoUrl
        a.download = res.data.videoTitle || 'video'
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success('Download started!', { description: res.data.videoTitle })
      }
    } catch (err) {
      if (downloadService.isLimitReachedError(err)) {
        const apiErr = err as unknown as {
          limits?: {
            plan: string
            downloadLimit: number
            downloadWindow: string
            downloadsUsed: number
            downloadsRemaining: number
          }
        }
        toast.error('Download limit reached', {
          description: `You've used all ${apiErr.limits?.downloadLimit ?? 1} downloads for this ${apiErr.limits?.downloadWindow ?? 'day'}. Upgrade your plan for more.`,
          action: {
            label: 'View Downloads',
            onClick: () => navigate({ name: 'downloads' }),
          },
        })
      } else {
        toast.error('Download failed', { description: 'Something went wrong. Please try again.' })
      }
    } finally {
      setDownloadLoading(false)
    }
  }, [videoId, isAuthenticated, openLogin, downloadLoading, navigate])

  const handleSave = useCallback(async () => {
    if (saveLoading) return
    setSaveLoading(true)

    const prevSaved = saved
    const prevId = watchLaterId

    if (saved && watchLaterId) {
      setSaved(false)
      setWatchLaterId(null)
      try {
        await watchLaterService.remove(watchLaterId)
        toast.success('Removed from Watch Later')
      } catch {
        setSaved(prevSaved)
        setWatchLaterId(prevId)
        toast.error('Failed to remove from Watch Later')
      }
    } else {
      setSaved(true)
      try {
        const res = await watchLaterService.add(videoId)
        if (res.data && typeof res.data === 'object' && 'id' in res.data) {
          setWatchLaterId((res.data as { id: string }).id)
        }
        toast.success('Saved to Watch Later')
      } catch {
        setSaved(prevSaved)
        toast.error('Failed to save to Watch Later')
      }
    }

    setSaveLoading(false)
  }, [videoId, saved, watchLaterId, saveLoading])

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
      {/* Like / Dislike group */}
      <div className="flex items-center rounded-full bg-secondary overflow-hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeLoading}
              className={cn(
                'rounded-none gap-1.5 px-3 sm:px-4 h-9',
                reaction === 'LIKE' && 'text-blue-600 dark:text-blue-400'
              )}
            >
              <ThumbsUp
                className={cn(
                  'w-5 h-5',
                  reaction === 'LIKE' && 'fill-current'
                )}
              />
              <span className="text-sm font-medium">
                {formatViewCount(likeCount)}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>I like this</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDislike}
              disabled={likeLoading}
              className={cn(
                'rounded-none gap-1.5 px-3 sm:px-4 h-9',
                reaction === 'DISLIKE' && 'text-blue-600 dark:text-blue-400'
              )}
            >
              <ThumbsDown
                className={cn(
                  'w-5 h-5',
                  reaction === 'DISLIKE' && 'fill-current'
                )}
              />
              <span className="text-sm font-medium">
                {formatViewCount(dislikeCount)}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>I dislike this</TooltipContent>
        </Tooltip>
      </div>

      {/* Share */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="gap-1.5 h-9 px-3 sm:px-4"
          >
            <Share className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Share</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share</TooltipContent>
      </Tooltip>

      {/* Download */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={downloadLoading}
            className="gap-1.5 h-9 px-3 sm:px-4"
          >
            {downloadLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowDownToLine className="w-5 h-5" />
            )}
            <span className="text-sm font-medium hidden sm:inline">
              {downloadLoading ? 'Downloading...' : 'Download'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Download video</TooltipContent>
      </Tooltip>

      {/* Save to Watch Later */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={saveLoading}
            className={cn(
              'gap-1.5 h-9 px-3 sm:px-4',
              saved && 'text-blue-600 dark:text-blue-400'
            )}
          >
            <Clock
              className={cn(
                'w-5 h-5',
                saved && 'fill-current'
              )}
            />
            <span className="text-sm font-medium hidden sm:inline">
              {saved ? 'Saved' : 'Save'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {saved ? 'Remove from Watch Later' : 'Save to Watch Later'}
        </TooltipContent>
      </Tooltip>

      {/* More */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
          >
            <Ellipsis className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>More actions</TooltipContent>
      </Tooltip>
    </div>
  )
}