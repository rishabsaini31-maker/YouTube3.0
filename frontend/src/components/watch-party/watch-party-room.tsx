'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWatchPartyStore } from '@/stores/watch-party-store'
import { useWatchPartySocket } from '@/hooks/use-watch-party-socket'
import { watchPartyService } from '@/services/watch-party-service'
import { SyncedVideoPlayer } from './synced-video-player'
import { WatchPartyChat } from './watch-party-chat'
import { WatchPartyParticipants } from './watch-party-participants'
import { WatchPartyVideoCall } from './watch-party-video-call'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/error-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ArrowLeft, Copy, Check, MessageSquare, Users, Phone, PhoneOff, LogOut, Shield, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { WatchPartyRoom, WatchPartyMessage } from '@/types'

interface WatchPartyRoomViewProps {
  roomId: string
}

export function WatchPartyRoomView({ roomId }: WatchPartyRoomViewProps) {
  const { navigate, back } = useRouterStore()
  const { user } = useAuthStore()
  const store = useWatchPartyStore()
  const { emit, socket } = useWatchPartySocket(roomId)

  const [roomData, setRoomData] = useState<WatchPartyRoom | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // Fetch room data from API
  const fetchRoom = useCallback(async () => {
    try {
      const res = await watchPartyService.getRoom(roomId)
      if (res.data) {
        setRoomData(res.data)
        // If user is the host, mark as host
        if (res.data.hostId === user?.profileId) {
          store.setIsHost(true)
        }
      }
    } catch (err) {
      setError('Room not found or has ended')
    } finally {
      setIsLoading(false)
    }
  }, [roomId, user?.profileId, store])

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await watchPartyService.getMessages(roomId)
      const msgs = (res as unknown as { data: WatchPartyMessage[]; hasMore: boolean }).data || []
      const hasMore = (res as unknown as { data: WatchPartyMessage[]; hasMore: boolean }).hasMore ?? false
      store.setMessages(
        msgs.map((m) => ({
          id: m.id,
          roomId: m.roomId,
          profileId: m.profileId,
          username: m.profile?.username || 'Unknown',
          avatarUrl: m.profile?.avatarUrl || null,
          content: m.content,
          type: m.type,
          createdAt: m.createdAt,
        })),
        hasMore
      )
    } catch {
      // Messages might be empty, that's ok
    }
  }, [roomId, store])

  // Join room via API
  const joinRoom = useCallback(async () => {
    if (!user?.profileId) return
    try {
      await watchPartyService.joinRoom(roomId, user.profileId)
    } catch {
      // Room might already be joined, that's fine
    }
  }, [roomId, user?.profileId])

  useEffect(() => {
    fetchRoom()
    joinRoom()
    fetchMessages()
  }, [fetchRoom, joinRoom, fetchMessages])

  // Handle host-specific events - update role when joining via socket
  useEffect(() => {
    if (roomData?.hostId === user?.profileId && socket?.current) {
      // Emit join as host role
      socket.current.emit('wp:join', {
        roomId,
        profileId: user.profileId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: 'host',
      })
    }
  }, [roomData?.hostId, user, roomId, socket])

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/watch-party/${roomId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success('Invite link copied!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleLeave = async () => {
    setIsLeaving(true)
    emit('wp:leave')
    store.reset()

    // If host, end the room
    if (roomData?.hostId === user?.profileId) {
      try {
        await watchPartyService.deleteRoom(roomId)
        toast.success('Watch party ended')
      } catch {
        // ignore
      }
    }

    navigate({ name: 'watch-party' })
  }

  const handleEndRoom = async () => {
    emit('wp:end-room')
    store.reset()
    try {
      await watchPartyService.deleteRoom(roomId)
      toast.success('Watch party ended')
    } catch {
      // ignore
    }
    navigate({ name: 'watch-party' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !roomData) {
    return (
      <div className="p-6">
        <Button variant="ghost" className="mb-4 gap-2" onClick={back}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <ErrorState
          title="Room not found"
          message="This watch party may have ended or doesn't exist."
          action={
            <Button onClick={() => navigate({ name: 'watch-party' })}>
              Browse Watch Parties
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Room Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={back}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold truncate">{store.roomTitle || roomData.title}</h1>
              {store.isHost && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                  HOST
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{roomId}</span>
              <span>·</span>
              <span>{store.participants.length} {store.participants.length === 1 ? 'person' : 'people'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={copyInviteLink}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Invite'}
          </Button>

          <Button
            variant={store.showParticipants ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={store.toggleParticipants}
          >
            <Users className="w-4 h-4" />
          </Button>

          <Button
            variant={store.showChat ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={store.toggleChat}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>

          <Button
            variant={store.isInCall ? 'destructive' : 'default'}
            size="icon"
            className="h-8 w-8"
            onClick={() => store.setInCall(!store.isInCall)}
          >
            {store.isInCall ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </Button>

          {store.isHost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEndRoom} className="text-destructive">
                  <Shield className="w-4 h-4 mr-2" />
                  End Room for Everyone
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={handleLeave}
            disabled={isLeaving}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <SyncedVideoPlayer
            roomId={roomId}
            emit={emit}
            videoId={store.videoId || roomData.videoId}
            isHost={store.isHost}
          />

          {/* Video call area below player */}
          {store.isInCall && (
            <div className="flex-shrink-0">
              <WatchPartyVideoCall roomId={roomId} emit={emit} />
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l flex flex-col flex-shrink-0 hidden md:flex">
          {store.showChat ? (
            <WatchPartyChat roomId={roomId} emit={emit} />
          ) : (
            <WatchPartyParticipants />
          )}
        </div>
      </div>

      {/* Mobile bottom panel toggle */}
      <div className="md:hidden flex border-t flex-shrink-0">
        <button
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${store.showChat ? 'bg-muted' : ''}`}
          onClick={store.toggleChat}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${store.showParticipants ? 'bg-muted' : ''}`}
          onClick={store.toggleParticipants}
        >
          <Users className="w-4 h-4" />
          People ({store.participants.length})
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${store.isInCall ? 'bg-destructive/10 text-destructive' : ''}`}
          onClick={() => store.setInCall(!store.isInCall)}
        >
          {store.isInCall ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          {store.isInCall ? 'Leave Call' : 'Join Call'}
        </button>
      </div>
    </div>
  )
}