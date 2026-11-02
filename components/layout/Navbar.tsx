'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Compass, Users, User, LogOut, Menu, X, Inbox } from 'lucide-react'

interface NavbarProps {
  currentUserId?: string
  userName?: string
  userAvatar?: string
}

export function Navbar({ currentUserId, userName = 'Member', userAvatar }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLinks = [
    { href: '/explore', label: 'Explore Skills', icon: Compass },
    { href: '/requests', label: 'Requests', icon: Inbox },
    { href: '/following', label: 'Following', icon: Users },
    ...(currentUserId ? [{ href: `/profile/${currentUserId}`, label: 'My Profile', icon: User }] : []),
  ]

  // Don't render full navbar on auth pages
  if (pathname === '/login' || pathname === '/signup') {
    return (
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              S
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">
              Skill<span className="text-blue-600">Swap</span>
            </span>
          </Link>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/explore" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              S
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">
              Skill<span className="text-blue-600">Swap</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || (link.href !== '/explore' && pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="hidden md:flex items-center gap-3">
          {currentUserId && (
            <Link
              href={`/profile/${currentUserId}`}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              <Avatar src={userAvatar} name={userName} size="sm" />
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 leading-tight">View Profile</p>
              </div>
            </Link>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            className="text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
            title="Log out"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Logout
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {currentUserId && (
            <Link href={`/profile/${currentUserId}`}>
              <Avatar src={userAvatar} name={userName} size="sm" />
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            )
          })}
          <div className="pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
