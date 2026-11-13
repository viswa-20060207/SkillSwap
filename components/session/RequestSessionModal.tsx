'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { X, Send, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface SkillOption {
  id: string
  name: string
  level: string
}

interface RequestSessionModalProps {
  targetUserId: string
  targetUserName: string
  skills: SkillOption[]
  isOpen: boolean
  onClose: () => void
}

export function RequestSessionModal({
  targetUserId,
  targetUserName,
  skills,
  isOpen,
  onClose,
}: RequestSessionModalProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<string>(skills[0]?.id || '')
  const [message, setMessage] = useState('')
  const [proposedDate, setProposedDate] = useState('')
  const [durationMins, setDurationMins] = useState<number>(45)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be signed in to request a session.')
        setLoading(false)
        return
      }

      // Check if blocked in either direction
      const { data: isBlocked } = await supabase
        .from('blocks')
        .select('blocker_id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`)
        .maybeSingle()

      if (isBlocked) {
        setError('You cannot send a session request to this user.')
        setLoading(false)
        return
      }

      const schedulePrefix = proposedDate
        ? `[📅 Proposed: ${new Date(proposedDate).toLocaleDateString()} at ${new Date(proposedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${durationMins} mins)]\n\n`
        : ''

      const finalMessage = `${schedulePrefix}${message.trim()}`

      const { error: insertError } = await supabase.from('session_requests').insert({
        from_id: user.id,
        to_id: targetUserId,
        skill_id: selectedSkillId || null,
        message: finalMessage,
        status: 'pending',
      })

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setMessage('')
        setProposedDate('')
        onClose()
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send session request.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Request a Session</h2>
            <p className="text-xs text-slate-500">Learn 1-on-1 with {targetUserName}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="font-bold text-slate-900">Session Request Sent!</h3>
            <p className="text-xs text-slate-500">
              {targetUserName} will be notified to review and accept your request.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="skill-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Topic / Skill to Learn
              </label>
              {skills.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  {targetUserName} hasn&apos;t listed any specific teaching skills yet, but you can still send a general request!
                </p>
              ) : (
                <select
                  id="skill-select"
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.level})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Smart Schedule: Date & Time Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> Proposed Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Duration
                </label>
                <div className="flex items-center gap-1">
                  {[30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMins(mins)}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition-all ${
                        durationMins === mins
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="session-msg" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Message / Agenda
              </label>
              <textarea
                id="session-msg"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'd love to learn more about Java multithreading and do a 45-minute practice session..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={loading}>
                <Send className="w-3.5 h-3.5 mr-1.5" /> Send Request
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
