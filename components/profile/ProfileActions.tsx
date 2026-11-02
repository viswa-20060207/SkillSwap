'use client'

import React, { useState } from 'react'
import { FollowButton } from '@/components/profile/FollowButton'
import { RequestSessionModal } from '@/components/session/RequestSessionModal'
import { ReportModal } from '@/components/profile/ReportModal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Flag,
  UserX,
  MoreVertical,
} from 'lucide-react'

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
  initialIsBlocked: boolean
  skills: SkillOption[]
}

export function ProfileActions({
  targetUserId,
  targetUserName,
  initialIsFollowing,
  initialFollowersCount,
  initialIsBlocked,
  skills,
}: ProfileActionsProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked)
  const [blockLoading, setBlockLoading] = useState(false)
  const { success, error } = useToast()

  const handleToggleBlock = async () => {
    setBlockLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      error('You must be signed in to perform this action.')
      setBlockLoading(false)
      return
    }

    try {
      if (isBlocked) {
        // Unblock
        const { error: unblockErr } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', targetUserId)

        if (unblockErr) throw unblockErr

        setIsBlocked(false)
        success(`Unblocked ${targetUserName}`)
      } else {
        // Block
        const { error: blockErr } = await supabase.from('blocks').insert({
          blocker_id: user.id,
          blocked_id: targetUserId,
        })

        if (blockErr) throw blockErr

        setIsBlocked(true)
        success(`Blocked ${targetUserName}. They cannot contact you or view you in search.`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed.'
      error(msg)
    } finally {
      setBlockLoading(false)
      setMenuOpen(false)
    }
  }

  return (
    <div className="flex items-center gap-2 relative">
      {isBlocked ? (
        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <UserX className="w-3.5 h-3.5" /> Blocked
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleBlock}
            isLoading={blockLoading}
            className="text-xs"
          >
            Unblock
          </Button>
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Safety Menu (3 dots) */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          title="More actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setMenuOpen(false)
                setReportOpen(true)
              }}
              className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
            >
              <Flag className="w-3.5 h-3.5 text-amber-500" /> Report Profile
            </button>
            <button
              onClick={handleToggleBlock}
              disabled={blockLoading}
              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
            >
              <UserX className="w-3.5 h-3.5 text-red-500" />
              {isBlocked ? 'Unblock Profile' : 'Block Profile'}
            </button>
          </div>
        )}
      </div>

      <RequestSessionModal
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        skills={skills}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <ReportModal
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  )
}
