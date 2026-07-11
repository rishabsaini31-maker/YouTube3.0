'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useWatchPartyStore } from '@/stores/watch-party-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Camera, CameraOff, Monitor, MonitorOff, PhoneOff, Disc } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface WatchPartyVideoCallProps {
  roomId: string
  emit: (event: string, data?: unknown) => void
}

export function WatchPartyVideoCall({ roomId, emit }: WatchPartyVideoCallProps) {
  const { participants, isInCall, isRecording, setRecording } = useWatchPartyStore()
  const { user } = useAuthStore()
  const { isHost } = useWatchPartyStore()

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const [isMicOn, setIsMicOn] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [showControls, setShowControls] = useState(true)

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  }

  // Get local media stream
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      setIsMicOn(true)
      setIsCameraOn(true)
      emit('wp:media-toggle', { type: 'mic', enabled: true })
      emit('wp:media-toggle', { type: 'camera', enabled: true })
      return stream
    } catch (err) {
      console.error('Failed to get media:', err)
      toast.error('Could not access camera/microphone')
      return null
    }
  }, [emit])

  // Create peer connection for a participant
  const createPeerConnection = useCallback(
    (targetProfileId: string) => {
      // Clean up existing connection
      const existing = peerConnectionsRef.current.get(targetProfileId)
      if (existing) {
        existing.close()
      }

      const pc = new RTCPeerConnection(ICE_SERVERS)

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Handle incoming tracks
      pc.ontrack = (event) => {
        const stream = event.streams[0]
        if (stream) {
          setRemoteStreams((prev) => {
            const next = new Map(prev)
            next.set(targetProfileId, stream)
            return next
          })
        }
      }

      // ICE candidate
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          emit('wp:rtc:ice-candidate', {
            targetProfileId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      peerConnectionsRef.current.set(targetProfileId, pc)
      return pc
    },
    [ICE_SERVERS, emit]
  )

  // Handle WebRTC signaling from socket (handled by the hook)
  // We expose methods for the room component to wire up
  useEffect(() => {
    // When a new participant joins (and we're already in a call), create an offer
    // This is handled by the socket hook's event listeners
    // For simplicity, we'll handle signaling through the socket events
    // The actual signal handling will be in the room component
  }, [])

  // Join call
  const handleJoinCall = useCallback(async () => {
    const stream = await getLocalStream()
    if (!stream) return

    // Create offers for all existing participants (except self)
    const otherParticipants = participants.filter((p) => p.profileId !== user?.profileId)
    for (const p of otherParticipants) {
      const pc = createPeerConnection(p.profileId)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        emit('wp:rtc:offer', { targetProfileId: p.profileId, offer: pc.localDescription?.toJSON() })
      } catch (err) {
        console.error('Failed to create offer for', p.profileId, err)
      }
    }
  }, [getLocalStream, createPeerConnection, emit, participants, user?.profileId])

  // Leave call
  const handleLeaveCall = useCallback(() => {
    // Close all peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()

    // Stop local stream
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null

    // Stop recording
    if (isRecording && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    setRemoteStreams(new Map())
    setIsMicOn(false)
    setIsCameraOn(false)
    setIsScreenSharing(false)
    emit('wp:media-toggle', { type: 'mic', enabled: false })
    emit('wp:media-toggle', { type: 'camera', enabled: false })
    emit('wp:media-toggle', { type: 'screen', enabled: false })
  }, [emit, isRecording])

  // Toggle mic
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      const enabled = audioTrack.enabled
      setIsMicOn(enabled)
      emit('wp:media-toggle', { type: 'mic', enabled })
    }
  }, [emit])

  // Toggle camera
  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      const enabled = videoTrack.enabled
      setIsCameraOn(enabled)
      emit('wp:media-toggle', { type: 'camera', enabled })
    }
  }, [emit])

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const videoTrack = stream.getVideoTracks()[0]

        // Replace camera track with screen share track
        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(videoTrack)
        })

        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        setIsScreenSharing(true)
        emit('wp:media-toggle', { type: 'screen', enabled: true })

        // Handle user stopping share from browser UI
        videoTrack.onended = () => {
          // Restore camera
          const camStream = localStreamRef.current
          if (camStream) {
            const camTrack = camStream.getVideoTracks()[0]
            if (camTrack) {
              peerConnectionsRef.current.forEach((pc) => {
                const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
                if (sender) sender.replaceTrack(camTrack)
              })
              if (localVideoRef.current) localVideoRef.current.srcObject = camStream
            }
          }
          setIsScreenSharing(false)
          emit('wp:media-toggle', { type: 'screen', enabled: false })
        }
      } else {
        // Stop screen share and restore camera
        const camStream = localStreamRef.current
        if (camStream) {
          const camTrack = camStream.getVideoTracks()[0]
          if (camTrack) {
            peerConnectionsRef.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
              if (sender) sender.replaceTrack(camTrack)
            })
            if (localVideoRef.current) localVideoRef.current.srcObject = camStream
          }
        }
        setIsScreenSharing(false)
        emit('wp:media-toggle', { type: 'screen', enabled: false })
      }
    } catch {
      toast.error('Screen sharing failed')
    }
  }, [isScreenSharing, emit])

  // Session recording (host only)
  const toggleRecording = useCallback(() => {
    if (!isRecording) {
      // Start recording
      const stream = localStreamRef.current
      if (!stream) {
        toast.error('Join the call first')
        return
      }

      // Combine local + remote streams for recording
      const combinedStream = new MediaStream()
      stream.getTracks().forEach((t) => combinedStream.addTrack(t))
      remoteStreams.forEach((rs) => rs.getTracks().forEach((t) => combinedStream.addTrack(t)))

      try {
        const recorder = new MediaRecorder(combinedStream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm',
        })
        recordedChunksRef.current = []
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data)
        }
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `watch-party-${roomId}-${new Date().toISOString().slice(0, 19)}.webm`
          a.click()
          URL.revokeObjectURL(url)
          toast.success('Recording saved!')
        }
        recorder.start(1000)
        mediaRecorderRef.current = recorder
        setRecording(true)
        toast.success('Recording started')
      } catch {
        toast.error('Recording not supported')
      }
    } else {
      // Stop recording
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setRecording(false)
    }
  }, [isRecording, remoteStreams, roomId, setRecording])

  // Auto-join call when isInCall becomes true
  const prevInCallRef = useRef(false)
  useEffect(() => {
    if (isInCall !== prevInCallRef.current) {
      prevInCallRef.current = isInCall
      // Use microtask to avoid synchronous setState in effect
      if (isInCall) {
        queueMicrotask(() => handleJoinCall())
      } else {
        queueMicrotask(() => handleLeaveCall())
      }
    }
  }, [isInCall, handleJoinCall, handleLeaveCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleLeaveCall()
    }
  }, [])

  // Expose signal handlers for the room to wire up
  // We'll use a global event system
  useEffect(() => {
    const handleOffer = (e: CustomEvent) => {
      const { fromProfileId, offer } = e.detail
      const pc = createPeerConnection(fromProfileId)
      pc.setRemoteDescription(new RTCSessionDescription(offer))
      pc.createAnswer().then((answer) => {
        pc.setLocalDescription(answer)
        emit('wp:rtc:answer', { targetProfileId: fromProfileId, answer: pc.localDescription?.toJSON() })
      })
    }

    const handleAnswer = (e: CustomEvent) => {
      const { fromProfileId, answer } = e.detail
      const pc = peerConnectionsRef.current.get(fromProfileId)
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(answer))
      }
    }

    const handleIceCandidate = (e: CustomEvent) => {
      const { fromProfileId, candidate } = e.detail
      const pc = peerConnectionsRef.current.get(fromProfileId)
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
    }

    window.addEventListener('wp:rtc:offer', handleOffer as EventListener)
    window.addEventListener('wp:rtc:answer', handleAnswer as EventListener)
    window.addEventListener('wp:rtc:ice-candidate', handleIceCandidate as EventListener)

    return () => {
      window.removeEventListener('wp:rtc:offer', handleOffer as EventListener)
      window.removeEventListener('wp:rtc:answer', handleAnswer as EventListener)
      window.removeEventListener('wp:rtc:ice-candidate', handleIceCandidate as EventListener)
    }
  }, [createPeerConnection, emit])

  const hasRemoteStreams = remoteStreams.size > 0

  return (
    <div className="border-t bg-zinc-950">
      {/* Remote video grid */}
      {hasRemoteStreams && (
        <div
          className="grid gap-1 p-1"
          style={{
            gridTemplateColumns: `repeat(${Math.min(remoteStreams.size, 4)}, minmax(0, 1fr))`,
            maxHeight: '200px',
          }}
        >
          {Array.from(remoteStreams.entries()).map(([profileId, stream]) => (
            <RemoteVideo key={profileId} stream={stream} name={participants.find((p) => p.profileId === profileId)?.username || ''} />
          ))}
        </div>
      )}

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        <Button
          variant={isMicOn ? 'secondary' : 'destructive'}
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={toggleMic}
          title={isMicOn ? 'Mute' : 'Unmute'}
        >
          {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>

        <Button
          variant={isCameraOn ? 'secondary' : 'destructive'}
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={toggleCamera}
          title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
        </Button>

        <Button
          variant={isScreenSharing ? 'secondary' : 'ghost'}
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        </Button>

        {/* Recording (host only) */}
        {isHost && (
          <Button
            variant={isRecording ? 'destructive' : 'ghost'}
            size="icon"
            className={cn('h-10 w-10 rounded-full', isRecording && 'animate-pulse')}
            onClick={toggleRecording}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <Disc className="w-4 h-4" />
          </Button>
        )}

        <Button
          variant="destructive"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => useWatchPartyStore.getState().setInCall(false)}
          title="Leave call"
        >
          <PhoneOff className="w-4 h-4" />
        </Button>
      </div>

      {/* Hidden local video element for stream reference */}
      <video ref={localVideoRef} className="hidden" autoPlay playsInline muted />
    </div>
  )
}

function RemoteVideo({ stream, name }: { stream: MediaStream; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
        {name}
      </div>
    </div>
  )
}