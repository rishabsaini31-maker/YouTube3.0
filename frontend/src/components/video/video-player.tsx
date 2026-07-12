'use client'

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture2,
  Theater,
  RotateCcw,
  RotateCw,
  Loader2,
  AlertCircle,
  RefreshCw,
  SkipForward,
  Repeat,
  Sun,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ─── Types ───────────────────────────────────────────────────────
interface NextVideoInfo {
  id: string
  title: string
  thumbnailUrl: string
  channelName: string
}

export interface VideoPlayerProps {
  videoId: string
  videoUrl?: string
  thumbnailUrl?: string
  onEnded?: () => void
  onRequestNext?: () => void
  nextVideo?: NextVideoInfo | null
  theaterMode?: boolean
  onTheaterModeChange?: (theater: boolean) => void
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const
const QUALITY_OPTIONS = ['Auto', '1080p', '720p', '480p', '360p'] as const

// ─── Component ───────────────────────────────────────────────────
export function VideoPlayer({
  videoId,
  thumbnailUrl,
  onEnded,
  onRequestNext,
  nextVideo,
  theaterMode: controlledTheater,
  onTheaterModeChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const gestureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; startY: number; side: 'left' | 'right' | null; type: 'seek' | null }>({
    x: 0,
    y: 0,
    startY: 0,
    side: null,
    type: null,
  })

  // ─── State ────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [bufferedRanges, setBufferedRanges] = useState<{ start: number; end: number }[]>([])
  const [buffering, setBuffering] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Playback speed
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [speedOverlay, setSpeedOverlay] = useState<string | null>(null)

  // Theater mode
  const [internalTheater, setInternalTheater] = useState(false)
  const theaterMode = controlledTheater ?? internalTheater
  const handleTheaterToggle = useCallback(() => {
    const next = !theaterMode
    if (onTheaterModeChange) onTheaterModeChange(next)
    else setInternalTheater(next)
  }, [theaterMode, onTheaterModeChange])

  // Loop
  const [loop, setLoop] = useState(false)

  // Quality (UI only)
  const [quality, setQuality] = useState<string>('Auto')

  // PiP
  const [pipSupported] = useState(() => typeof document !== 'undefined' && 'pictureInPictureEnabled' in document)

  // Up Next overlay
  const [showUpNext, setShowUpNext] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Gesture overlays
  const [seekGesture, setSeekGesture] = useState<{ direction: 'left' | 'right'; seconds: number } | null>(null)
  const [brightnessOverlay, setBrightnessOverlay] = useState<number | null>(null)
  const [volumeGesture, setVolumeGesture] = useState<number | null>(null)

  // Settings popover
  const [settingsOpen, setSettingsOpen] = useState(false)

  const videoSrc = useMemo(() => {
    if (videoUrl && (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))) {
      return videoUrl
    }
    return `/api/videos/stream/${videoId}`
  }, [videoId, videoUrl])

