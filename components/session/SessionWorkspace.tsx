'use client'

import React, { useState } from 'react'
import { RealtimeChat } from '@/components/session/RealtimeChat'
import { NotesPanel } from '@/components/session/NotesPanel'
import { CollaborativeWhiteboard } from '@/components/session/CollaborativeWhiteboard'
import { AiStudyHelper } from '@/components/session/AiStudyHelper'
import { MessageSquare, FileText, PenTool, Sparkles } from 'lucide-react'

interface SessionWorkspaceProps {
  sessionId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string
  topic?: string
}

type ActiveTool = 'notes' | 'whiteboard' | 'ai'
type MobileTab = 'chat' | 'notes' | 'whiteboard' | 'ai'

export function SessionWorkspace({
  sessionId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  topic,
}: SessionWorkspaceProps) {
  const [desktopRightTab, setDesktopRightTab] = useState<ActiveTool>('notes')
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')

  const handleSelectTool = (tool: ActiveTool) => {
    setDesktopRightTab(tool)
    setMobileTab(tool)
  }

  return (
    <div className="space-y-4">
      {/* Mobile 4-Tab Bar (visible < lg) */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'chat'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </button>
        <button
          type="button"
          onClick={() => handleSelectTool('notes')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'notes'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Notes
        </button>
        <button
          type="button"
          onClick={() => handleSelectTool('whiteboard')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'whiteboard'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" /> Board
        </button>
        <button
          type="button"
          onClick={() => handleSelectTool('ai')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'ai'
              ? 'bg-white text-violet-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> AI
        </button>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Realtime Chat (always visible on lg, toggled on mobile) */}
        <div className={mobileTab === 'chat' ? 'block' : 'hidden lg:block'}>
          <RealtimeChat
            sessionId={sessionId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
          />
        </div>

        {/* Right Column: Notes & Code / Live Whiteboard / AI Study Helper */}
        <div className={mobileTab !== 'chat' ? 'block space-y-3' : 'hidden lg:block space-y-3'}>
          {/* Desktop Tool Switcher */}
          <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleSelectTool('notes')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                desktopRightTab === 'notes'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Notes & Code
            </button>
            <button
              type="button"
              onClick={() => handleSelectTool('whiteboard')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                desktopRightTab === 'whiteboard'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" /> Whiteboard
            </button>
            <button
              type="button"
              onClick={() => handleSelectTool('ai')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                desktopRightTab === 'ai'
                  ? 'bg-white text-violet-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Helper
            </button>
          </div>

          {/* Keep all mounted so state/whiteboard strokes are preserved across tab switches */}
          <div className={desktopRightTab === 'notes' ? 'block' : 'hidden'}>
            <NotesPanel
              sessionId={sessionId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          </div>

          <div className={desktopRightTab === 'whiteboard' ? 'block' : 'hidden'}>
            <CollaborativeWhiteboard sessionId={sessionId} currentUserId={currentUserId} />
          </div>

          <div className={desktopRightTab === 'ai' ? 'block' : 'hidden'}>
            <AiStudyHelper sessionId={sessionId} topic={topic} />
          </div>
        </div>
      </div>
    </div>
  )
}
