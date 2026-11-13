import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Trophy, Star, Sparkles, ArrowRight, Flame } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface LeaderboardUser {
  id: string
  name: string
  avatar_url: string
  college: string
  bio: string
  sessionsCompleted: number
  avgRating: number
  reviewCount: number
  verifiedSkillsCount: number
  talentScore: number
  badges: string[]
}

export default async function LeaderboardPage() {
  const supabase = createClient()

  // 1. Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, college, bio')
    .limit(50)

  // 2. Fetch completed sessions
  const { data: sessions } = await supabase
    .from('session_requests')
    .select('id, from_id, to_id, status, completed_at')
    .eq('status', 'accepted')

  // 3. Fetch reviews
  let reviews: Array<{ reviewee_id: string; rating: number }> = []
  try {
    const { data: revData } = await supabase
      .from('session_reviews')
      .select('reviewee_id, rating')
    if (revData) reviews = revData
  } catch {
    // Graceful fallback
  }

  // 4. Fetch verified skills
  let userSkills: Array<{ user_id: string; is_verified?: boolean }> = []
  try {
    const { data: skData } = await supabase
      .from('user_skills')
      .select('user_id, is_verified')
    if (skData) userSkills = skData
  } catch {
    // Graceful fallback
  }

  // Aggregate user statistics
  const leaderboardList: LeaderboardUser[] = (profiles || []).map((p) => {
    // Count completed sessions where user was either mentor or learner
    const completedCount = (sessions || []).filter(
      (s) => (s.from_id === p.id || s.to_id === p.id)
    ).length

    // Average rating
    const userReviews = reviews.filter((r) => r.reviewee_id === p.id)
    const avgRating =
      userReviews.length > 0
        ? Number((userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1))
        : 5.0

    // Verified skills
    const verifiedCount = userSkills.filter(
      (s) => s.user_id === p.id && s.is_verified === true
    ).length

    // Talent Score formula: (completed * 20) + (verified * 30) + (rating * 10) + base activity
    const talentScore = completedCount * 25 + verifiedCount * 30 + Math.round(avgRating * 10) + 15

    const badges: string[] = []
    if (completedCount >= 3) badges.push('Top Mentor')
    if (verifiedCount > 0) badges.push('Verified Pro')
    if (avgRating >= 4.8 && userReviews.length > 0) badges.push('5-Star Peer')
    if (completedCount >= 1 && verifiedCount === 0) badges.push('Active Swapper')

    return {
      id: p.id,
      name: p.name || 'SkillSwap Member',
      avatar_url: p.avatar_url || '',
      college: p.college || 'Engineering College',
      bio: p.bio || '',
      sessionsCompleted: completedCount,
      avgRating,
      reviewCount: userReviews.length,
      verifiedSkillsCount: verifiedCount,
      talentScore,
      badges,
    }
  })

  // Sort by talentScore descending
  leaderboardList.sort((a, b) => b.talentScore - a.talentScore)

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-6 sm:p-10 shadow-lg">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-xs border border-blue-400/20">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Real-Time Community Talent Rankings</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Talent Sharing Leaderboard
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Recognizing top peer mentors, active knowledge swappers, and verified skill leaders across colleges.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10">
            <Flame className="w-8 h-8 text-amber-400 animate-pulse" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                Network Impact
              </p>
              <p className="text-xl font-black text-white">
                {(sessions || []).length * 45} mins Swapped
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
        {leaderboardList.slice(0, 3).map((user, idx) => {
          const rankColors = [
            'border-amber-400/80 bg-gradient-to-b from-amber-500/10 to-transparent',
            'border-slate-300 bg-gradient-to-b from-slate-200/20 to-transparent',
            'border-amber-700/50 bg-gradient-to-b from-amber-700/10 to-transparent',
          ]
          const medalEmojis = ['🥇 #1', '🥈 #2', '🥉 #3']

          return (
            <div
              key={user.id}
              className={`relative bg-white rounded-2xl border-2 p-6 shadow-sm flex flex-col items-center text-center space-y-3 transition-all hover:shadow-md ${rankColors[idx]}`}
            >
              <div className="absolute top-3 right-3 text-xs font-black px-2.5 py-1 rounded-full bg-slate-900 text-white shadow-xs">
                {medalEmojis[idx]}
              </div>

              <div className="relative">
                <Avatar src={user.avatar_url} name={user.name} size="xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-xs shadow-xs">
                  ★
                </div>
              </div>

              <div className="space-y-0.5">
                <h3 className="font-bold text-base text-slate-900">{user.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-1">{user.college}</p>
              </div>

              <div className="flex items-center gap-2 py-1 px-3 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{user.talentScore} Karma Pts</span>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-slate-100 text-left text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-medium">Swaps</span>
                  <span className="font-bold text-slate-800">{user.sessionsCompleted} completed</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-medium">Rating</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {user.avgRating}
                  </span>
                </div>
              </div>

              <Link href={`/profile/${user.id}`} className="w-full pt-1">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  View Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">All Talent Leaders</h2>
            <p className="text-xs text-slate-500">Ranked by peer sessions, verification badges &amp; karma score</p>
          </div>
          <Badge variant="blue" size="sm">
            {leaderboardList.length} Active Peers
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Rank</th>
                <th className="py-3.5 px-4">Member</th>
                <th className="py-3.5 px-4">Badges</th>
                <th className="py-3.5 px-4 text-center">Swaps</th>
                <th className="py-3.5 px-4 text-center">Rating</th>
                <th className="py-3.5 px-4 text-right">Karma Pts</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboardList.map((user, index) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-700">
                    {index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatar_url} name={user.name} size="sm" />
                      <div>
                        <Link
                          href={`/profile/${user.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-1"
                        >
                          {user.name}
                        </Link>
                        <p className="text-xs text-slate-400 line-clamp-1">{user.college}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {user.badges.slice(0, 2).map((b) => (
                        <span
                          key={b}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50"
                        >
                          {b}
                        </span>
                      ))}
                      {user.badges.length === 0 && (
                        <span className="text-[10px] text-slate-400">Rising Peer</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                    {user.sessionsCompleted}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex items-center gap-1 font-semibold text-amber-600 text-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{user.avgRating}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-extrabold text-blue-600 text-sm">
                      {user.talentScore}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Link href={`/profile/${user.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:bg-blue-50">
                        Profile
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
