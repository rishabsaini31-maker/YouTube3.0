'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { videoService } from '@/services/video-service'
import { subscriptionService } from '@/services/subscription-service'
import { api, ApiError } from '@/services/api'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardSkeletonRow } from '@/components/video/video-card-skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { formatSubscriberCount } from '@/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Video, Calendar, Film } from 'lucide-react'
import type { Channel, VideoWithChannel, PaginatedResponse, ApiResponse } from '@/types'

interface ChannelData extends Channel {
  isSubscribed?: boolean
  profile?: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    bannerUrl: string | null
  }
}

export function ChannelPage() {
  const { currentView } = useRouterStore()
  const { isAuthenticated, openLogin } = useAuthStore()
  const channelId = currentView.params?.id || ''

  const [channel, setChannel] = useState<ChannelData | null>(null)
  const [videos, setVideos] = useState<VideoWithChannel[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingChannel, setIsLoadingChannel] = useState(true)
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [activeTab, setActiveTab] = useState('videos')
  const isFirstLoad = useRef(true)

  // Fetch channel info
  const fetchChannel = useCallback(async () => {
    if (!channelId) return
    setIsLoadingChannel(true)
    setError(null)

    try {
      const res = await api.get<ApiResponse<ChannelData>>(`/api/channels/${channelId}`)
      if (!res.data) {
        setError('Channel not found')
        return
      }
      setChannel(res.data)
    } catch {
      setError('Failed to load channel')
    } finally {
      setIsLoadingChannel(false)
    }
  }, [channelId])

  // Fetch channel videos
  const fetchVideos = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!channelId) return
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoadingVideos(true)
      }

      try {
        const res = await videoService.getVideos({
          page: pageNum,
          channelId,
        })

        if (append) {
          setVideos((prev) => [...prev, ...res.data])
        } else {
          setVideos(res.data)
        }

        setHasMore(res.hasMore)
        setPage(pageNum)
      } catch {
        if (!append) {
          setError('Failed to load videos')
        }
      } finally {
        setIsLoadingVideos(false)
        setIsLoadingMore(false)
        isFirstLoad.current = false
      }
    },
    [channelId]
  )

  useEffect(() => {
    setChannel(null)
    setVideos([])
    setPage(1)
    setHasMore(true)
    setIsLoadingChannel(true)
    setIsLoadingVideos(true)
    setError(null)
    isFirstLoad.current = true

    fetchChannel()
    fetchVideos(1, false)
  }, [channelId, fetchChannel, fetchVideos])

  // Infinite scroll for videos
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    fetchVideos(page + 1, true)
  }, [hasMore, isLoadingMore, page, fetchVideos])

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMore,
  })

  // Subscribe/Unsubscribe handler
  const handleSubscribe = async () => {
    if (!channelId) return
    if (!isAuthenticated) {
      openLogin()
      return
    }

    setIsSubscribing(true)
    try {
      const res = await subscriptionService.toggleSubscribe(channelId)
      const newSubscribed = res.data?.subscribed ?? false
      const newCount = res.data?.subscriberCount ?? channel?.subscriberCount ?? 0

      setChannel((prev) =>
        prev ? { ...prev, isSubscribed: newSubscribed, subscriberCount: newCount } : prev
      )

      toast.success(newSubscribed ? 'Subscribed!' : 'Unsubscribed')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription')
    } finally {
      setIsSubscribing(false)
    }
  }

  // Join date formatter
  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // ==================== LOADING STATE ====================
  if (isLoadingChannel) {
    return <ChannelPageSkeleton />
  }

  // ==================== ERROR STATE ====================
  if (error && !channel) {
    return (
      <ErrorState
        title="Channel not available"
        message="This channel doesn't exist or has been removed."
        onRetry={fetchChannel}
      />
    )
  }

  if (!channel) {
    return (
      <ErrorState
        title="Channel not found"
        message="This channel doesn't exist."
      />
    )
  }

  // ==================== MAIN RENDER ====================
  return (
    <div className="flex flex-col">
      {/* Banner */}
      <div className="w-full aspect-[4/1] sm:aspect-[5/1] max-h-[200px] sm:max-h-[250px] relative overflow-hidden">
        {channel.bannerUrl ? (
          <img
            src={channel.bannerUrl}
            alt={`${channel.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800" />
        )}
      </div>

      {/* Channel Info */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Avatar */}
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 border-2 border-background shadow-lg -mt-10 sm:-mt-12 relative z-10">
            <AvatarImage src={channel.avatarUrl || undefined} alt={channel.name} />
            <AvatarFallback className="text-2xl sm:text-3xl bg-zinc-700 text-white">
              {channel.name?.[0]?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>

          {/* Name & Stats */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{channel.name}</h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">
              @{channel.handle}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatSubscriberCount(channel.subscriberCount)} · {channel.videoCount} video
              {channel.videoCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Subscribe Button */}
          <Button
            onClick={handleSubscribe}
            disabled={isSubscribing}
            variant={channel.isSubscribed ? 'outline' : 'default'}
            size="lg"
            className="flex-shrink-0 min-w-[120px]"
          >
            {isSubscribing ? (
              <LoadingSpinner className="py-0" />
            ) : channel.isSubscribed ? (
              'Subscribed'
            ) : (
              'Subscribe'
            )}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="h-10">
            <TabsTrigger value="videos" className="gap-1.5 text-sm px-4">
              <Video className="h-4 w-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-1.5 text-sm px-4">
              <Film className="h-4 w-4" />
              About
            </TabsTrigger>
          </TabsList>

          <Separator className="mt-0" />

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-0 pt-4">
            {isLoadingVideos && isFirstLoad.current ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                <VideoCardSkeletonRow count={8} />
              </div>
            ) : error && videos.length === 0 ? (
              <ErrorState
                title="Failed to load videos"
                message="Something went wrong while loading videos."
                onRetry={() => fetchVideos(1, false)}
              />
            ) : videos.length === 0 ? (
              <EmptyState
                icon={<Video className="h-10 w-10 text-muted-foreground" />}
                title="No videos yet"
                description="This channel hasn't uploaded any videos yet."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>

                {isLoadingMore && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 mt-8">
                    <VideoCardSkeletonRow count={4} />
                  </div>
                )}

                {!hasMore && videos.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    You&apos;ve seen all {channel.videoCount} video
                    {channel.videoCount !== 1 ? 's' : ''} from this channel
                  </p>
                )}

                <div ref={sentinelRef} className="h-1" />
              </>
            )}
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-0 pt-6">
            <div className="max-w-2xl space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Description
                </h3>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {channel.description || 'No description provided.'}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Stats
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>
                      <span className="font-medium">{channel.videoCount}</span> video
                      {channel.videoCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>Joined {formatJoinDate(channel.createdAt)}</span>
                  </div>
                </div>
              </div>

              {channel.handle && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Links
                    </h3>
                    <p className="text-sm text-primary hover:underline cursor-pointer">
                      viewtube.com/@{channel.handle}
                    </p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ==================== SKELETON ====================
function ChannelPageSkeleton() {
  return (
    <div className="flex flex-col">
      {/* Banner skeleton */}
      <Skeleton className="w-full aspect-[4/1] sm:aspect-[5/1] max-h-[200px] sm:max-h-[250px]" />

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Avatar skeleton */}
          <Skeleton className="h-20 w-20 sm:h-24 sm:w-24 rounded-full flex-shrink-0 -mt-10 sm:-mt-12 relative z-10" />

          {/* Info skeleton */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-48 max-w-full" />
            <Skeleton className="h-5 w-32 max-w-full" />
            <Skeleton className="h-4 w-40 max-w-full" />
          </div>

          {/* Button skeleton */}
          <Skeleton className="h-10 w-32 rounded-md flex-shrink-0" />
        </div>

        {/* Tabs skeleton */}
        <div className="mt-6 space-y-4">
          <div className="flex gap-1">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
          <Skeleton className="w-full h-px" />

          {/* Video grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 pt-4">
            <VideoCardSkeletonRow count={8} />
          </div>
        </div>
      </div>
    </div>
  )
}