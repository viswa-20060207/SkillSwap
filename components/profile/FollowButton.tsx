'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { UserCheck, UserPlus } from 'lucide-react'

interface FollowButtonProps {
  targetUserId: string
  initialIsFollowing: boolean
  initialFollowersCount?: number
  onToggle?: (isFollowing: boolean) => void
  size?: 'sm' | 'md'
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  initialFollowersCount,
  onToggle,
  size = 'sm',
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [loading, setLoading] = useState(false)

  const handleToggleFollow = async () => {
    // Optimistic UI update
    const previousState = isFollowing
    const newState = !previousState

    setIsFollowing(newState)
    if (typeof followersCount === 'number') {
      setFollowersCount((prev) => (prev ?? 0) + (newState ? 1 : -1))
    }
    onToggle?.(newState)

    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      if (newState) {
        // Follow
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: targetUserId,
        })
        if (error) throw error
      } else {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
        if (error) throw error
      }
    } catch {
      // Revert optimistic update on error
      setIsFollowing(previousState)
      if (typeof followersCount === 'number') {
        setFollowersCount((prev) => (prev ?? 0) + (previousState ? 1 : -1))
      }
      onToggle?.(previousState)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : 'primary'}
      size={size}
      onClick={handleToggleFollow}
      disabled={loading}
      className={
        isFollowing
          ? 'text-slate-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4 mr-1.5 text-blue-600" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Follow
        </>
      )}
    </Button>
  )
}
