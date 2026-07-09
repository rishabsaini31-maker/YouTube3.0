'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { VideoCard } from '@/components/video/video-card'
import { VideoCardHorizontalSkeleton } from '@/components/video/video-card-skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatSubscriberCount } from '@/lib/format'
import { subscriptionService } from '@/services/subscription-service'
import type { VideoWithChannel, Channel, Profile } from '@/types'
import { Search, Users, Video, Loader2 } from 'lucide-react'

interface SearchResponse {
  videos: VideoWithChannel[]
  channels: (Channel & { profile?: Profile })[]
  total: number
  page: number
  pageSize: number
  totalVideos: number
  totalChannels: number
}

type FilterTab = 'all' | 'videos' | 'channels'

function ChannelResultCard({ channel }: { channel: Channel & { profile?: Profile } }) {
  const { isAuthenticated, openLogin, user } = useAuthStore()
  const { navigate } = useRouterStore()
  const [subscribed, setSubscribed] = useState(false)
  const [subCount, setSubCount] = useState(channel.subscriberCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      subscriptionService.checkSubscription(channel.id).then((res) => {
        if (res.data?.subscribed) setSubscribed(true)
      }).catch(() => {})
    }
  }, [isAuthenticated, user, channel.id])

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      openLogin()
      return
    }
    setLoading(true)
    try {
      const res = await subscriptionService.toggleSubscribe(channel.id)
      if (res.data) {
        setSubscribed(res.data.subscribed)
        setSubCount(res.data.subscriberCount)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={() => navigate({ name: 'channel', params: { id: channel.id } })}
      className="flex items-center gap-4 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors text-left cursor-pointer"
    >
      <Avatar className="h-16 w-16 flex-shrink-0">
        <AvatarImage src={channel.avatarUrl || undefined} alt={channel.name} />
        <AvatarFallback className="text-lg bg-zinc-700 text-white">
          {channel.name?.[0] || 'C'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate">{channel.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">@{channel.handle}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatSubscriberCount(subCount)}</p>
        {channel.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{channel.description}</p>
        )}
      </div>
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          variant={subscribed ? 'secondary' : 'default'}
          size="sm"
          className="rounded-full text-xs px-4 h-8"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
          {subscribed ? 'Subscribed' : 'Subscribe'}
        </Button>
      </div>
    </button>
  )
}

function ChannelCardSkeleton() {
  return (
    <div className="flex items-center gap-4 w-full p-3">
      <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
  )
}

