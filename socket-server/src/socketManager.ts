import { Server, Socket } from 'socket.io';

export interface WatchPartySocketParticipant {
  profileId: string;
  username: string;
  avatarUrl: string | null;
  role: 'host' | 'member';
  media?: {
    mic: boolean;
    camera: boolean;
    screen: boolean;
  };
}

interface RoomState {
  roomId: string;
  videoId: string | null;
  title: string | null;
  hostProfileId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  participants: Map<string, WatchPartySocketParticipant>;
}

const rooms = new Map<string, RoomState>();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('[WatchParty] Socket connected:', socket.id);
    let currentRoomId: string | null = null;
    let currentProfileId: string | null = null;

    socket.on('wp:join', (data: {
      roomId: string;
      profileId: string;
      username: string;
      avatarUrl: string | null;
      role: 'host' | 'member';
    }) => {
      const { roomId, profileId, username, avatarUrl, role } = data;
      socket.join(roomId);
      currentRoomId = roomId;
      currentProfileId = profileId;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          roomId,
          videoId: null,
          title: null,
          hostProfileId: profileId,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          playbackRate: 1,
          participants: new Map()
        });
      }

      const room = rooms.get(roomId)!;
      const isFirst = room.participants.size === 0;
      
      const newParticipant: WatchPartySocketParticipant = {
        profileId,
        username,
        avatarUrl,
        role: isFirst ? 'host' : 'member',
        media: { mic: false, camera: false, screen: false }
      };

      if (isFirst) {
        room.hostProfileId = profileId;
      } else if (!room.hostProfileId) {
        // If host left, assign to new person joining or first available
        room.hostProfileId = profileId;
        newParticipant.role = 'host';
      }

      room.participants.set(profileId, newParticipant);

      // Send initial state to user
      socket.emit('wp:state', {
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        duration: room.duration,
        playbackRate: room.playbackRate,
        videoId: room.videoId,
        title: room.title,
        participants: Array.from(room.participants.values()),
        hostProfileId: room.hostProfileId
      });

      if (newParticipant.role === 'host') {
        socket.emit('wp:you-are-host');
      }

      // Tell others
      socket.to(roomId).emit('wp:participant-joined', {
        participant: newParticipant
      });
    });

    socket.on('wp:play', (data: { currentTime?: number }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room && data.currentTime !== undefined) {
        room.currentTime = data.currentTime;
        room.isPlaying = true;
      }
      socket.to(currentRoomId).emit('wp:play', data);
    });

    socket.on('wp:pause', (data: { currentTime: number }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) {
        room.currentTime = data.currentTime;
        room.isPlaying = false;
      }
      socket.to(currentRoomId).emit('wp:pause', data);
    });

    socket.on('wp:seek', (data: { time: number }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) room.currentTime = data.time;
      socket.to(currentRoomId).emit('wp:seek', data);
    });

    socket.on('wp:playback-rate', (data: { rate: number }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) room.playbackRate = data.rate;
      socket.to(currentRoomId).emit('wp:playback-rate', data);
    });

    socket.on('wp:time-sync', (data: { currentTime: number }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('wp:time-sync', data);
    });

    socket.on('wp:chat-message', (data: any) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('wp:chat-message', data);
    });

    socket.on('wp:media-toggle', (data: { profileId: string; type: 'mic' | 'camera' | 'screen'; enabled: boolean }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) {
        const p = room.participants.get(data.profileId);
        if (p && p.media) {
          p.media[data.type] = data.enabled;
        }
      }
      socket.to(currentRoomId).emit('wp:media-toggle', data);
    });

    socket.on('wp:leave', () => {
      handleLeave(socket, currentRoomId, currentProfileId);
      currentRoomId = null;
      currentProfileId = null;
    });

    socket.on('disconnect', () => {
      handleLeave(socket, currentRoomId, currentProfileId);
    });
  });

  function handleLeave(socket: Socket, roomId: string | null, profileId: string | null) {
    if (!roomId || !profileId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(profileId);
    if (participant) {
      room.participants.delete(profileId);
      socket.to(roomId).emit('wp:participant-left', {
        profileId,
        username: participant.username
      });

      if (room.hostProfileId === profileId) {
        // Assign new host
        const newHost = Array.from(room.participants.values())[0];
        if (newHost) {
          newHost.role = 'host';
          room.hostProfileId = newHost.profileId;
          io.to(roomId).emit('wp:host-changed', {
            newHostProfileId: newHost.profileId,
            newHostUsername: newHost.username
          });
        } else {
          room.hostProfileId = null;
          rooms.delete(roomId); // cleanup empty room
        }
      }
    }
  }
}
