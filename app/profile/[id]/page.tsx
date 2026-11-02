import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProfileActions } from '@/components/profile/ProfileActions'
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Building,
  Edit3,
  Users,
  CheckCircle2,
} from 'lucide-react'

interface SkillWithDetails {
  id: string
  role: string
  level: string
  skills: {
    id: string
    name: string
    category: string
  } | null
}

interface ProfilePageProps {
  params: {
    id: string
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const profileId = params.id

  // 1. Fetch Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // 2. Fetch User Skills
  const { data: rawUserSkills } = await supabase
    .from('user_skills')
    .select('id, role, level, skills(id, name, category)')
    .eq('user_id', profileId)

  const userSkills = (rawUserSkills as unknown as SkillWithDetails[]) || []
  const teachSkills = userSkills.filter((s) => s.role === 'teach')
  const learnSkills = userSkills.filter((s) => s.role === 'learn')

  // 3. Fetch Follow counts and status
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profileId)

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profileId)

  let isFollowing = false
  let isBlocked = false
  if (currentUser && currentUser.id !== profileId) {
    const { data: followRecord } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profileId)
      .maybeSingle()
    isFollowing = !!followRecord

    const { data: blockRecord } = await supabase
      .from('blocks')
      .select('blocker_id')
      .eq('blocker_id', currentUser.id)
      .eq('blocked_id', profileId)
      .maybeSingle()
    isBlocked = !!blockRecord
  }

  const isOwnProfile = currentUser?.id === profileId

  const joinedDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Profile Card Header (LinkedIn Style) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Banner */}
        <div className="h-36 sm:h-48 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 relative"></div>

        <div className="px-6 sm:px-8 pb-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
            {/* Avatar */}
            <div className="ring-4 ring-white rounded-full bg-white shadow-md">
              <Avatar src={profile.avatar_url} name={profile.name} size="xl" />
            </div>

            {/* Action buttons: Edit own profile or ProfileActions */}
            <div className="flex items-center gap-3">
              {isOwnProfile ? (
                <Link href="/profile/edit">
                  <Button variant="outline" size="sm">
                    <Edit3 className="w-4 h-4 mr-1.5" /> Edit Profile
                  </Button>
                </Link>
              ) : currentUser ? (
                <ProfileActions
                  targetUserId={profileId}
                  targetUserName={profile.name}
                  initialIsFollowing={isFollowing}
                  initialFollowersCount={followersCount || 0}
                  initialIsBlocked={isBlocked}
                  skills={teachSkills.map((s) => ({
                    id: s.skills?.id || s.id,
                    name: s.skills?.name || 'Skill',
                    level: s.level,
                  }))}
                />
              ) : null}
            </div>
          </div>

          {/* Name & Headline */}
          <div className="space-y-2 text-center sm:text-left">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{profile.name}</h1>
              {profile.college && (
                <p className="text-sm font-medium text-slate-600 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                  <Building className="w-4 h-4 text-slate-400" />
                  {profile.college}
                </p>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-slate-700 max-w-2xl leading-relaxed pt-1">{profile.bio}</p>
            )}

            {/* Meta info: Following/Followers & Joined */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-5 pt-3 text-xs text-slate-500 border-t border-slate-100 mt-4">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800">{followersCount || 0}</span> followers
                <span className="text-slate-300 mx-1">•</span>
                <span className="font-semibold text-slate-800">{followingCount || 0}</span> following
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Joined {joinedDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skills I Can Teach */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Skills Offered</h2>
                <p className="text-xs text-slate-500">Available to teach</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {teachSkills.length}
            </span>
          </div>

          {teachSkills.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4">No teaching skills listed yet.</p>
          ) : (
            <div className="space-y-2.5">
              {teachSkills.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800">{item.skills?.name}</span>
                  </div>
                  <Badge variant="blue" size="sm" className="capitalize">
                    {item.level}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills I Want to Learn */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Skills Wanted</h2>
                <p className="text-xs text-slate-500">Looking to learn</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
              {learnSkills.length}
            </span>
          </div>

          {learnSkills.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4">No learning goals listed yet.</p>
          ) : (
            <div className="space-y-2.5">
              {learnSkills.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800">{item.skills?.name}</span>
                  </div>
                  <Badge variant="purple" size="sm" className="capitalize">
                    {item.level}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
