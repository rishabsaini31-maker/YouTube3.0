'use client'

import { useEffect } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { HomePage } from '@/components/home/home-page'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Film } from 'lucide-react'

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-4 sm:p-6">
      <EmptyState
        icon={<Film className="h-10 w-10 text-muted-foreground" />}
        title={title}
        description="This section is coming in the next phase."
      />
    </div>
  )
}

function ProtectedPlaceholder({ title }: { title: string }) {
  return (
    <AuthGuard>
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={<Film className="h-10 w-10 text-muted-foreground" />}
          title={title}
          description="This section is coming in the next phase."
        />
      </div>
    </AuthGuard>
  )
}

function MainContent() {
  const { currentView, initFromHash } = useRouterStore()

  useEffect(() => {
    initFromHash()
  }, [initFromHash])

  switch (currentView.name) {
    case 'home':
      return <HomePage />
    case 'video':
      return <PlaceholderPage title="Video Player" />
    case 'channel':
      return <PlaceholderPage title="Channel Page" />
    case 'search':
      return <PlaceholderPage title={`Search: "${currentView.params?.query || ''}"`} />
    case 'upload':
      return <ProtectedPlaceholder title="Upload Video" />
    case 'history':
      return <ProtectedPlaceholder title="Watch History" />
    case 'watch-later':
      return <ProtectedPlaceholder title="Watch Later" />
    case 'liked-videos':
      return <ProtectedPlaceholder title="Liked Videos" />
    case 'subscriptions':
      return <ProtectedPlaceholder title="Subscriptions" />
    case 'settings':
      return <ProtectedPlaceholder title="Settings" />
    case 'your-videos':
      return <ProtectedPlaceholder title="Your Videos" />
    case 'profile':
      return <PlaceholderPage title="Profile" />
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