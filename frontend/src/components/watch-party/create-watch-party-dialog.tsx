'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { watchPartyService } from '@/services/watch-party-service'
import { yourVideosService } from '@/services/your-videos-service'
import type { WatchPartyRoom, VideoWithChannel } from '@/types'

interface CreateWatchPartyDialogProps {
  onCreated: (room: WatchPartyRoom) => void
  onClose: () => void
}

export function CreateWatchPartyDialog({ onCreated, onClose }: CreateWatchPartyDialogProps) {
  const [title, setTitle] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [videos, setVideos] = useState<VideoWithChannel[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      const res = await yourVideosService.getYourVideos({ page: '1', pageSize: '50' })
      const data = res as unknown as { data: VideoWithChannel[] }
      setVideos(data.data || [])
    } catch {
      toast.error('Failed to load your videos')
    } finally {
      setIsLoadingVideos(false)
    }
  }

  const filteredVideos = searchQuery
    ? videos.filter((v) =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : videos

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a room title')
      return
    }
    if (!selectedVideoId) {
      toast.error('Please select a video')
      return
    }

    setIsCreating(true)
    try {
      const res = await watchPartyService.createRoom({
        videoId: selectedVideoId,
        title: title.trim(),
      })
      if (res.data) {
        toast.success('Watch party created!')
        onCreated(res.data)
      }
    } catch {
      toast.error('Failed to create watch party')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Watch Party</DialogTitle>
          <DialogDescription>Start a synchronized viewing session with friends</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="wp-title">Room Title</Label>
            <Input
              id="wp-title"
              ref={titleRef}
              placeholder="e.g. Movie Night, Coding Session..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Video Search */}
          <div className="space-y-2">
            <Label>Video</Label>
            <Input
              placeholder="Search your videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Video list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {isLoadingVideos ? (
              <div className="text-sm text-muted-foreground text-center py-8">Loading videos...</div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                {searchQuery ? 'No videos match your search' : 'No videos found. Upload a video first!'}
              </div>
            ) : (
              filteredVideos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedVideoId(video.id)}
                  className={`w-full flex gap-3 p-2 rounded-lg text-left transition-colors ${
                    selectedVideoId === video.id
                      ? 'bg-primary/10 ring-1 ring-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="w-28 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {video.channel?.name || 'Unknown'}
                    </p>
                  </div>
                  {selectedVideoId === video.id && (
                    <div className="flex-shrink-0 flex items-center">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !title.trim() || !selectedVideoId}>
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}