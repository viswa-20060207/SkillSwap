'use client'

import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('skillswap-theme')
    const currentlyDark = saved === 'dark' || document.documentElement.classList.contains('dark')
    setIsDark(currentlyDark)
  }, [])

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)

    if (nextDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('skillswap-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('skillswap-theme', 'light')
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute('content', nextDark ? '#090d16' : '#7c3aed')
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Royal Violet Light Mode' : 'Switch to Midnight Dark Mode'}
      title={isDark ? 'Switch to Royal Violet Light Mode' : 'Switch to Midnight Dark Mode'}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-colors"
    >
      {mounted ? (
        isDark ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-blue-600" />
        )
      ) : (
        <Moon className="w-4 h-4 text-blue-600" />
      )}
    </button>
  )
}
