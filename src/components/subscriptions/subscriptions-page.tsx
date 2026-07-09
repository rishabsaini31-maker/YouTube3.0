'use client'

import { useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardSkeletonRow } from '@/components/video/video-card-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { subscriptionPageService, type SubscribedChannel } from '@/services/subscription-page-service'
import { subscriptionService } from '@/services/subscription-service'
import { formatSubscriberCount, formatTimeAgo } from '@/lib/format'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import type { VideoWithChannel, PaginatedResponse } from '@/types'
import { Rss, Users, UserMinus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function ChannelsTab() {
  const [channels, setChannels] = useState<SubscribedChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null)

  const fetchChannels = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await subscriptionPageService.getSubscribedChannels()
      setChannels(res.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const handleUnsubscribe = async (channelId: string, channelName: string) => {
    setUnsubscribing(channelId)
    try {
      await subscriptionService.toggleSubscribe(channelId)
      setChannels((prev) => prev.filter((ch) => ch.id !== channelId))
      toast.success(`Unsubscribed from ${channelName}`)
    } catch {
      toast.error('Failed to unsubscribe')
    } finally {
      setUnsubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card animate-pulse">
            <div className="h-20 w-20 rounded-full bg-muted" />
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-8 w-28 bg-muted rounded mt-2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Failed to load channels" onRetry={fetchChannels} />
  }

  if (channels.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-10 w-10 text-muted-foreground" />}
        title="No subscriptions yet"
        description="Subscribe to channels to see their content here."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {channels.map((channel) => (
        <div
          key={channel.id}
          className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card hover:shadow-md transition-shadow"
        >
          <Avatar className="h-20 w-20">
            <AvatarImage src={channel.avatarUrl || undefined} alt={channel.name} />
            <AvatarFallback className="text-2xl bg-zinc-700 text-white">
              {channel.name?.[0] || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="font-medium text-sm truncate max-w-[160px]">{channel.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatSubscriberCount(channel.subscriberCount)}
            </p>
            <p className="text-xs text-muted-foreground">
              Subscribed {formatTimeAgo(channel.subscribedAt)}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-1 text-xs"
            disabled={unsubscribing === channel.id}
            onClick={() => handleUnsubscribe(channel.id, channel.name)}
          >
            {unsubscribing === channel.id ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <UserMinus className="h-3 w-3 mr-1" />
            )}
            Unsubscribe
          </Button>
        </div>
      ))}
    </div>
  )
}

function LatestTab() {
  const [videos, setVideos] = useState<VideoWithChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchVideos = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(false)

    try {
      const res = await subscriptionPageService.getSubscriptionVideos(pageNum)
      const data = res as unknown as PaginatedResponse<VideoWithChannel>
      if (append) {
        setVideos((prev) => [...prev, ...data.data])
      } else {
        setVideos(data.data)
      }
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
    fetchVideos(1)
  }, [fetchVideos])

  const { sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading: loadingMore,
    onLoadMore: () => fetchVideos(page + 1, true),
  })

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <VideoCardSkeletonRow count={12} />
      </div>
    )
  }

  if (error) {
    return <ErrorState title="Failed to load videos" onRetry={() => fetchVideos(1)} />
  }

  if (videos.length === 0) {
    return (
      <EmptyState
        icon={<Rss className="h-10 w-10 text-muted-foreground" />}
        title="No videos from subscriptions"
        description="When channels you subscribe to upload new videos, they'll appear here."
      />
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      {loadingMore && (
        <div className="mt-4">
          <VideoCardSkeletonRow count={4} />
        </div>
      )}
      {hasMore && <div ref={sentinelRef} className="h-1" />}
      {!hasMore && videos.length > 0 && (
        <p className="text-center text-sm text-muted-foreground mt-8">
          You&apos;ve seen all recent videos from your subscriptions
        </p>
      )}
    </div>
  )
}

export function SubscriptionsPage() {
  return (
    <AuthGuard>
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold">Subscriptions</h1>
        </div>
        <Tabs defaultValue="latest" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
          </TabsList>
          <TabsContent value="latest">
            <LatestTab />
          </TabsContent>
          <TabsContent value="channels">
            <ChannelsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  )
}