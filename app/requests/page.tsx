'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SessionStatus } from '@/lib/database.types'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  Inbox,
  Send,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

interface SessionRequestItem {
  id: string
  from_id: string
  to_id: string
  skill_id: string | null
  message: string
  status: SessionStatus
  created_at: string
  skills: { name: string } | null
  fromProfile?: { id: string; name: string; avatar_url: string; college: string } | null
  toProfile?: { id: string; name: string; avatar_url: string; college: string } | null
}

export default function RequestsPage() {
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [incoming, setIncoming] = useState<SessionRequestItem[]>([])
  const [outgoing, setOutgoing] = useState<SessionRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  const fetchRequests = async () => {
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // 1. Incoming requests: to_id = user.id
    const { data: incomingData, error: inErr } = await supabase
      .from('session_requests')
      .select(`
        id, from_id, to_id, skill_id, message, status, created_at,
        skills (name),
        fromProfile:from_id (id, name, avatar_url, college)
      `)
      .eq('to_id', user.id)
      .order('created_at', { ascending: false })

    if (inErr) console.error('Incoming error:', inErr)
    if (incomingData) setIncoming(incomingData as unknown as SessionRequestItem[])

    // 2. Outgoing requests: from_id = user.id
    const { data: outgoingData, error: outErr } = await supabase
      .from('session_requests')
      .select(`
        id, from_id, to_id, skill_id, message, status, created_at,
        skills (name),
        toProfile:to_id (id, name, avatar_url, college)
      `)
      .eq('from_id', user.id)
      .order('created_at', { ascending: false })

    if (outErr) console.error('Outgoing error:', outErr)
    if (outgoingData) setOutgoing(outgoingData as unknown as SessionRequestItem[])

    setLoading(false)
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleUpdateStatus = async (requestId: string, newStatus: 'accepted' | 'declined') => {
    setActionLoading(requestId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('session_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId)

      if (error) throw error

      success(newStatus === 'accepted' ? 'Session request accepted!' : 'Session request declined.')

      // Update state locally
      setIncoming((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update request'
      toastError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const renderStatusBadge = (status: SessionStatus) => {
    if (status === 'accepted') return <Badge variant="green">Accepted</Badge>
    if (status === 'declined') return <Badge variant="slate">Declined</Badge>
    return <Badge variant="amber">Pending</Badge>
  }

  const activeList = tab === 'incoming' ? incoming : outgoing

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Session Requests</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your 1-on-1 peer learning invites and scheduled sessions
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setTab('incoming')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === 'incoming'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Incoming ({incoming.length})
            </button>
            <button
              onClick={() => setTab('outgoing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === 'outgoing'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-4 h-4" />
              Sent ({outgoing.length})
            </button>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">
              No {tab === 'incoming' ? 'incoming' : 'outgoing'} requests
            </h3>
            <p className="text-sm text-slate-500">
              {tab === 'incoming'
                ? 'When another member requests a session with you, it will appear here.'
                : 'Browse mentors on Explore and send a session request to get started.'}
            </p>
            {tab === 'outgoing' && (
              <Link href="/explore">
                <Button size="sm" className="mt-2">
                  Explore Mentors
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeList.map((req) => {
              const otherProfile = tab === 'incoming' ? req.fromProfile : req.toProfile
              const otherName = otherProfile?.name || 'SkillSwap Member'
              const formattedDate = new Date(req.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <Link href={`/profile/${otherProfile?.id}`}>
                      <Avatar src={otherProfile?.avatar_url} name={otherName} size="lg" />
                    </Link>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/profile/${otherProfile?.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-base"
                        >
                          {otherName}
                        </Link>
                        {renderStatusBadge(req.status)}
                      </div>

                      {otherProfile?.college && (
                        <p className="text-xs text-slate-500">{otherProfile.college}</p>
                      )}

                      {/* Topic Skill */}
                      {req.skills?.name && (
                        <p className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md inline-block">
                          Topic: {req.skills.name}
                        </p>
                      )}

                      {/* Message body */}
                      {req.message && (
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 max-w-xl italic">
                          &quot;{req.message}&quot;
                        </p>
                      )}

                      <p className="text-[11px] text-slate-400">{formattedDate}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap sm:flex-col items-end gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    {/* If Accepted, show Open Session button */}
                    {req.status === 'accepted' && (
                      <Link href={`/sessions/${req.id}`} className="w-full sm:w-auto">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Open Session <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    )}

                    {/* If Incoming and Pending, show Accept / Decline */}
                    {tab === 'incoming' && req.status === 'pending' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUpdateStatus(req.id, 'accepted')}
                          isLoading={actionLoading === req.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(req.id, 'declined')}
                          disabled={actionLoading === req.id}
                          className="text-slate-600 hover:text-red-600 hover:border-red-200"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
