'use client'

import { useState, useCallback } from 'react'
import { ThumbsUp, ThumbsDown, Share, ArrowDownToLine, Clock, Ellipsis } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { likeService } from '@/services/like-service'
import { watchLaterService } from '@/services/watch-later-service'
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

  const handleLike = useCallback(async () => {
    if (likeLoading) return
    setLikeLoading(true)

    // Optimistic update
    const prevReaction = reaction
    const prevLikeCount = likeCount
    const prevDislikeCount = dislikeCount

    if (reaction === 'LIKE') {
      // Unliking
      setReaction(null)
      setLikeCount((c) => c - 1)
    } else {
      // Liking (or switching from dislike)
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
      // Revert on error
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
      // Undisliking
      setReaction(null)
      setDislikeCount((c) => c - 1)
    } else {
      // Disliking (or switching from like)
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

  const handleSave = useCallback(async () => {
    if (saveLoading) return
    setSaveLoading(true)

    const prevSaved = saved
    const prevId = watchLaterId

    if (saved && watchLaterId) {
      // Remove from watch later
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
      // Add to watch later
      setSaved(true)
      try {
        const res = await watchLaterService.add(videoId)
        // Store the entry id if returned
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

      {/* Download (UI only) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-9 px-3 sm:px-4"
          >
            <ArrowDownToLine className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Download</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Download</TooltipContent>
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

