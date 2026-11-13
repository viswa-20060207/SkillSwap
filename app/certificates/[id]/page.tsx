import React from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CertificateView } from '@/components/certificate/CertificateView'

interface CertificatePageProps {
  params: {
    id: string
  }
}

export default async function CertificatePage({ params }: CertificatePageProps) {
  const supabase = createClient()
  const sessionId = params.id

  // Query session with participants and skill
  const { data: session, error } = await supabase
    .from('session_requests')
    .select(`
      id, from_id, to_id, skill_id, message, status, completed_at, created_at,
      skills (name, category),
      fromProfile:from_id (id, name, avatar_url, college),
      toProfile:to_id (id, name, avatar_url, college)
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    notFound()
  }

  // Session must be accepted (and ideally completed, fallback to created_at if completed_at not set)
  if (session.status !== 'accepted') {
    notFound()
  }

  interface ProfileRef {
    id: string
    name: string
    avatar_url: string
    college: string
  }

  const fromProfile = session.fromProfile as unknown as ProfileRef | null
  const toProfile = session.toProfile as unknown as ProfileRef | null

  // In SkillSwap: to_id is the mentor/offerer, from_id is the requester/learner
  const learner = fromProfile || { id: '', name: 'Student Learner', avatar_url: '', college: '' }
  const mentor = toProfile || { id: '', name: 'Peer Mentor', avatar_url: '', college: '' }
  const skillName = session.skills?.name || 'Peer Knowledge Exchange'
  const category = session.skills?.category || 'Specialized Topic'
  const completionDate = session.completed_at || session.created_at

  return (
    <CertificateView
      sessionId={session.id}
      learnerName={learner.name}
      learnerCollege={learner.college}
      mentorName={mentor.name}
      mentorCollege={mentor.college}
      skillName={skillName}
      skillCategory={category}
      completionDate={completionDate}
    />
  )
}
