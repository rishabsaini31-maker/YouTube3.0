'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { watchPartyService } from '@/services/watch-party-service'
import { WatchPartyRoomView } from './watch-party-room'
import { CreateWatchPartyDialog } from './create-watch-party-dialog'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Copy, Plus, Users, Play, Link as LinkIcon, Check } from 'lucide-react'
import { toast } from 'sonner'
import { formatTimeAgo } from '@/lib/format'
import type { WatchPartyRoom, PaginatedResponse } from '@/types'

export function WatchPartyPage() {
  const { currentView } = useRouterStore()
  const roomId = currentView.params?.roomId || null

  // If we have a roomId in params, show the room view
  if (roomId) {
    return <WatchPartyRoomView roomId={roomId} />
  }

  // Otherwise show the room listing
  return <WatchPartyLobby />
}

function WatchPartyLobby() {
  const [rooms, setRooms] = useState<WatchPartyRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { navigate } = useRouterStore()

  const fetchRooms = useCallback(async (p: number) => {
    try {
      const res = await watchPartyService.listRooms({ page: String(p), pageSize: '12' })
      const data = res as unknown as PaginatedResponse<WatchPartyRoom>
      if (p === 1) {
        setRooms(data.data)
      } else {
        setRooms((prev) => [...prev, ...data.data])
      }
      setHasMore(data.hasMore)
      setPage(p)
    } catch {
      toast.error('Failed to load watch party rooms')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms(1)
  }, [fetchRooms])

  const handleJoinRoom = (roomId: string) => {
    navigate({ name: 'watch-party', params: { roomId } })
  }

  const handleJoinByCode = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    navigate({ name: 'watch-party', params: { roomId: code } })
    setJoinCode('')
  }

  const copyInviteLink = (roomId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#/watch-party/${roomId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(roomId)
      toast.success('Invite link copied!')
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleCreated = (room: WatchPartyRoom) => {
    setShowCreate(false)
    navigate({ name: 'watch-party', params: { roomId: room.roomId } })
  }

  return (
    <AuthGuard>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Watch Party</h1>
            <p className="text-sm text-muted-foreground mt-1">Watch videos together with friends in real-time</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2 self-start">
            <Plus className="w-4 h-4" />
            Create Watch Party
          </Button>
        </div>

        {/* Join by code */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Enter room code to join..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            className="max-w-sm"
          />
          <Button variant="secondary" onClick={handleJoinByCode} disabled={!joinCode.trim()}>
            Join
          </Button>
        </div>

        {/* Room list */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium mb-1">No active watch parties</h3>
            <p className="text-sm text-muted-foreground mb-4">Create one to start watching videos with friends</p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Watch Party
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="border rounded-xl p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleJoinRoom(room.roomId)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-muted">
                    {room.video?.thumbnailUrl ? (
                      <img src={room.video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded font-medium">
                      {room.participantCount ?? room.participants?.length ?? 1} {(room.participantCount ?? room.participants?.length ?? 1) === 1 ? 'person' : 'people'}
                    </div>
                  </div>

                  {/* Info */}
                  <h3 className="font-medium text-sm line-clamp-1 mb-1">{room.title}</h3>
                  {room.video && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{room.video.title}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Host: {room.host?.username || 'Unknown'}</span>
                      <span>·</span>
                      <span>{formatTimeAgo(room.createdAt)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyInviteLink(room.roomId)
                      }}
                    >
                      {copiedId === room.roomId ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Room code */}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <LinkIcon className="w-3 h-3" />
                    <span className="font-mono">{room.roomId}</span>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-6">
                <Button
                  variant="secondary"
                  onClick={() => fetchRooms(page + 1)}
                  disabled={isLoading}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && <CreateWatchPartyDialog onCreated={handleCreated} onClose={() => setShowCreate(false)} />}
    </AuthGuard>
  )
}