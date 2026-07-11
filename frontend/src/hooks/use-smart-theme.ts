'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

export function useSmartTheme() {
  const { setTheme, resolvedTheme, theme } = useTheme()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (theme !== 'smart') return

    const applyTimeBasedTheme = () => {
      const hour = new Date().getHours()
      const isDaytime = hour >= 6 && hour < 18
      setTheme(isDaytime ? 'light' : 'dark')
    }

    applyTimeBasedTheme()
    intervalRef.current = setInterval(applyTimeBasedTheme, 60_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [theme, setTheme])

  const isSmartMode = theme === 'smart'
  const isDark = resolvedTheme === 'dark'

  return { isSmartMode, isDark, setTheme }
}