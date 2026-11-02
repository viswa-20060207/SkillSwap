'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Send, MessageSquare, Clock } from 'lucide-react'

interface ChatMessage {
  id: string
  session_id: string
  sender_id: string
  body: string
  created_at: string
  senderName?: string
  senderAvatar?: string
  isOptimistic?: boolean
}

interface RealtimeChatProps {
  sessionId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
}

export function RealtimeChat({
  sessionId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: RealtimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load last 50 messages and set up realtime subscription
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel>

    async function initChat() {
      // 1. Fetch initial 50 messages
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id, session_id, sender_id, body, created_at,
          profiles:sender_id (name, avatar_url)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        console.error('Failed to load messages:', error)
      } else if (data) {
        interface MsgQueryRow {
          id: string
          session_id: string
          sender_id: string
          body: string
          created_at: string
          profiles: { name: string; avatar_url: string } | null
        }
        const rows = data as unknown as MsgQueryRow[]
        const loaded: ChatMessage[] = rows.map((m) => ({
          id: m.id,
          session_id: m.session_id,
          sender_id: m.sender_id,
          body: m.body,
          created_at: m.created_at,
          senderName: m.profiles?.name || 'Peer',
          senderAvatar: m.profiles?.avatar_url || '',
        }))
        setMessages(loaded)
      }
      setLoading(false)
      scrollToBottom()

      // 2. Set up realtime channel with postgres_changes and broadcast
      channel = supabase
        .channel(`session_chat:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `session_id=eq.${sessionId}`,
          },
          async (payload) => {
            const newMsg = payload.new as ChatMessage
            // Fetch sender profile name
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()

            setMessages((prev) => {
              // Replace optimistic message if match exists, otherwise append
              const filtered = prev.filter(
                (m) => !(m.isOptimistic && m.sender_id === newMsg.sender_id && m.body === newMsg.body)
              )
              return [
                ...filtered,
                {
                  ...newMsg,
                  senderName: senderProfile?.name || 'Peer',
                  senderAvatar: senderProfile?.avatar_url || '',
                },
              ]
            })
            scrollToBottom()
          }
        )
        .on('broadcast', { event: 'chat_message' }, (payload) => {
          const msg = payload.payload as ChatMessage
          if (msg.sender_id !== currentUserId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            scrollToBottom()
          }
        })
        .subscribe()
    }

    initChat()

    // 3. Unsubscribe on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [sessionId, currentUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    const text = inputText.trim()
    if (!text) return

    const tempId = `temp-${Date.now()}`
    const nowIso = new Date().toISOString()

    const optimisticMsg: ChatMessage = {
      id: tempId,
      session_id: sessionId,
      sender_id: currentUserId,
      body: text,
      created_at: nowIso,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      isOptimistic: true,
    }

    // Optimistic UI update
    setMessages((prev) => [...prev, optimisticMsg])
    setInputText('')
    scrollToBottom()

    try {
      const supabase = createClient()

      // Broadcast immediately for instant peer reflection
      supabase.channel(`session_chat:${sessionId}`).send({
        type: 'broadcast',
        event: 'chat_message',
        payload: optimisticMsg,
      })

      // Insert into messages table
      const { data, error } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          sender_id: currentUserId,
          body: text,
        })
        .select()
        .single()

      if (error) throw error

      // Update optimistic message with real ID
      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: data.id, isOptimistic: false } : m))
        )
      }
    } catch (err) {
      console.error('Send message failed:', err)
      // Revert optimistic on critical failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[520px] bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-800">Realtime Chat</h2>
        </div>
        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 opacity-40" />
            <p className="text-xs">No messages yet. Say hello to begin your session!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <Avatar src={msg.senderAvatar} name={msg.senderName || 'Peer'} size="sm" />
                )}

                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-900 rounded-bl-xs'
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-bold text-slate-500 mb-0.5">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                  <p
                    className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                      isMe ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {timeStr}
                    {msg.isOptimistic && <span className="italic ml-0.5 opacity-80">(sending...)</span>}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            className="flex-1 bg-transparent border-0 focus:outline-none text-xs text-slate-900 resize-none max-h-24 py-1 px-1.5 placeholder:text-slate-400"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="rounded-lg p-2 h-8 w-8 shrink-0 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
            title="Send (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
