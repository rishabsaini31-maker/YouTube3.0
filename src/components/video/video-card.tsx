'use client'

import { useRouterStore } from '@/stores/router-store'
import { formatDuration, formatViewCount, formatTimeAgo } from '@/lib/format'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { VideoWithChannel } from '@/types'

interface VideoCardProps {
  video: VideoWithChannel
  variant?: 'default' | 'horizontal' | 'compact'
}

export function VideoCard({ video, variant = 'default' }: VideoCardProps) {
  const { navigate } = useRouterStore()

  const handleClick = () => {
    navigate({ name: 'video', params: { id: video.id } })
  }

  const handleChannelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate({ name: 'channel', params: { id: video.channel.id } })
  }

  if (variant === 'horizontal') {
    return (
      <button
        onClick={handleClick}
        className="flex gap-2 w-full text-left group cursor-pointer"
      >
        <div className="relative flex-shrink-0 w-40 sm:w-44 aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={video.thumbnailUrl || '/uploads/thumbnails/placeholder.svg'}
            alt={video.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs font-medium px-1 py-0.5 rounded">
            {formatDuration(video.duration)}
          </span>
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-foreground/80">
            {video.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 hover:text-foreground/70 cursor-pointer"
            onClick={handleChannelClick}
          >
            {video.channel?.name || 'Unknown Channel'}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatViewCount(video.viewCount)} views · {formatTimeAgo(video.createdAt)}
          </p>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="flex flex-col w-full text-left group cursor-pointer"
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
        <img
          src={video.thumbnailUrl || '/uploads/thumbnails/placeholder.svg'}
          alt={video.title}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
        />
        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
          {formatDuration(video.duration)}
        </span>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
      </div>
      <div className="flex gap-3 mt-3">
        <Avatar
          className="h-9 w-9 flex-shrink-0 cursor-pointer"
          onClick={handleChannelClick}
        >
          <AvatarImage src={video.channel?.avatarUrl || undefined} alt={video.channel?.name || ''} />
          <AvatarFallback className="text-xs bg-zinc-700 text-white">
            {video.channel?.name?.[0] || 'C'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-foreground/80">
            {video.title}
          </h3>
          <p
            className="text-xs text-muted-foreground mt-1 hover:text-foreground/70 cursor-pointer truncate"
            onClick={handleChannelClick}
          >
            {video.channel?.name || 'Unknown Channel'}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatViewCount(video.viewCount)} views · {formatTimeAgo(video.createdAt)}
          </p>
        </div>
      </div>
    </button>
  )
}