'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { videoService } from '@/services/video-service'
import { subscriptionService } from '@/services/subscription-service'
import { VideoPlayer } from '@/components/video/video-player'
import { VideoActions } from '@/components/video/video-actions'
import { SuggestedVideos } from '@/components/video/suggested-videos'
import { CommentSection } from '@/components/comment/comment-section'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatViewCount, formatTimeAgo, formatSubscriberCount } from '@/lib/format'
import { toast } from 'sonner'
import type { VideoWithChannel } from '@/types'

export function VideoPlayerPage() {
  const { currentView, navigate } = useRouterStore()
  const { user, isAuthenticated, openLogin } = useAuthStore()
  const videoId = currentView.params?.id || ''

  const [video, setVideo] = useState<VideoWithChannel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [dislikeCount, setDislikeCount] = useState(0)
  const [userReaction, setUserReaction] = useState<'LIKE' | 'DISLIKE' | null>(null)
  const [showFullDescription, setShowFullDescription] = useState(false)

  const fetchVideo = useCallback(async () => {
    if (!videoId) return
    setIsLoading(true)
    setError(null)

    try {
      const data = await videoService.getVideo(videoId)
      setVideo(data)
      setLikeCount(data.likeCount)
      setDislikeCount(data.dislikeCount)

      if (data.channel) {
        setSubscriberCount(data.channel.subscriberCount)
        if (isAuthenticated) {
          try {
            const subRes = await subscriptionService.checkSubscription(data.channel.id)
            setIsSubscribed(subRes.data?.subscribed || false)
          } catch {
            // ignore
          }
        }
      }

      if (user?.profileId) {
        videoService.recordView(videoId, user.profileId).catch(() => {})
      }
    } catch {
      setError('Failed to load video')
    } finally {
      setIsLoading(false)
    }
  }, [videoId, isAuthenticated, user?.profileId])

  useEffect(() => {
    fetchVideo()
  }, [fetchVideo])

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      openLogin()
      return
    }
    if (!video?.channel) return

    try {
      const res = await subscriptionService.toggleSubscribe(video.channel.id)
      setIsSubscribed(res.data?.subscribed || false)
      if (res.data) setSubscriberCount(res.data.subscriberCount)
    } catch {
      toast.error('Failed to update subscription')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !video) {
    return (
      <ErrorState
        title="Video not found"
        message="This video may have been removed or is unavailable."
        onRetry={fetchVideo}
      />
    )
  }

  const channel = video.channel
  const initials = channel?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6">
      <div className="flex-1 min-w-0">
        {/* Video Player */}
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
          <VideoPlayer videoId={video.id} thumbnailUrl={video.thumbnailUrl} />
        </div>

        {/* Video Title */}
        <h1 className="text-lg sm:text-xl font-semibold mt-3 leading-snug">
          {video.title}
        </h1>

        {/* Channel Info + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
          <div className="flex items-center gap-3">
            <Avatar
              className="h-10 w-10 cursor-pointer flex-shrink-0"
              onClick={() => channel && navigate({ name: 'channel', params: { id: channel.id } })}
            >
              <AvatarImage src={channel?.avatarUrl || undefined} alt={channel?.name || ''} />
              <AvatarFallback className="bg-zinc-700 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="mr-2">
              <button
                className="text-sm font-medium hover:text-foreground/80 transition-colors"
                onClick={() => channel && navigate({ name: 'channel', params: { id: channel.id } })}
              >
                {channel?.name || 'Unknown Channel'}
              </button>
              <p className="text-xs text-muted-foreground">
                {formatSubscriberCount(subscriberCount)}
              </p>
            </div>
            <Button
              variant={isSubscribed ? 'secondary' : 'default'}
              size="sm"
              className="rounded-full"
              onClick={handleSubscribe}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </Button>
          </div>

          <VideoActions
            videoId={video.id}
            likeCount={likeCount}
            dislikeCount={dislikeCount}
            initialReaction={userReaction}
          />
        </div>

        <Separator className="my-4" />

        {/* Description */}
        <div className="bg-muted/40 rounded-xl p-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <span>{formatViewCount(video.viewCount)} views</span>
            <span>·</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
            {video.category !== 'All' && (
              <>
                <span>·</span>
                <span>{video.category}</span>
              </>
            )}
          </div>
          <p className={`text-sm whitespace-pre-line ${!showFullDescription ? 'line-clamp-3' : ''}`}>
            {video.description}
          </p>
          {video.description.length > 200 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-sm font-medium mt-1 hover:text-foreground/80"
            >
              {showFullDescription ? 'Show less' : 'Show more'}
            </button>
          )}
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-sm cursor-pointer hover:bg-blue-500/20 transition-colors"
                  onClick={() => navigate({ name: 'search', params: { query: tag } })}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Comments */}
        <CommentSection videoId={video.id} />
      </div>

      {/* Suggested Videos Sidebar */}
      <div className="w-full lg:w-96 flex-shrink-0">
        <SuggestedVideos
          currentVideoId={video.id}
          channelId={channel?.id || ''}
          category={video.category}
        />
      </div>
    </div>
  )
}