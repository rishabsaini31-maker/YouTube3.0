import { create } from 'zustand'
import type { ViewRoute, ViewName } from '@/types'

interface RouterHistoryEntry {
  view: ViewRoute
  timestamp: number
}

interface RouterStore {
  currentView: ViewRoute
  history: RouterHistoryEntry[]
  searchQuery: string
  categoryFilter: string

  navigate: (view: ViewRoute) => void
  back: () => void
  setSearchQuery: (query: string) => void
  setCategoryFilter: (category: string) => void
  getHash: () => string
  initFromHash: () => void
}

function viewToHash(view: ViewRoute): string {
  switch (view.name) {
    case 'home':
      return '#/'
    case 'video':
      return `#/video/${view.params?.id || ''}`
    case 'channel':
      return `#/channel/${view.params?.id || ''}`
    case 'search':
      return `#/search?q=${encodeURIComponent(view.params?.query || '')}`
    case 'upload':
      return '#/upload'
    case 'history':
      return '#/history'
    case 'watch-later':
      return '#/watch-later'
    case 'liked-videos':
      return '#/liked-videos'
    case 'subscriptions':
      return '#/subscriptions'
    case 'settings':
      return '#/settings'
    case 'your-videos':
      return '#/your-videos'
    case 'watch-party':
      if (view.params?.roomId) return `#/watch-party/${view.params.roomId}`
      return '#/watch-party'
    case 'profile':
      return `#/profile/${view.params?.id || ''}`
    default:
      return '#/'
  }
}

function hashToView(hash: string): ViewRoute {
  const cleanHash = hash.replace(/^#\/?/, '')

  if (!cleanHash || cleanHash === '/') {
    return { name: 'home' }
  }

  const videoMatch = cleanHash.match(/^video\/([^/]+)$/i)
  if (videoMatch) {
    return { name: 'video', params: { id: videoMatch[1] } }
  }

  const channelMatch = cleanHash.match(/^channel\/([^/]+)$/i)
  if (channelMatch) {
    return { name: 'channel', params: { id: channelMatch[1] } }
  }

  const searchMatch = cleanHash.match(/^search\?q=(.+)$/i)
  if (searchMatch) {
    return { name: 'search', params: { query: decodeURIComponent(searchMatch[1]) } }
  }

  const profileMatch = cleanHash.match(/^profile\/([^/]+)$/i)
  if (profileMatch) {
    return { name: 'profile', params: { id: profileMatch[1] } }
  }

  const watchPartyRoomMatch = cleanHash.match(/^watch-party\/([^/]+)$/i)
  if (watchPartyRoomMatch) {
    return { name: 'watch-party', params: { roomId: watchPartyRoomMatch[1] } }
  }

  const simpleRoutes: ViewName[] = [
    'upload',
    'history',
    'watch-later',
    'liked-videos',
    'subscriptions',
    'settings',
    'your-videos',
    'watch-party',
    'downloads',
    'pricing',
    'moderation',
  ]
  if (simpleRoutes.includes(cleanHash as ViewName)) {
    return { name: cleanHash as ViewName }
  }

  return { name: 'home' }
}

export const useRouterStore = create<RouterStore>((set, get) => ({
  currentView: { name: 'home' },
  history: [],
  searchQuery: '',
  categoryFilter: 'All',

  navigate: (view: ViewRoute) => {
    const state = get()
    const newHistory = [
      ...state.history,
      { view: state.currentView, timestamp: Date.now() },
    ].slice(-50)

    const hash = viewToHash(view)
    if (typeof window !== 'undefined') {
      window.location.hash = hash
    }

    set({ currentView: view, history: newHistory })
  },

  back: () => {
    const state = get()
    if (state.history.length === 0) {
      set({ currentView: { name: 'home' }, history: [] })
      return
    }

    const newHistory = [...state.history]
    const previous = newHistory.pop()!

    const hash = viewToHash(previous.view)
    if (typeof window !== 'undefined') {
      window.location.hash = hash
    }

    set({ currentView: previous.view, history: newHistory })
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setCategoryFilter: (category: string) => set({ categoryFilter: category }),
  getHash: () => viewToHash(get().currentView),

  initFromHash: () => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash) {
      const view = hashToView(hash)
      if (view.params?.query) {
        set({ currentView: view, searchQuery: view.params.query })
      } else {
        set({ currentView: view })
      }
    }

    window.addEventListener('hashchange', () => {
      const currentHash = window.location.hash
      if (currentHash) {
        const newView = hashToView(currentHash)
        const state = get()
        if (newView.name !== state.currentView.name || JSON.stringify(newView.params) !== JSON.stringify(state.currentView.params)) {
          set((s) => ({
            currentView: newView,
            history: [
              ...s.history,
              { view: s.currentView, timestamp: Date.now() },
            ].slice(-50),
            searchQuery: newView.params?.query || s.searchQuery,
          }))
        }
      }
    })
  },
}))