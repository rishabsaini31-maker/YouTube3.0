import { createServer } from 'http'
import { Server } from 'socket.io'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  socketId: string
  profileId: string
  username: string
  avatarUrl: string | null
  role: 'host' | 'member'
  isMicOn: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
}

interface RoomState {
  roomId: string
  title: string
  videoId: string
  hostSocketId: string
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  participants: Map<string, Participant>
  createdAt: number
}

// ─── Server Setup ──────────────────────────────────────────────────────────────

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── In-Memory State ──────────────────────────────────────────────────────────

const rooms = new Map<string, RoomState>()
const socketToRoom = new Map<string, string>() // socketId -> roomId

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId)
}

function getParticipantList(room: RoomState): Omit<Participant, 'socketId'>[] {
  return Array.from(room.participants.values()).map((p) => ({
    profileId: p.profileId,
    username: p.username,
    avatarUrl: p.avatarUrl,
    role: p.role,
    isMicOn: p.isMicOn,
    isCameraOn: p.isCameraOn,
    isScreenSharing: p.isScreenSharing,
  }))
}

function broadcastToRoom(roomId: string, event: string, data: unknown, exclude?: string) {
  const room = rooms.get(roomId)
  if (!room) return
  for (const [socketId] of room.participants) {
    if (socketId !== exclude) {
      io.to(socketId).emit(event, data)
    }
  }
}

