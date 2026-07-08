'use client'

import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  User,
  Settings,
  History,
  Clock,
  ThumbsUp,
  ListVideo,
  LogOut,
  ChevronDown,
  Upload,
} from 'lucide-react'

export function UserMenu() {
  const { user, openLogin, logout } = useAuthStore()
  const { navigate } = useRouterStore()

  if (!user) {
    return (
      <button
        onClick={openLogin}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-500 text-blue-500 rounded-full text-sm font-medium hover:bg-blue-500/10 transition-colors"
      >
        <User className="h-4 w-4" />
        <span>Sign in</span>
      </button>
    )
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
          <AvatarFallback className="text-xs bg-purple-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
            <AvatarFallback className="bg-purple-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">@{user.username}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ name: 'your-videos' })}>
          <Upload className="mr-2 h-4 w-4" />
          Your channel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ name: 'settings' })}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ name: 'history' })}>
          <History className="mr-2 h-4 w-4" />
          History
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ name: 'watch-later' })}>
          <Clock className="mr-2 h-4 w-4" />
          Watch later
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ name: 'liked-videos' })}>
          <ThumbsUp className="mr-2 h-4 w-4" />
          Liked videos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ name: 'subscriptions' })}>
          <ListVideo className="mr-2 h-4 w-4" />
          Subscriptions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}