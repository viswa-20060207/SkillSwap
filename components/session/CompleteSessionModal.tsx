'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { X, Star, CheckCircle2, Award } from 'lucide-react'

interface CompleteSessionModalProps {
  sessionId: string
  currentUserId: string
  otherUserId: string
  otherUserName: string
  skillName?: string
  initialCompleted: boolean
  initialHasReviewed: boolean
}

export function CompleteSessionAction({
  sessionId,
  currentUserId,
  otherUserId,
  otherUserName,
  skillName,
  initialCompleted,
  initialHasReviewed,
}: CompleteSessionModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [completed, setCompleted] = useState(initialCompleted)
  const [hasReviewed, setHasReviewed] = useState(initialHasReviewed)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { success, error: toastError } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()

      // 1. Mark session completed_at if not already set
      if (!completed) {
        const { error: updateErr } = await supabase
          .from('session_requests')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', sessionId)

        if (updateErr) throw updateErr
        setCompleted(true)
      }

      // 2. Insert review
      if (!hasReviewed) {
        const { error: reviewErr } = await supabase.from('session_reviews').insert({
          session_id: sessionId,
          reviewer_id: currentUserId,
          reviewee_id: otherUserId,
          rating,
          comment: comment.trim(),
        })

        if (reviewErr) throw reviewErr
        setHasReviewed(true)
      }

      success(`Thank you! Session marked complete & review saved for ${otherUserName}.`)
      setIsOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save review.'
      toastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {hasReviewed ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4" /> Completed & Reviewed
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="border-amber-300 bg-amber-50/70 text-amber-800 hover:bg-amber-100"
        >
          <Star className="w-3.5 h-3.5 mr-1.5 fill-amber-400 text-amber-500" />
          {completed ? 'Rate Session' : 'Complete & Rate'}
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Complete & Rate Session</h2>
                <p className="text-xs text-slate-500">
                  Rate your {skillName || 'SkillSwap'} session with {otherUserName}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Interactive Stars */}
              <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-2">How was your experience?</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || rating)
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            active ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-amber-700 font-medium mt-1.5">
                  {rating === 5
                    ? 'Excellent Mentor!'
                    : rating === 4
                    ? 'Very Helpful'
                    : rating === 3
                    ? 'Good Session'
                    : rating === 2
                    ? 'Could Be Better'
                    : 'Needs Improvement'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Feedback / Review (optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`Share what you learned from ${otherUserName}...`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Submit & Complete
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
