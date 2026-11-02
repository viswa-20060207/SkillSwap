import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RealtimeChat } from '@/components/session/RealtimeChat'
import { NotesPanel } from '@/components/session/NotesPanel'
import { VoiceCallPanel } from '@/components/session/VoiceCallPanel'
import {
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react'

interface SessionRoomPageProps {
  params: {
    id: string
  }
}

interface SessionProfile {
  id: string
  name: string
  avatar_url: string
  college: string
}

export default async function SessionRoomPage({ params }: SessionRoomPageProps) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const sessionId = params.id

  // Query session_requests with participants and skill
  const { data: session, error } = await supabase
    .from('session_requests')
    .select(`
      id, from_id, to_id, skill_id, message, status, created_at,
      skills (name),
      fromProfile:from_id (id, name, avatar_url, college),
      toProfile:to_id (id, name, avatar_url, college)
    `)
    .eq('id', sessionId)
    .single()

  // Verify access: must exist, must be accepted, user must be from_id or to_id
  if (error || !session) {
    redirect('/requests?error=session_not_found')
  }

  const isParticipant = session.from_id === user.id || session.to_id === user.id
  if (!isParticipant) {
    redirect('/requests?error=unauthorized')
  }

  if (session.status !== 'accepted') {
    redirect('/requests?error=session_not_accepted')
  }

  const fromProfile = session.fromProfile as unknown as SessionProfile | null
  const toProfile = session.toProfile as unknown as SessionProfile | null
  const otherUser = session.from_id === user.id ? toProfile : fromProfile
  const myProfile = session.from_id === user.id ? fromProfile : toProfile
  const otherRole = session.from_id === user.id ? 'Mentor / Teacher' : 'Learner'

  return (
    <div className="space-y-6 pb-16">
      {/* Top Session Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/requests">
            <Button variant="ghost" size="sm" className="p-2 -ml-2 text-slate-500 hover:text-slate-800">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>

          <Avatar src={otherUser?.avatar_url} name={otherUser?.name || 'Peer'} size="lg" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">{otherUser?.name}</h1>
              <Badge variant="green" size="sm">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Private Session
              </Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{otherRole}</span>
              {otherUser?.college && <span>• {otherUser.college}</span>}
              {session.skills?.name && (
                <span className="font-semibold text-blue-600">• Topic: {session.skills.name}</span>
              )}
            </p>
          </div>
        </div>

        {/* Voice Call Controls (P8) */}
        <div>
          <VoiceCallPanel sessionId={sessionId} />
        </div>
      </div>

      {/* Main Workspace: Realtime Chat (P6) & Notes Sharing (P7) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Realtime Chat (P6) */}
        <RealtimeChat
          sessionId={sessionId}
          currentUserId={user.id}
          currentUserName={myProfile?.name || user.email?.split('@')[0] || 'User'}
          currentUserAvatar={myProfile?.avatar_url || ''}
        />

        {/* Right Column: Shared Notes & Code Snippets (P7) */}
        <NotesPanel
          sessionId={sessionId}
          currentUserId={user.id}
          currentUserName={myProfile?.name || user.email?.split('@')[0] || 'User'}
        />
      </div>
    </div>
  )
}
