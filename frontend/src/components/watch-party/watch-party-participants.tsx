'use client'

import { useWatchPartyStore } from '@/stores/watch-party-store'
import { useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Mic, MicOff, Camera, CameraOff, Monitor, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function WatchPartyParticipants() {
  const { participants } = useWatchPartyStore()
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b flex-shrink-0">
        <h3 className="text-sm font-semibold">People ({participants.length})</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Host first */}
          {participants
            .filter((p) => p.role === 'host')
            .map((p) => (
              <ParticipantRow key={p.profileId} participant={p} isOwn={p.profileId === user?.profileId} />
            ))}

          {/* Divider if we have both */}
          {participants.some((p) => p.role === 'host') && participants.some((p) => p.role === 'member') && (
            <div className="border-t my-2" />
          )}

          {/* Members */}
          {participants
            .filter((p) => p.role === 'member')
            .map((p) => (
              <ParticipantRow key={p.profileId} participant={p} isOwn={p.profileId === user?.profileId} />
            ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function ParticipantRow({
  participant,
  isOwn,
}: {
  participant: { profileId: string; username: string; avatarUrl: string | null; role: string; isMicOn: boolean; isCameraOn: boolean; isScreenSharing: boolean }
  isOwn: boolean
}) {
  const initials = participant.username?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-2 py-2 rounded-lg',
        isOwn && 'bg-primary/5'
      )}
    >
      <Avatar className="h-8 w-8 flex-shrink-0 relative">
        <AvatarImage src={participant.avatarUrl || undefined} alt={participant.username} />
        <AvatarFallback className="bg-zinc-700 text-white text-xs">{initials}</AvatarFallback>
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">
            {participant.username}
            {isOwn && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
          </span>
          {participant.role === 'host' && (
            <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {participant.isScreenSharing && (
          <div className="p-1 rounded bg-green-500/10">
            <Monitor className="w-3 h-3 text-green-500" />
          </div>
        )}
        {participant.isCameraOn ? (
          <div className="p-1 rounded">
            <Camera className="w-3 h-3 text-muted-foreground" />
          </div>
        ) : (
          <div className="p-1 rounded">
            <CameraOff className="w-3 h-3 text-muted-foreground/50" />
          </div>
        )}
        {participant.isMicOn ? (
          <div className="p-1 rounded">
            <Mic className="w-3 h-3 text-muted-foreground" />
          </div>
        ) : (
          <div className="p-1 rounded">
            <MicOff className="w-3 h-3 text-red-400" />
          </div>
        )}
      </div>
    </div>
  )
}