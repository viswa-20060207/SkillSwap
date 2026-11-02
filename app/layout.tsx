import type { Metadata, Viewport } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'SkillSwap - Peer-to-Peer Learning Platform',
  description: 'Trade skills, learn from peers, and collaborate in 1-on-1 real-time sessions.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
        <Navbar
          currentUserId={user?.id}
          userName={profile?.name || user?.email?.split('@')[0] || 'Member'}
          userAvatar={profile?.avatar_url || ''}
        />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">{children}</main>
      </body>
    </html>
  )
}
