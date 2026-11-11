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
  Flame,
  ShieldCheck,
  Star,
} from 'lucide-react'

interface MatchingProfile {
  id: string
  name: string
  bio: string
  avatar_url: string
  college: string
  teachingSkills: {
    skillId: string
    skillName: string
    level: SkillLevel
    isVerified?: boolean
  }[]
  isFollowing: boolean
  isMutualSwap: boolean
  matchedTeachSkill?: string
  matchedLearnSkill?: string
  averageRating: number | null
  reviewsCount: number
}

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | SkillLevel>('all')
  const [onlyMutualSwaps, setOnlyMutualSwaps] = useState(false)
  const [profiles, setProfiles] = useState<MatchingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
      // 1. Get blocked user IDs, following IDs, and my own teach/learn skills for Mutual Swap matching
      let blockedIds: string[] = []
      let followingIds: Set<string> = new Set()
      const myTeachSkillIds = new Set<string>()
      const myLearnSkillIds = new Set<string>()
      const skillNameById = new Map<string, string>()

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

        const { data: mySkills } = await supabase
          .from('user_skills')
          .select('skill_id, role, skills(name)')
          .eq('user_id', userId)

        if (mySkills) {
          interface MySkillRow {
            skill_id: string
            role: 'teach' | 'learn'
            skills: { name: string } | null
          }
          ;(mySkills as unknown as MySkillRow[]).forEach((ms) => {
            if (ms.skills?.name) skillNameById.set(ms.skill_id, ms.skills.name)
            if (ms.role === 'teach') myTeachSkillIds.add(ms.skill_id)
            if (ms.role === 'learn') myLearnSkillIds.add(ms.skill_id)
          })
        }
      }

      // 2. Query user_skills with role = 'teach' (graceful fallback if is_verified column isn't added yet)
      const buildTeachQuery = (includeVerified: boolean) => {
        const selectStr = includeVerified
          ? `user_id, level, is_verified, skills!inner (id, name), profiles!inner (id, name, bio, avatar_url, college)`
          : `user_id, level, skills!inner (id, name), profiles!inner (id, name, bio, avatar_url, college)`

        let q = supabase.from('user_skills').select(selectStr).eq('role', 'teach')

        if (searchQuery.trim()) {
          q = q.ilike('skills.name', `%${searchQuery.trim()}%`)
        }
        if (level !== 'all') {
          q = q.eq('level', level)
        }
        return q
      }

      let data: unknown[] | null = null
      const { data: withVerData, error: verErr } = await buildTeachQuery(true)
      if (!verErr && withVerData) {
        data = withVerData
      } else {
        const { data: baseData, error: baseErr } = await buildTeachQuery(false)
        if (baseErr) {
          console.error('Explore query error:', baseErr)
          setLoading(false)
          return
        }
        data = baseData
      }

      // 3. Group by user profile, excluding myself and blocked users
      const profileMap = new Map<string, MatchingProfile>()

      interface UserSkillQueryRow {
        level: SkillLevel
        is_verified?: boolean
        skills: { id: string; name: string } | null
        profiles: {
          id: string
          name: string
          bio: string | null
          avatar_url: string | null
          college: string | null
        } | null
      }

      const rows = (data as unknown as UserSkillQueryRow[]) || []

      rows.forEach((row) => {
        const profile = row.profiles
        const skill = row.skills
        if (!profile || !skill) return

        if (userId && profile.id === userId) return
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
            isMutualSwap: false,
            averageRating: null,
            reviewsCount: 0,
          })
        }

        const current = profileMap.get(profile.id)!
        if (!current.teachingSkills.some((s) => s.skillName === skill.name)) {
          current.teachingSkills.push({
            skillId: skill.id,
            skillName: skill.name,
            level: row.level,
            isVerified: !!row.is_verified,
          })
        }
      })

      const matchedIds = Array.from(profileMap.keys())

      // 4. Compute Mutual Swap Matches & Mentor Ratings
      if (matchedIds.length > 0) {
        // Check what these mentors want to learn
        if (userId && myTeachSkillIds.size > 0 && myLearnSkillIds.size > 0) {
          const { data: theirLearnRows } = await supabase
            .from('user_skills')
            .select('user_id, skill_id, skills(name)')
            .eq('role', 'learn')
            .in('user_id', matchedIds)

          interface TheirLearnRow {
            user_id: string
            skill_id: string
            skills: { name: string } | null
          }

          if (theirLearnRows) {
            const learnMap = new Map<string, { id: string; name: string }[]>()
            ;(theirLearnRows as unknown as TheirLearnRow[]).forEach((r) => {
              const list = learnMap.get(r.user_id) || []
              list.push({ id: r.skill_id, name: r.skills?.name || '' })
              learnMap.set(r.user_id, list)
            })

            profileMap.forEach((profile, pid) => {
              const skillTheyTeachThatIWant = profile.teachingSkills.find((ts) =>
                myLearnSkillIds.has(ts.skillId)
              )
              const skillTheyWantThatITeach = (learnMap.get(pid) || []).find((ls) =>
                myTeachSkillIds.has(ls.id)
              )

              if (skillTheyTeachThatIWant && skillTheyWantThatITeach) {
                profile.isMutualSwap = true
                profile.matchedTeachSkill = skillTheyTeachThatIWant.skillName
                profile.matchedLearnSkill =
                  skillTheyWantThatITeach.name || skillNameById.get(skillTheyWantThatITeach.id)
              }
            })
          }
        }

        // Safely fetch ratings from session_reviews
        try {
          const { data: reviewRows, error: revErr } = await supabase
            .from('session_reviews')
            .select('reviewee_id, rating')
            .in('reviewee_id', matchedIds)

          if (!revErr && reviewRows) {
            const ratingAgg = new Map<string, { sum: number; count: number }>()
            reviewRows.forEach((r) => {
              const agg = ratingAgg.get(r.reviewee_id) || { sum: 0, count: 0 }
              agg.sum += r.rating
              agg.count += 1
              ratingAgg.set(r.reviewee_id, agg)
            })

            ratingAgg.forEach((agg, pid) => {
              const p = profileMap.get(pid)
              if (p && agg.count > 0) {
                p.averageRating = Number((agg.sum / agg.count).toFixed(1))
                p.reviewsCount = agg.count
              }
            })
          }
        } catch {
          // Ignore gracefully if 002_enhancements.sql isn't applied yet
        }
      }

      // Sort Mutual Swap Matches first, then by rating
      const sorted = Array.from(profileMap.values()).sort((a, b) => {
        if (a.isMutualSwap !== b.isMutualSwap) return a.isMutualSwap ? -1 : 1
        return (b.averageRating || 0) - (a.averageRating || 0)
      })

      setProfiles(sorted)
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

  const displayedProfiles = onlyMutualSwaps
    ? profiles.filter((p) => p.isMutualSwap)
    : profiles

  const mutualCount = profiles.filter((p) => p.isMutualSwap).length

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

          <div className="flex flex-wrap items-center gap-2">
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

            {currentUserId && (
              <button
                type="button"
                onClick={() => setOnlyMutualSwaps(!onlyMutualSwaps)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                  onlyMutualSwaps
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Swap Matches {mutualCount > 0 ? `(${mutualCount})` : ''}
              </button>
            )}

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
            {loading
              ? 'Searching profiles...'
              : `${displayedProfiles.length} ${displayedProfiles.length === 1 ? 'Mentor' : 'Mentors'} Teaching`}
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
        ) : displayedProfiles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">No matching mentors found</h3>
            <p className="text-sm text-slate-500">
              {onlyMutualSwaps
                ? 'No mutual skill swaps match your current search yet. Try viewing all mentors or adding more skills to your profile.'
                : 'Try searching for common skills like "Java", "Python", "C++", or "Communication", or clear the level filter.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setLevelFilter('all')
                setOnlyMutualSwaps(false)
                performSearch(currentUserId, '', 'all')
              }}
            >
              Reset Search
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedProfiles.map((profile) => (
              <div
                key={profile.id}
                className={`bg-white rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow border ${
                  profile.isMutualSwap ? 'border-orange-300 ring-1 ring-orange-100' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Mutual Swap Match Banner */}
                  {profile.isMutualSwap && (
                    <div className="mb-3 px-2.5 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl flex items-center gap-1.5 text-[11px] font-bold text-orange-800">
                      <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">
                        Mutual Swap Match! ({profile.matchedTeachSkill} ↔ {profile.matchedLearnSkill})
                      </span>
                    </div>
                  )}

                  {/* Header: Avatar, Name, Follow */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Link href={`/profile/${profile.id}`} className="flex items-center gap-3 group min-w-0">
                      <Avatar src={profile.avatar_url} name={profile.name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm truncate">
                            {profile.name}
                          </h3>
                          {profile.averageRating !== null && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              {profile.averageRating}
                            </span>
                          )}
                        </div>
                        {profile.college && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
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
                        <Badge key={idx} variant="blue" size="sm" className="inline-flex items-center gap-1">
                          {s.isVerified && (
                            <ShieldCheck
                              className="w-3 h-3 text-emerald-600 shrink-0"
                              aria-label="Verified Skill"
                            />
                          )}
                          <span>{s.skillName}</span>
                          <span className="text-[10px] opacity-75 capitalize">• {s.level}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* View Profile Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/profile/${profile.id}`}
                    className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline gap-1"
                  >
                    View Full Profile <ArrowRight className="w-3 h-3" />
                  </Link>
                  {profile.reviewsCount > 0 && (
                    <span className="text-[11px] text-slate-400">
                      {profile.reviewsCount} {profile.reviewsCount === 1 ? 'review' : 'reviews'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
