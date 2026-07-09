'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouterStore } from '@/stores/router-store'
import { VIDEO_CATEGORIES } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function CategoryChips() {
  const { categoryFilter, setCategoryFilter } = useRouterStore()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const checkArrows = () => {
    const el = scrollContainerRef.current
    if (!el) return
    setShowLeftArrow(el.scrollLeft > 0)
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    checkArrows()
    const el = scrollContainerRef.current
    if (!el) return
    el.addEventListener('scroll', checkArrows, { passive: true })
    window.addEventListener('resize', checkArrows)
    return () => {
      el.removeEventListener('scroll', checkArrows)
      window.removeEventListener('resize', checkArrows)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current
    if (!el) return
    const scrollAmount = 200
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative sticky top-14 z-10 bg-background border-b border-border">
      <div className="relative">
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-background via-background to-transparent pr-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-2.5 overflow-x-auto scrollbar-none py-3 px-4 sm:px-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {VIDEO_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={categoryFilter === category ? 'default' : 'secondary'}
              size="sm"
              className={cn(
                'flex-shrink-0 rounded-lg text-sm font-normal px-3 h-8 transition-colors',
                categoryFilter === category
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-muted hover:bg-muted/80'
              )}
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {showRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-l from-background via-background to-transparent pl-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}