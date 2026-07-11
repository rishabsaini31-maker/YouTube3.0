'use client'

import { useEffect } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { HomePage } from '@/components/home/home-page'
import { VideoPlayerPage } from '@/components/video/video-player-page'
import { ChannelPage } from '@/components/channel/channel-page'
import { SearchPage } from '@/components/search/search-page'
import { UploadModal } from '@/components/upload/upload-modal'
import { HistoryPage } from '@/components/history/history-page'
import { WatchLaterPage } from '@/components/watch-later-page/watch-later-page'
import { LikedVideosPage } from '@/components/liked-videos/liked-videos-page'
import { SubscriptionsPage } from '@/components/subscriptions/subscriptions-page'
import { YourVideosPage } from '@/components/your-videos/your-videos-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { WatchPartyPage } from '@/components/watch-party/watch-party-page'
import { DownloadsPage } from '@/components/downloads/downloads-page'
import { PricingPage } from '@/components/pricing/pricing-page'
import { CommentModerationPage } from '@/components/moderation/comment-moderation-page'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

function MainContent() {
  const { currentView, initFromHash } = useRouterStore()

  useEffect(() => {
    initFromHash()
  }, [initFromHash])

  switch (currentView.name) {
    case 'home':
      return <HomePage />
    case 'video':
      return <VideoPlayerPage />
    case 'channel':
      return <ChannelPage />
    case 'search':
      return <SearchPage />
    case 'upload':
      return <UploadModal />
    case 'history':
      return <HistoryPage />
    case 'watch-later':
      return <WatchLaterPage />
    case 'liked-videos':
      return <LikedVideosPage />
    case 'subscriptions':
      return <SubscriptionsPage />
    case 'settings':
      return <SettingsPage />
    case 'your-videos':
      return <YourVideosPage />
    case 'watch-party':
      return <WatchPartyPage />
    case 'downloads':
      return <DownloadsPage />
    case 'pricing':
      return <PricingPage />
    case 'moderation':
      return <CommentModerationPage />
    default:
      return <HomePage />
  }
}

export default function Page() {
  const { fetchSession, isLoading } = useAuthStore()

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <AppShell>
      <MainContent />
    </AppShell>
  )
}