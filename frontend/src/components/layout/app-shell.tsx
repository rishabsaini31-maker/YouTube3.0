'use client'

import type { ReactNode } from 'react'
import { Navbar } from './navbar'
import { Sidebar } from './sidebar'
import { AuthModal } from '@/components/auth/auth-modal'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useAuthStore } from '@/stores/auth-store'
import { useSidebarStore } from '@/stores/sidebar-store'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const isMobileOpen = useSidebarStore((s) => s.isMobileOpen)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex flex-1" style={{ marginTop: '56px' }}>
        <Sidebar />
        <main
          className={cn(
            'flex-1 min-w-0 transition-all duration-200',
            isCollapsed ? 'md:ml-0' : 'md:ml-0'
          )}
        >
          {children}
        </main>
      </div>
      <AuthModal />
    </div>
  )
}