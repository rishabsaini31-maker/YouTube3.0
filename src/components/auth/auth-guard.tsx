'use client'

import type { ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouterStore } from '@/stores/router-store'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading, openLogin } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>

    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <LogIn className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Sign in to continue</h2>
        <p className="text-muted-foreground max-w-md">
          You need to be signed in to access this feature. Sign in to your account or create a new one.
        </p>
        <div className="flex gap-3 mt-2">
          <Button onClick={openLogin} variant="outline">
            Sign in
          </Button>
          <Button
            onClick={() => {
              const store = useAuthStore.getState()
              store.openRegister()
            }}
          >
            Create account
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}