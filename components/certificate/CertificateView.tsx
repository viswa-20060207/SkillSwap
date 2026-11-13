'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import {
  Printer,
  Share2,
  CheckCircle2,
  Award,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'

interface CertificateViewProps {
  sessionId: string
  learnerName: string
  learnerCollege?: string
  mentorName: string
  mentorCollege?: string
  skillName: string
  skillCategory?: string
  completionDate: string
}

export function CertificateView({
  sessionId,
  learnerName,
  learnerCollege,
  mentorName,
  mentorCollege,
  skillName,
  skillCategory = 'Skill Mastery',
  completionDate,
}: CertificateViewProps) {
  const [copied, setCopied] = useState(false)

  const certId = `SWAP-${sessionId.substring(0, 8).toUpperCase()}`
  const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareText = `Proud to receive my SkillSwap Certificate of Talent Sharing & Mutual Learning for 1-on-1 peer exchange in ${skillName}! Verified credential ID: ${certId}`
  const linkedInShareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(
    shareText
  )}`

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 print:p-0 print:bg-white">
      {/* Top Controls Bar (hidden during print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/sessions/${sessionId}`}>
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Session
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs bg-white text-slate-700 hover:bg-slate-50"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Copied!
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 mr-1.5" /> Copy Credential Link
              </>
            )}
          </Button>

          <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/30 hover:bg-[#0077b5]/20"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Share on LinkedIn
            </Button>
          </a>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Printable Certificate Canvas */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border-8 border-double border-amber-600/30 p-8 sm:p-14 relative overflow-hidden print:border-4 print:border-amber-700/50 print:shadow-none print:m-0 print:max-w-none print:w-full">
        {/* Background Watermark Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full border-[40px] border-amber-900 flex items-center justify-center">
            <span className="text-9xl font-serif font-black text-amber-950">SS</span>
          </div>
        </div>

        {/* Outer Fine Line */}
        <div className="border border-amber-400/50 rounded-2xl p-6 sm:p-10 relative z-10 bg-gradient-to-b from-amber-50/20 via-white to-amber-50/20">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-2xl shadow-md mb-2">
              TS
            </div>
            <div className="flex items-center justify-center gap-1.5 text-amber-600 font-semibold tracking-widest text-xs uppercase">
              <Sparkles className="w-3.5 h-3.5" /> A Smart Platform for Talent Sharing &amp; Mutual Learning <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-extrabold text-slate-900 tracking-tight uppercase">
              Certificate of Completion
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-wide">
              A SMART PLATFORM FOR TALENT SHARING &amp; MUTUAL LEARNING
            </p>
          </div>

          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto my-6" />

          {/* Recipient */}
          <div className="text-center space-y-4 my-8">
            <p className="text-xs sm:text-sm text-slate-500 uppercase tracking-widest font-semibold">
              This is to certify that
            </p>
            <div className="text-2xl sm:text-4xl font-bold font-serif text-blue-900 tracking-tight decoration-amber-400/60 underline underline-offset-8">
              {learnerName}
            </div>
            {learnerCollege && (
              <p className="text-xs text-slate-500 font-medium">{learnerCollege}</p>
            )}

            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed pt-2">
              has successfully completed an intensive 1-on-1 collaborative peer learning and practical exchange session in
            </p>

            {/* Skill Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-base sm:text-lg font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>{skillName}</span>
              <span className="text-xs font-normal text-blue-600 capitalize">({skillCategory})</span>
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-100 items-end">
            {/* Mentor Signature */}
            <div className="text-center sm:text-left space-y-1">
              <div className="font-serif italic text-lg sm:text-xl text-slate-800 border-b border-slate-300 pb-1">
                {mentorName}
              </div>
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Peer Mentor &amp; Guide
              </p>
              {mentorCollege && (
                <p className="text-[10px] text-slate-400">{mentorCollege}</p>
              )}
            </div>

            {/* Gold Verified Seal */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full border-4 border-amber-500 bg-gradient-to-br from-amber-400 via-amber-200 to-amber-500 flex flex-col items-center justify-center shadow-lg text-amber-950 p-1">
                <Award className="w-6 h-6 text-amber-900" />
                <span className="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5">
                  VERIFIED
                </span>
                <span className="text-[7px] font-bold tracking-tighter leading-none text-amber-900">
                  PEER SWAP
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-2">
                ID: {certId}
              </span>
            </div>

            {/* Date & Issue */}
            <div className="text-center sm:text-right space-y-1">
              <div className="font-medium text-slate-800 text-sm border-b border-slate-300 pb-1">
                {formattedDate}
              </div>
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Date of Issue
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">✓ Cryptographically Logged</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-slate-100/60 text-center">
            <p className="text-[10px] text-slate-400">
              Verified by SkillSwap Collaborative Learning Network • Powered by Supabase Realtime &amp; Daily.co • Unique Verification ID: {sessionId}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