export function SearchPage() {
  const { currentView, navigate } = useRouterStore()
  const query = currentView.params?.query || ''
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [accumulatedVideos, setAccumulatedVideos] = useState<VideoWithChannel[]>([])
  const [accumulatedChannels, setAccumulatedChannels] = useState<(Channel & { profile?: Profile })[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchSearch = useCallback(async (searchQuery: string, pageNum: number, filter: FilterTab, append = false) => {
    if (!searchQuery.trim()) {
      setResults(null)
      setAccumulatedVideos([])
      setAccumulatedChannels([])
      setError(null)
      return
    }

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: String(pageNum),
        pageSize: '20',
        filter,
      })

      const res = await fetch(`/api/search?${params.toString()}`)
      if (!res.ok) throw new Error('Search failed')

      const data: SearchResponse = await res.json()

      if (append) {
        setAccumulatedVideos((prev) => [...prev, ...data.videos])
        setAccumulatedChannels((prev) => [...prev, ...data.channels])
      } else {
        setAccumulatedVideos(data.videos)
        setAccumulatedChannels(data.channels)
      }
      setResults(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    setPage(1)
    setActiveTab('all')
    debounceRef.current = setTimeout(() => {
      fetchSearch(query, 1, 'all')
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, fetchSearch])

  // Re-fetch when tab changes
  useEffect(() => {
    if (!query.trim()) return
    setPage(1)
    fetchSearch(query, 1, activeTab)
  }, [activeTab, query, fetchSearch])

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && results && !loadingMore && !loading) {
          const hasMore = activeTab === 'all'
            ? results.total > (accumulatedVideos.length + accumulatedChannels.length)
            : activeTab === 'videos'
              ? results.totalVideos > accumulatedVideos.length
              : results.totalChannels > accumulatedChannels.length

          if (hasMore) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchSearch(query, nextPage, activeTab, true)
          }
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [results, loadingMore, loading, activeTab, accumulatedVideos.length, accumulatedChannels.length, page, query, fetchSearch])

  const hasMore = results
    ? activeTab === 'all'
      ? results.total > (accumulatedVideos.length + accumulatedChannels.length)
      : activeTab === 'videos'
        ? results.totalVideos > accumulatedVideos.length
        : results.totalChannels > accumulatedChannels.length
    : false

  const displayVideos = accumulatedVideos
  const displayChannels = accumulatedChannels

  const getResultLabel = () => {
    if (!results || loading) return ''
    const count = activeTab === 'all'
      ? results.total
      : activeTab === 'videos'
        ? results.totalVideos
        : results.totalChannels
    return `${count.toLocaleString()} result${count !== 1 ? 's' : ''}`
  }

  // Empty query
  if (!query.trim()) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <EmptyState
          icon={<Search className="h-10 w-10 text-muted-foreground" />}
          title="Search ViewTube"
          description="Type something in the search bar to find videos and channels."
        />
      </div>
    )
  }

  // Error state
  if (error && !results) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <ErrorState
          message={error}
          onRetry={() => fetchSearch(query, 1, activeTab)}
        />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Query display */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Search results for <span className="font-semibold text-foreground">&quot;{query}&quot;</span>
          {results && !loading && (
            <Badge variant="secondary" className="ml-2 font-normal">
              {getResultLabel()}
            </Badge>
          )}
        </p>
      </div>

      {/* Filter tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
        className="mb-6"
      >
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
            <Search className="h-3.5 w-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-1.5 text-xs sm:text-sm">
            <Video className="h-3.5 w-3.5" />
            Videos
            {results && (
              <span className="text-muted-foreground ml-0.5">
                {results.totalVideos > 0 ? results.totalVideos : ''}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" />
            Channels
            {results && (
              <span className="text-muted-foreground ml-0.5">
                {results.totalChannels > 0 ? results.totalChannels : ''}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Initial loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardHorizontalSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <>
          {/* No results */}
          {results.total === 0 && (
            <EmptyState
              icon={<Search className="h-10 w-10 text-muted-foreground" />}
              title="No results found"
              description={`No videos or channels match "${query}". Try different keywords.`}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ name: 'home' })}
                >
                  Go Home
                </Button>
              }
            />
          )}

          {/* All tab */}
          {activeTab === 'all' && results.total > 0 && (
            <div className="space-y-1">
              {displayChannels.map((channel) => (
                <ChannelResultCard key={`ch-${channel.id}`} channel={channel} />
              ))}
              {displayChannels.length > 0 && displayVideos.length > 0 && (
                <Separator className="my-4" />
              )}
              {displayVideos.map((video) => (
                <VideoCard key={video.id} video={video} variant="horizontal" />
              ))}
            </div>
          )}

          {/* Videos only tab */}
          {activeTab === 'videos' && displayVideos.length > 0 && (
            <div className="space-y-1">
              {displayVideos.map((video) => (
                <VideoCard key={video.id} video={video} variant="horizontal" />
              ))}
            </div>
          )}

          {/* Channels only tab */}
          {activeTab === 'channels' && displayChannels.length > 0 && (
            <div className="space-y-1">
              {displayChannels.map((channel) => (
                <ChannelResultCard key={`ch-${channel.id}`} channel={channel} />
              ))}
            </div>
          )}

          {/* Filtered tab empty */}
          {!loading && results.total > 0 && activeTab !== 'all' && (
            (activeTab === 'videos' && displayVideos.length === 0) ||
            (activeTab === 'channels' && displayChannels.length === 0)
          ) && (
            <EmptyState
              icon={activeTab === 'videos' ? <Video className="h-10 w-10 text-muted-foreground" /> : <Users className="h-10 w-10 text-muted-foreground" />}
              title={`No ${activeTab} found`}
              description={`No ${activeTab} match "${query}". Try the other tab.`}
            />
          )}

          {/* Load more sentinel */}
          {hasMore && <div ref={loadMoreRef} className="py-4" />}

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="space-y-4 py-2">
              {activeTab === 'channels' ? (
                Array.from({ length: 3 }).map((_, i) => <ChannelCardSkeleton key={i} />)
              ) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <VideoCardHorizontalSkeleton key={i} />
                ))
              )}
            </div>
          )}

          {/* End of results */}
          {!hasMore && (displayVideos.length > 0 || displayChannels.length > 0) && activeTab === 'all' && results && (displayVideos.length + displayChannels.length) >= results.total && (
            <p className="text-xs text-muted-foreground text-center py-6">
              You&apos;ve seen all results
            </p>
          )}
        </>
      )}
    </div>
  )
}