  // ─── Video element effects ────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = muted
  }, [volume, muted])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = playbackSpeed
  }, [playbackSpeed])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.loop = loop
  }, [loop])

  // Fullscreen listener
  useEffect(() => {
    function handleFullscreenChange() {
      setFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // ─── Speed overlay timeout ────────────────────────────────
  useEffect(() => {
    if (speedOverlay) {
      const t = setTimeout(() => setSpeedOverlay(null), 1200)
      return () => clearTimeout(t)
    }
  }, [speedOverlay])

  // ─── Seek gesture timeout ─────────────────────────────────
  useEffect(() => {
    if (seekGesture) {
      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current)
      gestureTimerRef.current = setTimeout(() => setSeekGesture(null), 800)
    }
    return () => {
      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current)
    }
  }, [seekGesture])

  // ─── Brightness/volume gesture timeout ────────────────────
  useEffect(() => {
    if (brightnessOverlay !== null) {
      const t = setTimeout(() => setBrightnessOverlay(null), 1000)
      return () => clearTimeout(t)
    }
  }, [brightnessOverlay])

  useEffect(() => {
    if (volumeGesture !== null) {
      const t = setTimeout(() => setVolumeGesture(null), 1000)
      return () => clearTimeout(t)
    }
  }, [volumeGesture])

  // ─── Auto-hide controls ──────────────────────────────────
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setShowControls(true)
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
        setSettingsOpen(false)
      }, 3000)
    }
  }, [playing])

  const handleMouseEnter = useCallback(() => {
    resetControlsTimeout()
  }, [resetControlsTimeout])

  const handleMouseMove = useCallback(() => {
    resetControlsTimeout()
  }, [resetControlsTimeout])

  const handleMouseLeave = useCallback(() => {
    if (playing) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
        setSettingsOpen(false)
      }, 1000)
    }
  }, [playing])

  // ─── Video event handlers ─────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration)
    setLoaded(true)
  }, [])

  const handleProgress = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.buffered.length || !video.duration) {
      setBufferedRanges([])
      return
    }
    const ranges: { start: number; end: number }[] = []
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({
        start: video.buffered.start(i),
        end: video.buffered.end(i),
      })
    }
    setBufferedRanges(ranges)
  }, [])

  const handleWaiting = useCallback(() => {
    setBuffering(true)
  }, [])

  const handleCanPlay = useCallback(() => {
    setBuffering(false)
  }, [])

  const handlePlaying = useCallback(() => {
    setBuffering(false)
    setPlaying(true)
  }, [])

  const handleError = useCallback(() => {
    setVideoError(true)
    setBuffering(false)
  }, [])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (loop) {
      const video = videoRef.current
      if (video) {
        video.currentTime = 0
        video.play().catch(() => {})
      }
      return
    }
    // Show Up Next if available, otherwise just call onEnded
    if (nextVideo) {
      setShowUpNext(true)
      setCountdown(10)
    } else {
      onEnded?.()
    }
  }, [loop, nextVideo, onEnded])

  const handlePlayNext = useCallback(() => {
    setShowUpNext(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
    onRequestNext?.()
  }, [onRequestNext])

  const handlePlayAgain = useCallback(() => {
    setShowUpNext(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      video.play().catch(() => {})
    }
  }, [])

  const handleCancelUpNext = useCallback(() => {
    setShowUpNext(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
    onEnded?.()
  }, [onEnded])

  // ─── Up Next countdown ────────────────────────────────────
  useEffect(() => {
    if (!showUpNext) return
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          handlePlayNext()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [showUpNext, handlePlayNext])

  // ─── Progress bar ─────────────────────────────────────────
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current
      const bar = progressRef.current
      if (!video || !bar) return
      const rect = bar.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, x / rect.width))
      video.currentTime = percentage * video.duration
    },
    []
  )

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    setHoverProgress(percentage)
  }, [])

  const handleProgressLeave = useCallback(() => {
    setHoverProgress(null)
  }, [])

  // ─── Volume ───────────────────────────────────────────────
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (val > 0) {
      setMuted(false)
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (muted) {
      setMuted(false)
      video.muted = false
    } else {
      setMuted(true)
      video.muted = true
    }
  }, [muted])

  // ─── Fullscreen ───────────────────────────────────────────
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
      // Fullscreen not supported or denied
    }
  }, [])

  // ─── PiP ──────────────────────────────────────────────────
  const togglePiP = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch {
      // PiP not supported or denied
    }
  }, [])

  // ─── Speed control ────────────────────────────────────────
  const changeSpeed = useCallback((newSpeed: number) => {
    setPlaybackSpeed(newSpeed)
    const label = newSpeed === 1 ? 'Normal' : `${newSpeed}x`
    setSpeedOverlay(label)
  }, [])

  const increaseSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(playbackSpeed as typeof SPEED_OPTIONS[number])
    if (idx < SPEED_OPTIONS.length - 1) {
      changeSpeed(SPEED_OPTIONS[idx + 1])
    }
  }, [playbackSpeed, changeSpeed])

  const decreaseSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(playbackSpeed as typeof SPEED_OPTIONS[number])
    if (idx > 0) {
      changeSpeed(SPEED_OPTIONS[idx - 1])
    }
  }, [playbackSpeed, changeSpeed])

  // ─── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const video = videoRef.current
      if (!video) return
      // Don't handle if user is in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case ' ':
        case 'k':
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
          video.currentTime = Math.max(0, video.currentTime - 5)
          break
        case 'ArrowRight':
          e.preventDefault()
          video.currentTime = Math.min(video.duration, video.currentTime + 5)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume((v) => Math.min(1, v + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume((v) => Math.max(0, v - 0.1))
          break
        case 'p':
        case 'P':
          e.preventDefault()
          togglePiP()
          break
        case 't':
        case 'T':
          e.preventDefault()
          handleTheaterToggle()
          break
        case 'l':
        case 'L':
          e.preventDefault()
          setLoop((prev) => !prev)
          break
        case 'n':
        case 'N':
          e.preventDefault()
          onRequestNext?.()
          break
        case 'Home':
          e.preventDefault()
          video.currentTime = 0
          break
        case 'End':
          e.preventDefault()
          video.currentTime = video.duration
          break
        case '>':
          if (e.shiftKey) {
            e.preventDefault()
            increaseSpeed()
          }
          break
        case '<':
          if (e.shiftKey) {
            e.preventDefault()
            decreaseSpeed()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, toggleFullscreen, toggleMute, togglePiP, handleTheaterToggle, increaseSpeed, decreaseSpeed, onRequestNext])

  // ─── Mobile gestures ──────────────────────────────────────
  const handleTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = touch.clientX - rect.left
    const halfW = rect.width / 2
    const side: 'left' | 'right' = x < halfW ? 'left' : 'right'

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      startY: touch.clientY,
      side,
      type: null,
    }
  }, [])

  const handleTouchMove = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const ref = touchStartRef.current
    if (!ref) return

    const deltaY = ref.startY - touch.clientY
    const absDeltaY = Math.abs(deltaY)

    if (absDeltaY > 20 && !ref.type) {
      ref.type = 'seek'
    }

    if (ref.type === 'seek') {
      if (ref.side === 'left') {
        // Brightness (visual only, no actual browser API)
        const brightness = Math.max(0, Math.min(1, (deltaY / 200) * 0.5 + 0.5))
        setBrightnessOverlay(Math.round(brightness * 100))
      } else {
        // Volume
        const newVol = Math.max(0, Math.min(1, volume + deltaY / 200))
        setVolume(newVol)
        if (newVol > 0) setMuted(false)
        else setMuted(true)
        setVolumeGesture(Math.round(newVol * 100))
      }
    }
  }, [volume])

  const handleTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      const touch = e.changedTouches[0]
      const ref = touchStartRef.current
      touchStartRef.current = { x: 0, y: 0, startY: 0, side: null, type: null }

      if (!ref) return

      // If no vertical swipe happened, check for tap / double-tap
      const deltaY = Math.abs(ref.startY - touch.clientY)
      if (deltaY < 15) {
        const now = Date.now()
        const lastTap = lastTapRef.current
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = touch.clientX - rect.left
        const halfW = rect.width / 2

        // Double tap detection
        if (
          lastTap &&
          now - lastTap.time < 300 &&
          Math.abs(touch.clientX - lastTap.x) < 40 &&
          Math.abs(touch.clientY - lastTap.y) < 40
        ) {
          lastTapRef.current = null
          const video = videoRef.current
          if (!video) return

          if (x < halfW) {
            // Seek backward 10s
            const newTime = Math.max(0, video.currentTime - 10)
            video.currentTime = newTime
            setSeekGesture({ direction: 'left', seconds: 10 })
          } else {
            // Seek forward 10s
            const newTime = Math.min(video.duration, video.currentTime + 10)
            video.currentTime = newTime
            setSeekGesture({ direction: 'right', seconds: 10 })
          }
        } else {
          // First tap – store and schedule single tap
          lastTapRef.current = { x: touch.clientX, y: touch.clientY, time: now }
        }
      }

      // Clear gesture overlays
      setBrightnessOverlay(null)
      setVolumeGesture(null)
    },
    []
  )

  // ─── Retry on error ───────────────────────────────────────
  const handleRetry = useCallback(() => {
    setVideoError(false)
    setLoaded(false)
    setBuffering(false)
    const video = videoRef.current
    if (video) {
      video.load()
    }
  }, [])

  // ─── Derived values ───────────────────────────────────────
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0
  const hoverTime =
    hoverProgress !== null && duration > 0 ? hoverProgress * duration : null

  const speedLabel = playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`

  // ─── Render ───────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-video bg-black rounded-xl overflow-hidden group select-none',
        theaterMode && 'rounded-none'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        poster={thumbnailUrl}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onPlaying={handlePlaying}
        onError={handleError}
        playsInline
      />

      {/* ── Loading skeleton ──────────────────────────────── */}
      {!loaded && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <span className="text-white/70 text-sm">Loading video...</span>
          </div>
        </div>
      )}

      {/* ── Error state ──────────────────────────────────── */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-white text-sm font-medium">Failed to load video</p>
            <p className="text-white/50 text-xs max-w-xs">
              The video could not be loaded. Please check your connection and try again.
            </p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Center play button (start) ────────────────────── */}
      {!playing && currentTime === 0 && !videoError && loaded && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200 cursor-pointer z-10"
          onClick={togglePlay}
          aria-label="Play video"
        >
          <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        </button>
      )}

      {/* ── Buffering spinner ────────────────────────────── */}
      <AnimatePresence>
        {buffering && loaded && !videoError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          >
            <Loader2 className="w-10 h-10 text-white animate-spin drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Speed overlay ────────────────────────────────── */}
      <AnimatePresence>
        {speedOverlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
          >
            <div className="bg-black/70 rounded-xl px-6 py-3">
              <span className="text-white text-2xl font-bold tabular-nums">{speedOverlay}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Seek gesture overlay ─────────────────────────── */}
      <AnimatePresence>
        {seekGesture && (
          <motion.div
            key={seekGesture.direction}
            initial={{ opacity: 0, x: seekGesture.direction === 'left' ? -30 : 30, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none',
              seekGesture.direction === 'left' ? 'left-[15%]' : 'right-[15%]'
            )}
          >
            <div className="bg-black/70 rounded-full px-5 py-4 flex items-center gap-2">
              {seekGesture.direction === 'left' ? (
                <RotateCcw className="w-6 h-6 text-white" />
              ) : (
                <RotateCw className="w-6 h-6 text-white" />
              )}
              <span className="text-white text-lg font-semibold tabular-nums">
                {seekGesture.seconds}s
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Brightness gesture overlay ───────────────────── */}
      <AnimatePresence>
        {brightnessOverlay !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/4 left-[15%] -translate-y-1/2 z-20 pointer-events-none"
          >
            <div className="bg-black/70 rounded-xl px-5 py-3 flex flex-col items-center gap-1">
              <Sun className="w-6 h-6 text-yellow-400" />
              <span className="text-white text-sm font-semibold tabular-nums">{brightnessOverlay}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Volume gesture overlay ───────────────────────── */}
      <AnimatePresence>
        {volumeGesture !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/4 right-[15%] -translate-y-1/2 z-20 pointer-events-none"
          >
            <div className="bg-black/70 rounded-xl px-5 py-3 flex flex-col items-center gap-1">
              {volumeGesture === 0 ? (
                <VolumeX className="w-6 h-6 text-white" />
              ) : volumeGesture < 50 ? (
                <Volume1 className="w-6 h-6 text-white" />
              ) : (
                <Volume2 className="w-6 h-6 text-white" />
              )}
              <span className="text-white text-sm font-semibold tabular-nums">{volumeGesture}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Up Next overlay ──────────────────────────────── */}
      <AnimatePresence>
        {showUpNext && nextVideo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/80 to-black/40 p-4 sm:p-6"
          >
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div className="relative w-40 sm:w-52 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                <img
                  src={nextVideo.thumbnailUrl}
                  alt={nextVideo.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  {countdown}s
                </div>
              </div>

              {/* Info + actions */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
                    Up Next
                  </p>
                  <h3 className="text-white text-sm sm:text-base font-medium line-clamp-2 leading-snug">
                    {nextVideo.title}
                  </h3>
                  <p className="text-white/50 text-xs mt-1">{nextVideo.channelName}</p>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handlePlayNext}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                    Next video
                  </button>
                  <button
                    onClick={handlePlayAgain}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white/20 text-white rounded-full text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Play Again
                  </button>
                  <button
                    onClick={handleCancelUpNext}
                    className="p-1.5 rounded-full hover:bg-white/20 text-white/60 hover:text-white transition-colors ml-auto"
                    aria-label="Cancel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controls overlay ─────────────────────────────── */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-2 px-3 transition-opacity duration-300 z-20',
          showControls && !showUpNext ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1.5 group/progress cursor-pointer mb-2 rounded-full"
          onClick={handleProgressClick}
          onMouseMove={handleProgressHover}
          onMouseLeave={handleProgressLeave}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-white/20 rounded-full" />

          {/* Buffered ranges */}
          {bufferedRanges.map((range, i) => {
            const startPct = (range.start / duration) * 100
            const widthPct = ((range.end - range.start) / duration) * 100
            return (
              <div
                key={i}
                className="absolute inset-y-0 bg-white/40 rounded-full"
                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
              />
            )
          })}

          {/* Progress */}
          <div
            className="absolute inset-y-0 left-0 bg-red-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-500 rounded-full shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercentage}% - 7px)` }}
          />

          {/* Hover time tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none"
              style={{ left: `${(hoverProgress ?? 0) * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Control buttons row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left controls */}
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause className="w-5 h-5" fill="white" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="white" />
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 group/volume">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 accent-white cursor-pointer"
                  aria-label="Volume"
                />
              </div>
            </div>

            {/* Time display */}
            <span className="text-white text-xs font-medium ml-2 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Loop indicator */}
            {loop && (
              <Repeat className="w-4 h-4 text-red-400 ml-1" />
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-0.5">
            {/* Settings popover */}
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'p-1.5 rounded-full hover:bg-white/20 transition-colors text-white',
                    settingsOpen && 'bg-white/20'
                  )}
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="w-72 bg-zinc-900 border-zinc-700 text-white p-0 shadow-xl"
              >
                {/* Playback speed section */}
                <div className="p-3 border-b border-zinc-700/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Playback Speed
                  </h4>
                  <div className="grid grid-cols-4 gap-1">
                    {SPEED_OPTIONS.map((spd) => {
                      const isActive = playbackSpeed === spd
                      return (
                        <button
                          key={spd}
                          onClick={() => {
                            changeSpeed(spd)
                          }}
                          className={cn(
                            'px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          {spd === 1 ? 'Normal' : `${spd}x`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Quality section */}
                <div className="p-3 border-b border-zinc-700/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Quality
                  </h4>
                  <div className="grid grid-cols-3 gap-1">
                    {QUALITY_OPTIONS.map((q) => {
                      const isActive = quality === q
                      return (
                        <button
                          key={q}
                          onClick={() => setQuality(q)}
                          className={cn(
                            'px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          {q}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Loop toggle */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-sm text-white/80">Loop</span>
                  <button
                    onClick={() => setLoop((prev) => !prev)}
                    className={cn(
                      'relative w-10 h-5.5 rounded-full transition-colors',
                      loop ? 'bg-red-500' : 'bg-white/20'
                    )}
                    role="switch"
                    aria-checked={loop}
                    aria-label="Toggle loop"
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform',
                        loop ? 'translate-x-[22px]' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Speed quick button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={increaseSpeed}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                  aria-label={`Playback speed: ${speedLabel}. Click to increase.`}
                >
                  <span className="text-xs font-semibold tabular-nums leading-none">
                    {speedLabel}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Playback speed (Shift+&gt;/&lt;)
              </TooltipContent>
            </Tooltip>

            {/* Theater mode */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleTheaterToggle}
                  className={cn(
                    'p-1.5 rounded-full hover:bg-white/20 transition-colors text-white',
                    theaterMode && 'bg-white/20'
                  )}
                  aria-label={theaterMode ? 'Exit theater mode' : 'Theater mode'}
                >
                  <Theater className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Theater mode (T)
              </TooltipContent>
            </Tooltip>

            {/* PiP */}
            {pipSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={togglePiP}
                    className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                    aria-label="Picture-in-Picture"
                  >
                    <PictureInPicture2 className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Picture-in-Picture (P)
                </TooltipContent>
              </Tooltip>
            )}

            {/* Fullscreen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {fullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Fullscreen (F)
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}