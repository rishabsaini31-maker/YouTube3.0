'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { useWatchPartyStore } from '@/stores/watch-party-store'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'

interface SyncedVideoPlayerProps {
  roomId: string
  emit: (event: string, data?: unknown) => void
  videoId: string
  isHost: boolean
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SyncedVideoPlayer({ roomId, emit, videoId, isHost }: SyncedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const store = useWatchPartyStore()
  const { isPlaying, currentTime, duration, playbackRate } = store

  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [isSeeking, setIsSeeking] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const videoSrc = `/api/videos/stream/${videoId}`

  // Sync video element with store state (for non-host)
  useEffect(() => {
    const video = videoRef.current
    if (!video || isHost) return

    // Sync play/pause
    if (isPlaying && video.paused) {
      video.play().catch(() => {})
    } else if (!isPlaying && !video.paused) {
      video.pause()
    }

    // Sync current time (only if not seeking locally and difference is significant)
    if (Math.abs(video.currentTime - currentTime) > 1.5 && !isSeeking) {
      video.currentTime = currentTime
    }
  }, [isPlaying, currentTime, isHost, isSeeking])

  // Sync playback rate
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackRate
  }, [playbackRate])

  // Sync volume/muted
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = muted
  }, [volume, muted])

  // Fullscreen change
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    setShowControls(true)
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [isPlaying])

  // Loading states
  const handleWaiting = useCallback(() => {
    setWaiting(true)
    setShowLoading(true)
  }, [])

  const handleCanPlay = useCallback(() => {
    setWaiting(false)
    setShowLoading(false)
  }, [])

  // Buffer progress
  const handleProgress = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.buffered.length || !video.duration) {
      setBuffered(0)
      return
    }
    const bufferedEnd = video.buffered.end(video.buffered.length - 1)
    setBuffered((bufferedEnd / video.duration) * 100)
  }, [])

  // Time update - emit to socket if host
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isHost && !isSeeking) {
      store.setPlaybackState({ currentTime: video.currentTime, duration: video.duration })
      // Emit time sync every 2 seconds
      if (Math.floor(video.currentTime) % 2 === 0) {
        emit('wp:time-update', { currentTime: video.currentTime, duration: video.duration })
      }
    }
  }, [isHost, isSeeking, emit, store])

  // Loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    store.setPlaybackState({ duration: video.duration })
  }, [store])

  // Video ended - host emits event
  const handleEnded = useCallback(() => {
    if (isHost) {
      store.setPlaybackState({ isPlaying: false })
      emit('wp:video-ended', {})
    }
  }, [isHost, emit, store])

  // Host controls
  const togglePlay = useCallback(() => {
    if (!isHost) return
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      store.setPlaybackState({ isPlaying: true })
      emit('wp:play', { currentTime: video.currentTime })
    } else {
      video.pause()
      store.setPlaybackState({ isPlaying: false })
      emit('wp:pause', { currentTime: video.currentTime })
    }
    resetControlsTimeout()
  }, [isHost, emit, store, resetControlsTimeout])

  const handleSeek = useCallback(
    (time: number) => {
      if (!isHost) return
      const video = videoRef.current
      if (!video) return
      video.currentTime = time
      store.setPlaybackState({ currentTime: time })
      // Debounce seek emit
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current)
      seekTimeoutRef.current = setTimeout(() => {
        emit('wp:seek', { time })
      }, 200)
    },
    [isHost, emit, store]
  )

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current
      const bar = e.currentTarget
      if (!video || !bar) return
      if (!isHost) return
      const rect = bar.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(1, x / rect.width))
      const time = pct * video.duration
      handleSeek(time)
      resetControlsTimeout()
    },
    [isHost, handleSeek, resetControlsTimeout]
  )

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const x = e.clientX - rect.left
    setHoverProgress(Math.max(0, Math.min(1, x / rect.width)))
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setMuted(!muted)
  }, [muted])

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // ignore
    }
  }, [])

  // Skip controls (host only)
  const skip = useCallback(
    (seconds: number) => {
      if (!isHost) return
      const video = videoRef.current
      if (!video) return
      const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
      handleSeek(newTime)
    },
    [isHost, handleSeek]
  )

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isSeeking) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(-10)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(10)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume((v) => Math.min(1, v + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume((v) => Math.max(0, v - 0.1))
          break
      }
      resetControlsTimeout()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, toggleFullscreen, toggleMute, skip, resetControlsTimeout, isSeeking])

  // Double tap for mobile
  const lastTapRef = useRef<{ time: number; x: number } | null>(null)
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0]
      const now = Date.now()
      const lastTap = lastTapRef.current
      if (lastTap && now - lastTap.time < 300) {
        // Double tap detected
        const container = containerRef.current
        if (!container || !isHost) return
        const rect = container.getBoundingClientRect()
        const x = touch.clientX - rect.left
        if (x < rect.width / 3) {
          skip(-10)
        } else if (x > (rect.width * 2) / 3) {
          skip(10)
        } else {
          togglePlay()
        }
        lastTapRef.current = null
      } else {
        lastTapRef.current = { time: now, x: touch.clientX }
      }
    },
    [isHost, skip, togglePlay]
  )

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const hoverTime = hoverProgress !== null && duration > 0 ? hoverProgress * duration : null

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none flex-shrink-0"
      onMouseEnter={resetControlsTimeout}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (isPlaying) {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
          controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 1000)
        }
      }}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full aspect-video object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onEnded={handleEnded}
        onPlay={() => { if (isHost) store.setPlaybackState({ isPlaying: true }) }}
        onPause={() => { if (isHost) store.setPlaybackState({ isPlaying: false }) }}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        playsInline
      />

      {/* Loading spinner */}
      {showLoading && waiting && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Center play button when paused at start */}
      {!isPlaying && currentTime === 0 && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity cursor-pointer"
          onClick={togglePlay}
          aria-label="Play video"
        >
          <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-2 px-3 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Progress bar */}
        <div
          className="relative h-1.5 group/progress cursor-pointer mb-2 rounded-full"
          onClick={handleProgressClick}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverProgress(null)}
        >
          <div className="absolute inset-0 bg-white/20 rounded-full" />
          <div
            className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
            style={{ width: `${buffered}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-red-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-500 rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPct}% - 7px)` }}
          />
          {hoverTime !== null && (
            <div
              className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none"
              style={{ left: `${(hoverProgress ?? 0) * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {isHost && (
              <button
                onClick={() => skip(-10)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                aria-label="Rewind 10 seconds"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={togglePlay}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="white" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="white" />
              )}
            </button>

            {isHost && (
              <button
                onClick={() => skip(10)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                aria-label="Forward 10 seconds"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            {/* Volume */}
            <div className="flex items-center gap-1 group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={[muted ? 0 : volume]}
                  onValueChange={([v]) => {
                    setVolume(v)
                    if (v > 0) setMuted(false)
                  }}
                  className="w-20 cursor-pointer"
                  aria-label="Volume"
                />
              </div>
            </div>

            <span className="text-white text-xs font-medium ml-2 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {!isHost && (
              <span className="text-white/50 text-[10px] ml-1">SYNCED</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isHost && (
              <select
                value={playbackRate}
                onChange={(e) => {
                  const rate = parseFloat(e.target.value)
                  store.setPlaybackState({ playbackRate: rate })
                  emit('wp:playback-rate', { rate })
                }}
                className="bg-white/10 text-white text-xs rounded px-1.5 py-1 cursor-pointer hover:bg-white/20 transition-colors border-0 outline-none"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r} className="bg-black text-white">
                    {r}x
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}