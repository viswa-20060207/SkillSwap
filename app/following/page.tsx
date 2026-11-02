'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FollowButton } from '@/components/profile/FollowButton'
import { Users, GraduationCap, Building, UserCheck } from 'lucide-react'

interface FollowedUser {
  id: string
  name: string
  bio: string
  avatar_url: string
  college: string
  teachingSkills: {
    skillName: string
    level: string
  }[]
}

export default function FollowingPage() {
  const [followedUsers, setFollowedUsers] = useState<FollowedUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFollowing() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // Query follows where follower_id is current user, joining the following profiles
      const { data: followRecords, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (
            id,
            name,
            bio,
            avatar_url,
            college
          )
        `)
        .eq('follower_id', user.id)

      if (error || !followRecords) {
        console.error('Error fetching following:', error)
        setLoading(false)
        return
      }

      interface FollowRow {
        following_id: string
        profiles: {
          id: string
          name: string
          bio: string | null
          avatar_url: string | null
          college: string | null
        } | null
      }

      const rows = (followRecords as unknown as FollowRow[]) || []
      const targetIds = rows.map((r) => r.following_id)

      if (targetIds.length === 0) {
        setFollowedUsers([])
        setLoading(false)
        return
      }

      // Fetch teaching skills for these users
      const { data: skillsData } = await supabase
        .from('user_skills')
        .select('user_id, level, skills(name)')
        .in('user_id', targetIds)
        .eq('role', 'teach')

      interface SkillRow {
        user_id: string
        level: string
        skills: { name: string } | null
      }

      const skillsRows = (skillsData as unknown as SkillRow[]) || []
      const skillsByUser = new Map<string, { skillName: string; level: string }[]>()
      skillsRows.forEach((row) => {
        if (!skillsByUser.has(row.user_id)) {
          skillsByUser.set(row.user_id, [])
        }
        skillsByUser.get(row.user_id)!.push({
          skillName: row.skills?.name || 'Skill',
          level: row.level,
        })
      })

      const list: FollowedUser[] = rows
        .map((r) => r.profiles)
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({
          id: p.id,
          name: p.name,
          bio: p.bio || '',
          avatar_url: p.avatar_url || '',
          college: p.college || '',
          teachingSkills: skillsByUser.get(p.id) || [],
        }))

      setFollowedUsers(list)
      setLoading(false)
    }

    fetchFollowing()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">People You Follow</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Keep track of peers, mentors, and learning partners you are connected with.
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : followedUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">No followed mentors yet</h3>
            <p className="text-sm text-slate-500">
              Explore skills like Java, Python, or Interview Skills to find peers and mentors to follow.
            </p>
            <Link href="/explore">
              <Button size="sm" className="mt-2">
                Explore Mentors
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {followedUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <Link href={`/profile/${user.id}`}>
                    <Avatar src={user.avatar_url} name={user.name} size="lg" />
                  </Link>

                  <div className="space-y-1">
                    <Link href={`/profile/${user.id}`} className="hover:text-blue-600 transition-colors">
                      <h3 className="font-bold text-slate-900 text-base">{user.name}</h3>
                    </Link>

                    {user.college && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {user.college}
                      </p>
                    )}

                    {user.bio && (
                      <p className="text-xs text-slate-600 max-w-md line-clamp-1">{user.bio}</p>
                    )}

                    {user.teachingSkills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-blue-600" /> Teaches:
                        </span>
                        {user.teachingSkills.map((s, idx) => (
                          <Badge key={idx} variant="blue" size="sm">
                            {s.skillName} • <span className="opacity-75 capitalize">{s.level}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link href={`/profile/${user.id}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                  <FollowButton
                    targetUserId={user.id}
                    initialIsFollowing={true}
                    onToggle={(isNowFollowing) => {
                      if (!isNowFollowing) {
                        setFollowedUsers((prev) => prev.filter((u) => u.id !== user.id))
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
