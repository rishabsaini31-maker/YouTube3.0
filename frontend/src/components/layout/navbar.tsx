'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSidebarStore } from '@/stores/sidebar-store'
import { UserMenu } from '@/components/auth/user-menu'
import { api } from '@/services/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  Mic,
  Upload,
  Bell,
  Menu,
  ArrowLeft,
  X,
} from 'lucide-react'
import type { SearchSuggestion } from '@/types'

export function Navbar() {
  const { navigate, searchQuery, setSearchQuery } = useRouterStore()
  const { isAuthenticated, openLogin } = useAuthStore()
  const { toggle, isMobileOpen, setMobileOpen, isCollapsed } = useSidebarStore()
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    try {
      const res = await api.get<{ data: SearchSuggestion[] }>('/api/search/suggestions', { q: query })
      setSuggestions(res.data || [])
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate({ name: 'search', params: { query: searchQuery.trim() } })
      setShowSuggestions(false)
      searchInputRef.current?.blur()
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setShowSuggestions(false)
    if (suggestion.type === 'video') {
      navigate({ name: 'video', params: { id: suggestion.id } })
    } else {
      navigate({ name: 'channel', params: { id: suggestion.id } })
    }
    setSuggestions([])
  }

  const handleUploadClick = () => {
    if (isAuthenticated) {
      navigate({ name: 'upload' })
    } else {
      openLogin()
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-background border-b border-border flex items-center px-2 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setMobileOpen(!isMobileOpen)
                  } else {
                    toggle()
                  }
                }}
                aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isMobileOpen ? 'Close menu' : 'Menu'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button
          onClick={() => navigate({ name: 'home' })}
          className="flex items-center gap-1.5 flex-shrink-0"
        >
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold hidden sm:inline">ViewTube</span>
        </button>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center flex-1 max-w-2xl mx-2 sm:mx-8"
      >
        <div className="relative flex items-center w-full">
          {isSearchFocused && (
            <div className="hidden md:flex">
              <div className="flex items-center justify-center h-10 w-10 border border-r-0 border-input rounded-l-full bg-muted/50">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              setIsSearchFocused(true)
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            onBlur={() => setIsSearchFocused(false)}
            className={`h-10 rounded-l-full rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isSearchFocused ? 'pl-4' : 'pl-4'
            } ${isSearchFocused ? 'md:pl-0' : ''}`}
            aria-label="Search"
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-10 px-5 rounded-l-none rounded-r-full border border-input border-l-0"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
            >
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleSuggestionClick(s)}
                >
                  <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full flex-shrink-0 ml-2"
                aria-label="Search with your voice"
              >
                <Mic className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Search with your voice</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </form>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hidden sm:flex"
                onClick={handleUploadClick}
                aria-label="Upload video"
              >
                <Upload className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Create</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="ml-1">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}