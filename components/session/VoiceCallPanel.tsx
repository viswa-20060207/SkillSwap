'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PhoneCall, PhoneOff, AlertCircle, Maximize2, Minimize2 } from 'lucide-react'

interface VoiceCallPanelProps {
  sessionId: string
}

export function VoiceCallPanel({ sessionId }: VoiceCallPanelProps) {
  const [callActive, setCallActive] = useState(false)
  const [callUrl, setCallUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleStartCall = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/call/${sessionId}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to start voice call')
      }

      setCallUrl(data.url)
      setCallActive(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting call'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveCall = () => {
    setCallActive(false)
    setCallUrl(null)
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!callActive ? (
        <Button
          variant="primary"
          size="sm"
          onClick={handleStartCall}
          isLoading={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <PhoneCall className="w-4 h-4 mr-1.5" /> Start Voice Call
        </Button>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-200">
          {/* Call Bar Header */}
          <div className="px-5 py-3 bg-slate-950 flex items-center justify-between text-white border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold tracking-wide">Daily.co Voice Session Active</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                Audio-First
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title={isExpanded ? 'Minimize call window' : 'Expand call window'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleLeaveCall}
                className="text-xs h-7 px-3 bg-red-600 hover:bg-red-700 font-semibold"
              >
                <PhoneOff className="w-3.5 h-3.5 mr-1" /> Leave Call
              </Button>
            </div>
          </div>

          {/* Embedded Daily Call Iframe */}
          {callUrl && (
            <div className={`w-full ${isExpanded ? 'h-[500px]' : 'h-[300px]'} bg-slate-950 transition-all`}>
              <iframe
                src={callUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full border-0"
                title="Daily.co Voice Call Room"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
