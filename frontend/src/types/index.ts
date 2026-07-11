export interface Profile {
  id: string
  userId: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
  bannerUrl: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
  channel?: Channel | null
}

export interface Channel {
  id: string
  profileId: string
  name: string
  handle: string
  description: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  subscriberCount: number
  videoCount: number
  createdAt: string
  updatedAt: string
  profile?: Profile
}

export interface Video {
  id: string
  channelId: string
  title: string
  description: string
  thumbnailUrl: string
  videoUrl: string
  duration: number
  category: string
  tags: string[]
  viewCount: number
  likeCount: number
  dislikeCount: number
  commentCount: number
  isPublic: boolean
  createdAt: string
  updatedAt: string
  channel?: Channel
}

export interface VideoWithChannel extends Video {
  channel: Channel
}

export interface Comment {
  id: string
  videoId: string
  profileId: string
  parentId: string | null
  content: string
  likeCount: number
  dislikeCount: number
  isEdited: boolean
  isHidden: boolean
  isPinned: boolean
  isSpam: boolean
  createdAt: string
  updatedAt: string
  profile?: Profile
  replies?: Comment[]
  isLikedByUser?: boolean
  isDislikedByUser?: boolean
}

export interface Like {
  id: string
  profileId: string
  videoId: string | null
  commentId: string | null
  type: 'LIKE' | 'DISLIKE'
  createdAt: string
}

export interface Subscription {
  id: string
  subscriberId: string
  targetId: string
  createdAt: string
}

export interface WatchHistoryEntry {
  id: string
  profileId: string
  videoId: string
  watchedAt: string
  video?: VideoWithChannel
}

export interface WatchLaterEntry {
  id: string
  profileId: string
  videoId: string
  addedAt: string
  video?: VideoWithChannel
}

export type ViewName =
  | 'home'
  | 'video'
  | 'channel'
  | 'search'
  | 'upload'
  | 'history'
  | 'watch-later'
  | 'liked-videos'
  | 'subscriptions'
  | 'settings'
  | 'your-videos'
  | 'profile'
  | 'watch-party'
  | 'downloads'
  | 'pricing'
  | 'moderation'

export interface ViewRoute {
  name: ViewName
  params?: Record<string, string>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiResponse<T = unknown> {
  data?: T
  message?: string
  error?: string
  code?: string
}

export interface SearchSuggestion {
  id: string
  type: 'video' | 'channel'
  title: string
  thumbnail?: string
  avatar?: string
}

export interface SearchResult {
  videos: VideoWithChannel[]
  channels: (Channel & { profile?: Profile })[]
  total: number
}

export const VIDEO_CATEGORIES = [
  'All',
  'Music',
  'Gaming',
  'Education',
  'Entertainment',
  'Sports',
  'News',
  'Technology',
  'Comedy',
  'Film & Animation',
  'Science',
  'Travel',
  'Cooking',
  'Fitness',
  'Fashion',
  'Nature',
  'Art',
  'Photography',
  'DIY',
  'Pets',
] as const

export type VideoCategory = (typeof VIDEO_CATEGORIES)[number]

export const UPLOAD_LIMITS = {
  maxVideoSize: 500 * 1024 * 1024,
  maxThumbnailSize: 10 * 1024 * 1024,
  maxAvatarSize: 5 * 1024 * 1024,
  maxBannerSize: 10 * 1024 * 1024,
  acceptedVideoTypes: ['video/mp4', 'video/webm', 'video/ogg'],
  acceptedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const

export const PAGINATION = {
  videosPerPage: 20,
  commentsPerPage: 10,
  searchResultsPerPage: 20,
  watchPartyPerPage: 12,
} as const

// ─── Watch Party ───────────────────────────────────────────────────────────────

export interface WatchPartyRoom {
  id: string
  roomId: string
  hostId: string
  videoId: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  host?: { id: string; name: string; username: string; avatarUrl: string | null } | null
  video?: { id: string; title: string; thumbnailUrl: string; duration: number } | null
  participants?: WatchPartyParticipant[]
  participantCount?: number
}

export interface WatchPartyParticipant {
  id: string
  roomId: string
  profileId: string
  role: string
  isOnline: boolean
  joinedAt: string
  profile?: { id: string; name: string; username: string; avatarUrl: string | null } | null
}

export interface WatchPartyMessage {
  id: string
  roomId: string
  profileId: string
  content: string
  type: string
  createdAt: string
  profile?: { id: string; name: string; username: string; avatarUrl: string | null } | null
}

// Socket event participant (simplified, no socketId)
// ─── Downloads ─────────────────────────────────────────────────────────────────

export interface DownloadEntry {
  id: string
  videoId: string
  videoTitle: string
  channelName: string | null
  thumbnailUrl: string
  videoUrl: string
  fileSize: number | null
  quality: string
  status: string
  downloadedAt: string
}

export interface PlanInfo {
  name: string
  displayName: string
  downloadLimit: number
  downloadWindow: string
  price: number
  features: string[]
}

export interface DownloadLimits {
  plan: PlanInfo
  downloadsUsed: number
  downloadsRemaining: number
  isUnlimited: boolean
  windowStart: string
  windowEnd: string
  windowResetLabel: string
}

// ─── Memberships & Payments ─────────────────────────────────────────────────

export interface MembershipInfo {
  id: string
  planId: string
  status: string
  startedAt: string
  expiresAt: string | null
}

export interface PaymentEntry {
  id: string
  planId: string
  amount: number
  currency: string
  status: string
  paidAt: string | null
  createdAt: string
}

export interface MembershipData {
  currentPlan: PlanInfo
  membership: MembershipInfo | null
  payments: PaymentEntry[]
  paymentsTotal: number
  paymentsPage: number
  paymentsPageSize: number
  paymentsHasMore: boolean
}

// ─── Comment Reports ──────────────────────────────────────────────────────

export interface CommentReportInfo {
  id: string
  commentId: string
  reporterId: string
  reason: string
  description: string | null
  status: string
  createdAt: string
  reporter?: { id: string; name: string; username: string }
}

export interface ReportedComment extends Comment {
  reports: CommentReportInfo[]
  video?: { id: string; title: string }
  channel?: { id: string; name: string }
}

// Socket event participant (simplified, no socketId)
export interface WatchPartySocketParticipant {
  profileId: string
  username: string
  avatarUrl: string | null
  role: 'host' | 'member'
  isMicOn: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
}

// Socket chat message
export interface WatchPartyChatMessage {
  id: string
  roomId: string
  profileId: string
  username: string
  avatarUrl: string | null
  content: string
  type: string
  createdAt: string
}

// ─── Login Sessions ──────────────────────────────────────────────────────

export interface LoginSessionInfo {
  id: string
  device: string | null
  browser: string | null
  os: string | null
  ip: string | null
  location: string | null
  isVerified: boolean
  lastActive: string
  createdAt: string
}