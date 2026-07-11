'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { useWatchPartyStore } from '@/stores/watch-party-store'
import type { WatchPartySocketParticipant, WatchPartyChatMessage } from '@/types'

const SOCKET_PORT = 3004

export function useWatchPartySocket(roomId: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const user = useAuthStore((s) => s.user)

  // Get stable store action references via selectors
  const setPlaybackState = useWatchPartyStore((s) => s.setPlaybackState)
  const setRoomInfo = useWatchPartyStore((s) => s.setRoomInfo)
  const setRoomLoaded = useWatchPartyStore((s) => s.setRoomLoaded)
  const setParticipants = useWatchPartyStore((s) => s.setParticipants)
  const addParticipant = useWatchPartyStore((s) => s.addParticipant)
  const removeParticipant = useWatchPartyStore((s) => s.removeParticipant)
  const addMessage = useWatchPartyStore((s) => s.addMessage)
  const updateParticipantMedia = useWatchPartyStore((s) => s.updateParticipantMedia)
  const setHostProfileId = useWatchPartyStore((s) => s.setHostProfileId)
  const setIsHost = useWatchPartyStore((s) => s.setIsHost)
  const reset = useWatchPartyStore((s) => s.reset)

  const storeVideoId = useWatchPartyStore((s) => s.videoId)
  const storeRoomTitle = useWatchPartyStore((s) => s.roomTitle)
  const storeHostProfileId = useWatchPartyStore((s) => s.hostProfileId)

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  // Connect / disconnect
  useEffect(() => {
    if (!roomId || !user?.profileId) return

    const socket = io('/?XTransformPort=' + SOCKET_PORT, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[WatchParty] Socket connected')
      socket.emit('wp:join', {
        roomId,
        profileId: user.profileId,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: 'member',
      })
    })

    // ── Receive initial state ──
    socket.on('wp:state', (data: {
      isPlaying: boolean
      currentTime: number
      duration: number
      playbackRate: number
      videoId: string
      title: string
      participants: WatchPartySocketParticipant[]
      hostProfileId: string | null
    }) => {
      setPlaybackState({
        isPlaying: data.isPlaying,
        currentTime: data.currentTime,
        duration: data.duration,
        playbackRate: data.playbackRate,
      })
      setRoomInfo({
        videoId: data.videoId,
        title: data.title,
        hostProfileId: data.hostProfileId,
      })
      setParticipants(data.participants)
      setRoomLoaded(true)

      if (data.hostProfileId === user.profileId) {
        setIsHost(true)
      }
    })

    // ── You are now the host ──
    socket.on('wp:you-are-host', () => {
      setIsHost(true)
    })

    // ── Host changed ──
    socket.on('wp:host-changed', (data: { newHostProfileId: string; newHostUsername: string }) => {
      setHostProfileId(data.newHostProfileId)
      if (data.newHostProfileId === user.profileId) {
        setIsHost(true)
      }
    })

    // ── Video sync events (received by non-host) ──
    socket.on('wp:play', (data: { currentTime?: number }) => {
      setPlaybackState({ isPlaying: true, currentTime: data.currentTime })
    })

    socket.on('wp:pause', (data: { currentTime: number }) => {
      setPlaybackState({ isPlaying: false, currentTime: data.currentTime })
    })

    socket.on('wp:seek', (data: { time: number }) => {
      setPlaybackState({ currentTime: data.time })
    })

    socket.on('wp:playback-rate', (data: { rate: number }) => {
      setPlaybackState({ playbackRate: data.rate })
    })

    socket.on('wp:time-sync', (data: { currentTime: number }) => {
      setPlaybackState({ currentTime: data.currentTime })
    })

    socket.on('wp:video-ended', () => {
      setPlaybackState({ isPlaying: false })
    })

    // ── Room info update ──
    socket.on('wp:room-updated', (data: { title?: string; videoId?: string }) => {
      if (data.title !== undefined) setRoomInfo({ videoId: storeVideoId, title: data.title, hostProfileId: storeHostProfileId })
      if (data.videoId !== undefined) setRoomInfo({ videoId: data.videoId, title: storeRoomTitle, hostProfileId: storeHostProfileId })
    })

    // ── Participants ──
    socket.on('wp:participant-joined', (data: { participant: WatchPartySocketParticipant }) => {
      addParticipant(data.participant)
    })

    socket.on('wp:participant-left', (data: { profileId: string; username: string }) => {
      removeParticipant(data.profileId)
      // Add system message
      addMessage({
        id: `sys_${Date.now()}`,
        roomId: roomId!,
        profileId: 'system',
        username: 'System',
        avatarUrl: null,
        content: `${data.username} left the room`,
        type: 'system',
        createdAt: new Date().toISOString(),
      })
    })

    socket.on('wp:participants', (data: { participants: WatchPartySocketParticipant[] }) => {
      setParticipants(data.participants)
    })

    // ── Chat ──
    socket.on('wp:chat-message', (data: WatchPartyChatMessage) => {
      addMessage(data)
    })

    // ── Media toggles ──
    socket.on('wp:media-toggle', (data: { profileId: string; type: 'mic' | 'camera' | 'screen'; enabled: boolean }) => {
      updateParticipantMedia(data.profileId, data.type, data.enabled)
    })

    // ── Room ended ──
    socket.on('wp:room-ended', () => {
      reset()
    })

    // ── Kicked ──
    socket.on('wp:kicked', () => {
      reset()
    })

    return () => {
      if (socket.connected) {
        socket.emit('wp:leave')
      }
      socket.disconnect()
      socketRef.current = null
    }
  }, [
    roomId, user?.profileId, user?.username, user?.avatarUrl,
    setPlaybackState, setRoomInfo, setRoomLoaded, setParticipants,
    addParticipant, removeParticipant, addMessage, updateParticipantMedia,
    setHostProfileId, setIsHost, reset,
    storeVideoId, storeRoomTitle, storeHostProfileId,
  ])

  return {
    socket: socketRef,
    emit,
  }
}