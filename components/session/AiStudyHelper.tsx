'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sparkles, Send, HelpCircle, BookCheck, Copy, Check } from 'lucide-react'

interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  provider?: string
}

interface AiStudyHelperProps {
  sessionId: string
  topic?: string
}

export function AiStudyHelper({ sessionId, topic = 'General Skills' }: AiStudyHelperProps) {
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const sendQuery = async (promptText: string, mode: 'ask' | 'quiz' | 'summary') => {
    if (loading) return
    const displayPrompt =
      promptText ||
      (mode === 'quiz'
        ? `Generate 3 practice questions for ${topic}`
        : `Summarize key study takeaways for ${topic}`)

    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: displayPrompt,
    }
    setMessages((prev) => [...prev, userMsg])
    if (mode === 'ask') setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          prompt: promptText,
          topic,
          mode,
        }),
      })

      const data = await res.json()
      const replyText = data.reply || data.error || 'Could not generate a response.'

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          provider: data.provider,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Network error while reaching AI Study Helper. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendQuery(input.trim(), 'ask')
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[560px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-50/80 to-blue-50/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Study Helper</h3>
            <p className="text-[11px] text-slate-500">
              Topic: <span className="font-semibold text-violet-700">{topic}</span>
            </p>
          </div>
        </div>

        {/* Quick Action Pills */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => sendQuery('', 'quiz')}
            className="text-xs bg-white"
          >
            <HelpCircle className="w-3.5 h-3.5 mr-1 text-violet-600" /> Practice Quiz
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => sendQuery('', 'summary')}
            className="text-xs bg-white"
          >
            <BookCheck className="w-3.5 h-3.5 mr-1 text-blue-600" /> Study Plan
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Instant AI Study Companion</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ask any doubt about <span className="font-semibold">{topic}</span>, generate practice
              questions for your session, or build a quick study checklist.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap relative ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                }`}
              >
                {m.content}
                {m.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-400">
                      {m.provider === 'gemini' ? 'Powered by Gemini AI' : 'Built-in Study Guide'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(m.id, m.content)}
                      className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
              <span className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask a question about ${topic}...`}
          className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <Button type="submit" size="sm" isLoading={loading} disabled={!input.trim()}>
          <Send className="w-4 h-4 mr-1" /> Ask
        </Button>
      </form>
    </div>
  )
}