// ─── Socket Handlers ──────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WatchParty] Connected: ${socket.id}`)

  // ── Join Room ──
  socket.on('wp:join', (data: {
    roomId: string
    profileId: string
    username: string
    avatarUrl: string | null
    role: 'host' | 'member'
  }) => {
    const { roomId, profileId, username, avatarUrl, role } = data

    let room = rooms.get(roomId)

    if (!room) {
      // Host creates the room in memory on first join
      room = {
        roomId,
        title: '',
        videoId: '',
        hostSocketId: socket.id,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        playbackRate: 1,
        participants: new Map(),
        createdAt: Date.now(),
      }
      rooms.set(roomId, room)
    }

    // If participant already in room with different socket, remove old entry
    for (const [sid, p] of room.participants) {
      if (p.profileId === profileId && sid !== socket.id) {
        room.participants.delete(sid)
        socketToRoom.delete(sid)
        io.to(sid).emit('wp:kicked', { reason: 'rejoined_from_another_device' })
      }
    }

    const participant: Participant = {
      socketId: socket.id,
      profileId,
      username,
      avatarUrl,
      role,
      isMicOn: false,
      isCameraOn: false,
      isScreenSharing: false,
    }

    room.participants.set(socket.id, participant)
    socketToRoom.set(socket.id, roomId)

    // Join the socket.io room
    socket.join(roomId)

    // Send current state to the joining user
    socket.emit('wp:state', {
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      duration: room.duration,
      playbackRate: room.playbackRate,
      videoId: room.videoId,
      title: room.title,
      participants: getParticipantList(room),
      hostProfileId: room.participants.get(room.hostSocketId)?.profileId,
    })

    // Broadcast participant joined
    broadcastToRoom(roomId, 'wp:participant-joined', {
      participant: { profileId, username, avatarUrl, role, isMicOn: false, isCameraOn: false, isScreenSharing: false },
    }, socket.id)

    // Broadcast updated participant list
    broadcastToRoom(roomId, 'wp:participants', { participants: getParticipantList(room) })

    console.log(`[WatchParty] ${username} joined room ${roomId} (total: ${room.participants.size})`)
  })

  // ── Update Room Info (from host) ──
  socket.on('wp:update-room', (data: { title?: string; videoId?: string }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room || room.hostSocketId !== socket.id) return

    if (data.title !== undefined) room.title = data.title
    if (data.videoId !== undefined) room.videoId = data.videoId

    broadcastToRoom(roomId, 'wp:room-updated', {
      title: room.title,
      videoId: room.videoId,
    })
  })

  // ── Video Sync Events (from host only) ──
  socket.on('wp:play', () => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room || room.hostSocketId !== socket.id) return

    room.isPlaying = true
    broadcastToRoom(roomId, 'wp:play', { currentTime: room.currentTime })
  })

  socket.on('wp:pause', (data?: { currentTime: number }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room || room.hostSocketId !== socket.id) return

    room.isPlaying = false
    if (data?.currentTime !== undefined) room.currentTime = data.currentTime
    broadcastToRoom(roomId, 'wp:pause', { currentTime: room.currentTime })
  })

  socket.on('wp:seek', (data: { time: number }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room || room.hostSocketId !== socket.id) return

    room.currentTime = data.time
    broadcastToRoom(roomId, 'wp:seek', { time: data.time })
  })

  socket.on('wp:playback-rate', (data: { rate: number }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room || room.hostSocketId !== socket.id) return

    room.playbackRate = data.rate
    broadcastToRoom(roomId, 'wp:playback-rate', { rate: data.rate })
  })

  socket.on('wp:time-update', (data: { currentTime: number; duration: number }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room || room.hostSocketId !== socket.id) return

    room.currentTime = data.currentTime
    if (data.duration > 0) room.duration = data.duration
    // Periodic time sync - don't broadcast to everyone, just to non-host
    broadcastToRoom(roomId, 'wp:time-sync', { currentTime: data.currentTime }, socket.id)
  })

  socket.on('wp:video-ended', () => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room || room.hostSocketId !== socket.id) return

    room.isPlaying = false
    broadcastToRoom(roomId, 'wp:video-ended', {})
  })

  // ── Chat ──
  socket.on('wp:chat-message', (data: { content: string; profileId: string; username: string; avatarUrl: string | null }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      roomId,
      profileId: data.profileId,
      username: data.username,
      avatarUrl: data.avatarUrl,
      content: data.content,
      type: 'text',
      createdAt: new Date().toISOString(),
    }

    // Broadcast to everyone in the room including sender
    io.to(roomId).emit('wp:chat-message', message)
  })

  // ── WebRTC Signaling ──
  socket.on('wp:rtc:offer', (data: { targetProfileId: string; offer: RTCSessionDescriptionInit }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    // Find target socket
    for (const [sid, p] of room.participants) {
      if (p.profileId === data.targetProfileId) {
        io.to(sid).emit('wp:rtc:offer', {
          fromProfileId: room.participants.get(socket.id)?.profileId,
          offer: data.offer,
        })
        break
      }
    }
  })

  socket.on('wp:rtc:answer', (data: { targetProfileId: string; answer: RTCSessionDescriptionInit }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    for (const [sid, p] of room.participants) {
      if (p.profileId === data.targetProfileId) {
        io.to(sid).emit('wp:rtc:answer', {
          fromProfileId: room.participants.get(socket.id)?.profileId,
          answer: data.answer,
        })
        break
      }
    }
  })

  socket.on('wp:rtc:ice-candidate', (data: { targetProfileId: string; candidate: RTCIceCandidateInit }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    for (const [sid, p] of room.participants) {
      if (p.profileId === data.targetProfileId) {
        io.to(sid).emit('wp:rtc:ice-candidate', {
          fromProfileId: room.participants.get(socket.id)?.profileId,
          candidate: data.candidate,
        })
        break
      }
    }
  })

  // ── Media State Updates ──
  socket.on('wp:media-toggle', (data: { type: 'mic' | 'camera' | 'screen'; enabled: boolean }) => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room) return

    const participant = room.participants.get(socket.id)
    if (!participant) return

    if (data.type === 'mic') participant.isMicOn = data.enabled
    if (data.type === 'camera') participant.isCameraOn = data.enabled
    if (data.type === 'screen') participant.isScreenSharing = data.enabled

    broadcastToRoom(roomId, 'wp:media-toggle', {
      profileId: participant.profileId,
      type: data.type,
      enabled: data.enabled,
    })
  })

  // ── Leave Room ──
  socket.on('wp:leave', () => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    handleDisconnect(socket.id)
  })

  // ── End Room (host only) ──
  socket.on('wp:end-room', () => {
    const roomId = socketToRoom.get(socket.id)
    if (!roomId) return
    const room = rooms.get(roomId)
    if (!room || room.hostSocketId !== socket.id) return

    broadcastToRoom(roomId, 'wp:room-ended', { roomId })
    cleanupRoom(roomId)
  })

  // ── Disconnect ──
  socket.on('disconnect', () => {
    handleDisconnect(socket.id)
  })
})

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function handleDisconnect(socketId: string) {
  const roomId = socketToRoom.get(socketId)
  if (!roomId) return

  const room = rooms.get(roomId)
  if (!room) {
    socketToRoom.delete(socketId)
    return
  }

  const participant = room.participants.get(socketId)
  room.participants.delete(socketId)
  socketToRoom.delete(socketId)

  if (participant) {
    broadcastToRoom(roomId, 'wp:participant-left', {
      profileId: participant.profileId,
      username: participant.username,
    })
    broadcastToRoom(roomId, 'wp:participants', { participants: getParticipantList(room) })
    console.log(`[WatchParty] ${participant.username} left room ${roomId} (remaining: ${room.participants.size})`)
  }

  // If host left, pick a new host or close room
  if (socketId === room.hostSocketId) {
    if (room.participants.size === 0) {
      // No one left, clean up
      cleanupRoom(roomId)
    } else {
      // Transfer host to first remaining participant
      const [newHostSocketId, newHost] = room.participants.entries().next().value!
      newHost.role = 'host'
      room.hostSocketId = newHostSocketId

      broadcastToRoom(roomId, 'wp:host-changed', {
        newHostProfileId: newHost.profileId,
        newHostUsername: newHost.username,
      })
      broadcastToRoom(roomId, 'wp:participants', { participants: getParticipantList(room) })

      io.to(newHostSocketId).emit('wp:you-are-host', {})
      console.log(`[WatchParty] Host transferred to ${newHost.username} in room ${roomId}`)
    }
  }
}

function cleanupRoom(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return

  for (const [socketId] of room.participants) {
    socketToRoom.delete(socketId)
    io.sockets.sockets.get(socketId)?.leave(roomId)
  }

  rooms.delete(roomId)
  console.log(`[WatchParty] Room ${roomId} cleaned up`)
}

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`[WatchParty] Socket.IO server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[WatchParty] Shutting down...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('[WatchParty] Shutting down...')
  httpServer.close(() => process.exit(0))
})