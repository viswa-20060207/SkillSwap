'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { NoteType } from '@/lib/database.types'
import {
  FileText,
  Code,
  Upload,
  Download,
  Copy,
  Check,
  AlertCircle,
  File,
  X,
} from 'lucide-react'

interface NoteItem {
  id: string
  session_id: string
  uploader_id: string
  type: NoteType
  title: string
  content: string
  file_path: string
  language: string
  created_at: string
  uploaderName?: string
}

interface NotesPanelProps {
  sessionId: string
  currentUserId: string
  currentUserName: string
}

export function NotesPanel({ sessionId, currentUserId, currentUserName }: NotesPanelProps) {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [filterType, setFilterType] = useState<'all' | 'file' | 'snippet'>('all')
  const [loading, setLoading] = useState(true)
  const [showSnippetModal, setShowSnippetModal] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Snippet modal form
  const [snippetTitle, setSnippetTitle] = useState('')
  const [snippetLanguage, setSnippetLanguage] = useState('Python')
  const [snippetCode, setSnippetCode] = useState('')
  const [savingSnippet, setSavingSnippet] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel>

    async function fetchNotes() {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id, session_id, uploader_id, type, title, content, file_path, language, created_at,
          profiles:uploader_id(name)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load notes:', error)
      } else if (data) {
        interface NoteQueryRow {
          id: string
          session_id: string
          uploader_id: string
          type: NoteType
          title: string
          content: string | null
          file_path: string | null
          language: string | null
          created_at: string
          profiles: { name: string } | null
        }
        const rows = data as unknown as NoteQueryRow[]
        const loaded: NoteItem[] = rows.map((r) => ({
          id: r.id,
          session_id: r.session_id,
          uploader_id: r.uploader_id,
          type: r.type,
          title: r.title,
          content: r.content || '',
          file_path: r.file_path || '',
          language: r.language || 'plaintext',
          created_at: r.created_at,
          uploaderName: r.profiles?.name || 'Peer',
        }))
        setNotes(loaded)
      }
      setLoading(false)

      // Realtime subscription
      channel = supabase
        .channel(`session_notes:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: `session_id=eq.${sessionId}`,
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const newRow = payload.new as NoteItem
              const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', newRow.uploader_id)
                .single()

              setNotes((prev) => [
                {
                  ...newRow,
                  uploaderName: profile?.name || 'Peer',
                },
                ...prev.filter((n) => n.id !== newRow.id),
              ])
            } else if (payload.eventType === 'DELETE') {
              setNotes((prev) => prev.filter((n) => n.id !== payload.old.id))
            }
          }
        )
        .on('broadcast', { event: 'new_note' }, (payload) => {
          const note = payload.payload as NoteItem
          setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)])
        })
        .subscribe()
    }

    fetchNotes()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [sessionId])

  // File Upload handling (PDF, PNG, JPG, max 5 MB)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMessage(null)
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Invalid file type. Allowed types: PDF, PNG, JPG.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5 MB
    if (file.size > maxSize) {
      setErrorMessage('File size exceeds the 5 MB limit.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadingFile(true)

    try {
      const supabase = createClient()
      const storagePath = `${sessionId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      // Upload to private 'notes' bucket
      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Insert notes row
      const { data: noteRow, error: insertError } = await supabase
        .from('notes')
        .insert({
          session_id: sessionId,
          uploader_id: currentUserId,
          type: 'file',
          title: file.name,
          file_path: storagePath,
          content: `${(file.size / 1024).toFixed(1)} KB`,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const newNote: NoteItem = {
        id: noteRow.id,
        session_id: sessionId,
        uploader_id: currentUserId,
        type: 'file',
        title: file.name,
        file_path: storagePath,
        content: `${(file.size / 1024).toFixed(1)} KB`,
        language: 'plaintext',
        created_at: noteRow.created_at,
        uploaderName: currentUserName,
      }

      setNotes((prev) => [newNote, ...prev])

      // Broadcast note to peer
      supabase.channel(`session_notes:${sessionId}`).send({
        type: 'broadcast',
        event: 'new_note',
        payload: newNote,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setErrorMessage(msg)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Download file via Signed URL
  const handleDownloadFile = async (filePath: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('notes')
        .createSignedUrl(filePath, 3600) // 1 hour expiration

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate download link.'
      setErrorMessage(msg)
    }
  }

  // Create Code Snippet
  const handleSaveSnippet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!snippetTitle.trim() || !snippetCode.trim()) return

    setSavingSnippet(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notes')
        .insert({
          session_id: sessionId,
          uploader_id: currentUserId,
          type: 'snippet',
          title: snippetTitle.trim(),
          content: snippetCode.trim(),
          language: snippetLanguage,
        })
        .select()
        .single()

      if (error) throw error

      const newNote: NoteItem = {
        id: data.id,
        session_id: sessionId,
        uploader_id: currentUserId,
        type: 'snippet',
        title: snippetTitle.trim(),
        content: snippetCode.trim(),
        language: snippetLanguage,
        file_path: '',
        created_at: data.created_at,
        uploaderName: currentUserName,
      }

      setNotes((prev) => [newNote, ...prev])

      // Broadcast
      supabase.channel(`session_notes:${sessionId}`).send({
        type: 'broadcast',
        event: 'new_note',
        payload: newNote,
      })

      setSnippetTitle('')
      setSnippetCode('')
      setShowSnippetModal(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save snippet.'
      setErrorMessage(msg)
    } finally {
      setSavingSnippet(false)
    }
  }

  // Copy code snippet to clipboard
  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredNotes = notes.filter((n) => filterType === 'all' || n.type === filterType)

  return (
    <div className="flex flex-col h-[520px] bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-bold text-slate-800">Shared Notes & Files</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Action: Upload File */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="text-xs h-8"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {uploadingFile ? 'Uploading...' : 'Upload File'}
          </Button>

          {/* Action: Share Snippet */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowSnippetModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
          >
            <Code className="w-3.5 h-3.5 mr-1" /> Share Code
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2 bg-white text-xs">
        <span className="text-slate-400 font-medium mr-1">Filter:</span>
        <button
          onClick={() => setFilterType('all')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filterType === 'all' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({notes.length})
        </button>
        <button
          onClick={() => setFilterType('snippet')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filterType === 'snippet'
              ? 'bg-purple-50 text-purple-700'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Snippets ({notes.filter((n) => n.type === 'snippet').length})
        </button>
        <button
          onClick={() => setFilterType('file')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            filterType === 'file' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Files ({notes.filter((n) => n.type === 'file').length})
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
            <Code className="w-8 h-8 opacity-40" />
            <p className="text-xs">No shared files or snippets yet.</p>
            <p className="text-[11px] text-slate-400">
              Upload a study PDF or share a C, C++, Python, or Java snippet.
            </p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2.5"
            >
              {/* Note Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {note.type === 'file' ? (
                    <File className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <Code className="w-4 h-4 text-purple-600 shrink-0" />
                  )}
                  <h4 className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-[280px]">
                    {note.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {note.type === 'snippet' && (
                    <Badge variant="purple" size="sm">
                      {note.language}
                    </Badge>
                  )}
                  <span className="text-[10px] text-slate-400">by {note.uploaderName}</span>
                </div>
              </div>

              {/* Note Body: Snippet vs File */}
              {note.type === 'snippet' ? (
                <div className="relative group">
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-48 leading-relaxed selection:bg-purple-600">
                    <code>{note.content}</code>
                  </pre>
                  <button
                    onClick={() => handleCopyCode(note.id, note.content)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs flex items-center gap-1 shadow-sm transition-colors"
                    title="Copy code"
                  >
                    {copiedId === note.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{note.title}</span>
                    <span className="text-slate-400 ml-2">({note.content})</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadFile(note.file_path)}
                    className="text-xs h-7 px-2.5"
                  >
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Share Snippet Modal */}
      {showSnippetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setShowSnippetModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-600" /> Share Code Snippet
            </h3>

            <form onSubmit={handleSaveSnippet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <Input
                  value={snippetTitle}
                  onChange={(e) => setSnippetTitle(e.target.value)}
                  placeholder="e.g. Binary Search Tree Insertion"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Language</label>
                <select
                  value={snippetLanguage}
                  onChange={(e) => setSnippetLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="C">C</option>
                  <option value="C++">C++</option>
                  <option value="Python">Python</option>
                  <option value="Java">Java</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="SQL">SQL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                <textarea
                  rows={8}
                  value={snippetCode}
                  onChange={(e) => setSnippetCode(e.target.value)}
                  placeholder="Paste your code snippet here..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSnippetModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={savingSnippet}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Post Snippet
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
