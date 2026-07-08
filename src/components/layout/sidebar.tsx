'use client'

import { useRouterStore } from '@/stores/router-store'
import { useSidebarStore } from '@/stores/sidebar-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Home,
  PlaySquare,
  Clock,
  ThumbsUp,
  ListVideo,
  Settings,
  Film,
  Compass,
  Briefcase,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItem {
  icon: React.ElementType
  label: string
  viewName: string
  auth?: boolean
  params?: Record<string, string>
}

const mainItems: SidebarItem[] = [
  { icon: Home, label: 'Home', viewName: 'home' },
  { icon: PlaySquare, label: 'Shorts', viewName: 'home' },
  { icon: ListVideo, label: 'Subscriptions', viewName: 'subscriptions', auth: true },
]

const libraryItems: SidebarItem[] = [
  { icon: History, label: 'History', viewName: 'history', auth: true },
  { icon: Clock, label: 'Watch later', viewName: 'watch-later', auth: true },
  { icon: ThumbsUp, label: 'Liked videos', viewName: 'liked-videos', auth: true },
  { icon: Film, label: 'Your videos', viewName: 'your-videos', auth: true },
]

const exploreItems: SidebarItem[] = [
  { icon: Compass, label: 'Trending', viewName: 'home' },
  { icon: Briefcase, label: 'Settings', viewName: 'settings', auth: true },
]

function SidebarItemButton({
  item,
  isCollapsed,
  isActive,
  onClick,
}: {
  item: SidebarItem
  isCollapsed: boolean
  isActive: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  const button = (
    <Button
      variant="ghost"
      className={cn(
        'w-full h-10 gap-5 font-normal text-sm justify-start relative group',
        isCollapsed && 'justify-center gap-0 px-0',
        isActive &&
          'bg-muted font-medium'
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
      {isActive && !isCollapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-foreground rounded-r-full" />
      )}
    </Button>
  )

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="font-normal">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

export function Sidebar() {
  const { currentView, navigate } = useRouterStore()
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebarStore()
  const { isAuthenticated, openLogin } = useAuthStore()

  const handleItemClick = (item: SidebarItem) => {
    if (item.auth && !isAuthenticated) {
      closeMobile()
      openLogin()
      return
    }
    navigate({ name: item.viewName as never, params: item.params })
    closeMobile()
  }

  const isItemActive = (item: SidebarItem) => {
    if (item.viewName === 'home' && currentView.name === 'home') return true
    if (item.viewName !== 'home' && item.viewName === currentView.name) return true
    return false
  }

  const sidebarContent = (
    <ScrollArea className="h-full py-2">
      <div className={cn('flex flex-col px-2', isCollapsed && 'px-1')}>
        {mainItems.map((item) => (
          <SidebarItemButton
            key={item.label}
            item={item}
            isCollapsed={isCollapsed}
            isActive={isItemActive(item)}
            onClick={() => handleItemClick(item)}
          />
        ))}

        <Separator className="my-2" />

        {!isCollapsed && (
          <p className="text-sm font-medium text-muted-foreground px-3 mb-1">Library</p>
        )}
        {libraryItems.map((item) => (
          <SidebarItemButton
            key={item.label}
            item={item}
            isCollapsed={isCollapsed}
            isActive={isItemActive(item)}
            onClick={() => handleItemClick(item)}
          />
        ))}

        <Separator className="my-2" />

        {!isCollapsed && (
          <p className="text-sm font-medium text-muted-foreground px-3 mb-1">Explore</p>
        )}
        {exploreItems.map((item) => (
          <SidebarItemButton
            key={item.label}
            item={item}
            isCollapsed={isCollapsed}
            isActive={isItemActive(item)}
            onClick={() => handleItemClick(item)}
          />
        ))}
      </div>
    </ScrollArea>
  )

  // Mobile overlay
  if (isMobileOpen) {
    return (
      <div className="fixed inset-0 z-30 md:hidden">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={closeMobile}
        />
        <aside
          className="absolute left-0 top-0 bottom-0 w-64 bg-background z-10 shadow-xl"
          style={{ paddingTop: '56px' }}
        >
          {sidebarContent}
        </aside>
      </div>
    )
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col flex-shrink-0 bg-background border-r border-border overflow-hidden transition-all duration-200',
        isCollapsed ? 'w-[72px]' : 'w-60'
      )}
      style={{ height: 'calc(100vh - 56px)', marginTop: '56px', position: 'sticky', top: '56px' }}
    >
      {sidebarContent}
    </aside>
  )
}