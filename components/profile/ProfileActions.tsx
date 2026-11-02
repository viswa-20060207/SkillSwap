'use client'

import React, { useState } from 'react'
import { FollowButton } from '@/components/profile/FollowButton'
import { RequestSessionModal } from '@/components/session/RequestSessionModal'
import { Button } from '@/components/ui/Button'
import { Calendar } from 'lucide-react'

interface SkillOption {
  id: string
  name: string
  level: string
}

interface ProfileActionsProps {
  targetUserId: string
  targetUserName: string
  initialIsFollowing: boolean
  initialFollowersCount: number
  skills: SkillOption[]
}

export function ProfileActions({
  targetUserId,
  targetUserName,
  initialIsFollowing,
  initialFollowersCount,
  skills,
}: ProfileActionsProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex items-center gap-2.5">
      <Button
        variant="primary"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
      >
        <Calendar className="w-4 h-4 mr-1.5" /> Request Session
      </Button>

      <FollowButton
        targetUserId={targetUserId}
        initialIsFollowing={initialIsFollowing}
        initialFollowersCount={initialFollowersCount}
      />

      <RequestSessionModal
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        skills={skills}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
