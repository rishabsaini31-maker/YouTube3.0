import { create } from 'zustand'
import type { WatchPartySocketParticipant, WatchPartyChatMessage } from '@/types'

interface WatchPartyStore {
  // Room state (received from socket)
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  videoId: string
  roomTitle: string
  hostProfileId: string | null
  isHost: boolean
  isRoomLoaded: boolean

  // Participants
  participants: WatchPartySocketParticipant[]

  // Chat
  messages: WatchPartyChatMessage[]
  hasMoreMessages: boolean

  // UI state
  showChat: boolean
  showParticipants: boolean
  isInCall: boolean
  isRecording: boolean

  // Actions
  setPlaybackState: (state: {
    isPlaying?: boolean
    currentTime?: number
    duration?: number
    playbackRate?: number
  }) => void
  setRoomInfo: (info: { videoId: string; title: string; hostProfileId: string | null }) => void
  setRoomLoaded: (loaded: boolean) => void
  setParticipants: (participants: WatchPartySocketParticipant[]) => void
  addParticipant: (participant: WatchPartySocketParticipant) => void
  removeParticipant: (profileId: string) => void
  updateParticipantMedia: (profileId: string, type: 'mic' | 'camera' | 'screen', enabled: boolean) => void
  addMessage: (message: WatchPartyChatMessage) => void
  setMessages: (messages: WatchPartyChatMessage[], hasMore: boolean) => void
  setHostProfileId: (profileId: string) => void
  setIsHost: (isHost: boolean) => void
  reset: () => void
  toggleChat: () => void
  toggleParticipants: () => void
  setInCall: (inCall: boolean) => void
  setRecording: (recording: boolean) => void
}

const initialState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  videoId: '',
  roomTitle: '',
  hostProfileId: null,
  isHost: false,
  isRoomLoaded: false,
  participants: [],
  messages: [],
  hasMoreMessages: false,
  showChat: true,
  showParticipants: false,
  isInCall: false,
  isRecording: false,
}

export const useWatchPartyStore = create<WatchPartyStore>((set) => ({
  ...initialState,

  setPlaybackState: (state) =>
    set((s) => ({
      isPlaying: state.isPlaying ?? s.isPlaying,
      currentTime: state.currentTime ?? s.currentTime,
      duration: state.duration ?? s.duration,
      playbackRate: state.playbackRate ?? s.playbackRate,
    })),

  setRoomInfo: (info) =>
    set({
      videoId: info.videoId,
      roomTitle: info.title,
      hostProfileId: info.hostProfileId,
    }),

  setRoomLoaded: (loaded) => set({ isRoomLoaded: loaded }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((s) => ({
      participants: [...s.participants, participant],
    })),

  removeParticipant: (profileId) =>
    set((s) => ({
      participants: s.participants.filter((p) => p.profileId !== profileId),
    })),

  updateParticipantMedia: (profileId, type, enabled) =>
    set((s) => ({
      participants: s.participants.map((p) => {
        if (p.profileId !== profileId) return p
        if (type === 'mic') return { ...p, isMicOn: enabled }
        if (type === 'camera') return { ...p, isCameraOn: enabled }
        return { ...p, isScreenSharing: enabled }
      }),
    })),

  addMessage: (message) =>
    set((s) => ({
      messages: [...s.messages, message],
    })),

  setMessages: (messages, hasMore) =>
    set({ messages, hasMoreMessages: hasMore }),

  setHostProfileId: (profileId) => set({ hostProfileId: profileId }),

  setIsHost: (isHost) => set({ isHost }),

  reset: () => set(initialState),

  toggleChat: () => set((s) => ({ showChat: !s.showChat, showParticipants: s.showChat ? s.showParticipants : false })),

  toggleParticipants: () => set((s) => ({ showParticipants: !s.showParticipants, showChat: s.showParticipants ? s.showChat : false })),

  setInCall: (inCall) => set({ isInCall: inCall }),

  setRecording: (recording) => set({ isRecording: recording }),
}))