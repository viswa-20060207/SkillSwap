'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FollowButton } from '@/components/profile/FollowButton'
import { SkillLevel } from '@/lib/database.types'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Search,
  Filter,
  GraduationCap,
  Building,
  ArrowRight,
  BookOpen,
} from 'lucide-react'

interface MatchingProfile {
  id: string
  name: string
  bio: string
  avatar_url: string
  college: string
  teachingSkills: {
    skillName: string
    level: SkillLevel
  }[]
  isFollowing: boolean
}

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | SkillLevel>('all')
  const [profiles, setProfiles] = useState<MatchingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Load current user and initial search results
  useEffect(() => {
    async function initUserAndSearch() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setCurrentUserId(user.id)
      }
      performSearch(user?.id || null, '', 'all')
    }

    initUserAndSearch()
  }, [])

  const performSearch = async (
    userId: string | null,
    searchQuery: string,
    level: 'all' | SkillLevel
  ) => {
    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Get blocked user IDs if user is signed in
      let blockedIds: string[] = []
      let followingIds: Set<string> = new Set()

      if (userId) {
        const { data: myBlocks } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', userId)

        const { data: blockedMe } = await supabase
          .from('blocks')
          .select('blocker_id')
          .eq('blocked_id', userId)

        const blockedSet = new Set<string>()
        myBlocks?.forEach((b) => blockedSet.add(b.blocked_id))
        blockedMe?.forEach((b) => blockedSet.add(b.blocker_id))
        blockedIds = Array.from(blockedSet)

        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)

        if (follows) {
          followingIds = new Set(follows.map((f) => f.following_id))
        }
      }

      // 2. Query user_skills with role = 'teach'
      let query = supabase
        .from('user_skills')
        .select(`
          user_id,
          level,
          skills!inner (id, name),
          profiles!inner (id, name, bio, avatar_url, college)
        `)
        .eq('role', 'teach')

      // Case-insensitive, partial match on skills.name
      if (searchQuery.trim()) {
        query = query.ilike('skills.name', `%${searchQuery.trim()}%`)
      }

      // Level filter
      if (level !== 'all') {
        query = query.eq('level', level)
      }

      const { data, error } = await query

      if (error) {
        console.error('Explore query error:', error)
        setLoading(false)
        return
      }

      // 3. Group by user profile, excluding myself and blocked users
      const profileMap = new Map<string, MatchingProfile>()

      interface UserSkillQueryRow {
        level: SkillLevel
        skills: { id: string; name: string } | null
        profiles: { id: string; name: string; bio: string | null; avatar_url: string | null; college: string | null } | null
      }

      const rows = (data as unknown as UserSkillQueryRow[]) || []

      rows.forEach((row) => {
        const profile = row.profiles
        const skill = row.skills
        if (!profile || !skill) return

        // Exclude current user
        if (userId && profile.id === userId) return
        // Exclude blocked users
        if (blockedIds.includes(profile.id)) return

        if (!profileMap.has(profile.id)) {
          profileMap.set(profile.id, {
            id: profile.id,
            name: profile.name,
            bio: profile.bio || '',
            avatar_url: profile.avatar_url || '',
            college: profile.college || '',
            teachingSkills: [],
            isFollowing: followingIds.has(profile.id),
          })
        }

        const current = profileMap.get(profile.id)!
        if (!current.teachingSkills.some((s) => s.skillName === skill.name)) {
          current.teachingSkills.push({
            skillName: skill.name,
            level: row.level,
          })
        }
      })

      setProfiles(Array.from(profileMap.values()))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(currentUserId, searchTerm, levelFilter)
  }

  const handleLevelChange = (newLevel: 'all' | SkillLevel) => {
    setLevelFilter(newLevel)
    performSearch(currentUserId, searchTerm, newLevel)
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Search Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl">
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
            Peer Discovery
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 tracking-tight">
            Find Mentors & Skill Partners
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search for technical skills (Java, Python, C++) or soft skills (Interview Skills, English Speaking) to learn 1-on-1.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by skill name (e.g. Java, Python, Communication)..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={levelFilter}
                onChange={(e) => handleLevelChange(e.target.value as 'all' | SkillLevel)}
                className="px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 cursor-pointer"
              >
                <option value="all">All Proficiency Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <Button type="submit">
              Search
            </Button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="font-semibold text-slate-800 text-base">
            {loading ? 'Searching profiles...' : `${profiles.length} ${profiles.length === 1 ? 'Mentor' : 'Mentors'} Teaching`}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-start gap-3.5">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">No matching mentors found</h3>
            <p className="text-sm text-slate-500">
              Try searching for common skills like &quot;Java&quot;, &quot;Python&quot;, &quot;C++&quot;, or &quot;Communication&quot;, or clear the level filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setLevelFilter('all')
                performSearch(currentUserId, '', 'all')
              }}
            >
              Reset Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Header: Avatar, Name, Follow */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Link href={`/profile/${profile.id}`} className="flex items-center gap-3 group">
                      <Avatar src={profile.avatar_url} name={profile.name} size="md" />
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                          {profile.name}
                        </h3>
                        {profile.college && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{profile.college}</span>
                          </p>
                        )}
                      </div>
                    </Link>

                    {currentUserId && (
                      <FollowButton
                        targetUserId={profile.id}
                        initialIsFollowing={profile.isFollowing}
                        size="sm"
                      />
                    )}
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {profile.bio}
                    </p>
                  )}

                  {/* Teaching Skills Badges */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-blue-600" /> Teaches
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {profile.teachingSkills.map((s, idx) => (
                        <Badge key={idx} variant="blue" size="sm">
                          {s.skillName} • <span className="text-[10px] opacity-75 capitalize">{s.level}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* View Profile Action */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <Link
                    href={`/profile/${profile.id}`}
                    className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline gap-1"
                  >
                    View Full Profile <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
