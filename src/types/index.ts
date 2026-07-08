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
  isEdited: boolean
  createdAt: string
  updatedAt: string
  profile?: Profile
  replies?: Comment[]
  isLikedByUser?: boolean
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
} as const