'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import {
  Palette,
  Eraser,
  Trash2,
  Download,
  PenTool,
  Radio,
} from 'lucide-react'

interface StrokeSegment {
  x0: number
  y0: number
  x1: number
  y1: number
  color: string
  width: number
}

interface CollaborativeWhiteboardProps {
  sessionId: string
  currentUserId: string
}

const COLORS = [
  { name: 'Ink', hex: '#0f172a' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Purple', hex: '#9333ea' },
]

export function CollaborativeWhiteboard({
  sessionId,
  currentUserId,
}: CollaborativeWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const [color, setColor] = useState('#0f172a')
  const [brushSize, setBrushSize] = useState(3)
  const [isEraser, setIsEraser] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const drawSegment = useCallback((seg: StrokeSegment) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    ctx.beginPath()
    ctx.moveTo(seg.x0 * w, seg.y0 * h)
    ctx.lineTo(seg.x1 * w, seg.y1 * h)
    ctx.strokeStyle = seg.color
    ctx.lineWidth = seg.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.closePath()
  }, [])

  const clearCanvasLocal = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  // Initialize white background and subscribe to Supabase Realtime Broadcast
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    const supabase = createClient()
    const existing = supabase.getChannels().find(
      (c) => c.topic === `realtime:whiteboard:${sessionId}`
    )
    if (existing) {
      supabase.removeChannel(existing)
    }

    const channel = supabase.channel(`whiteboard:${sessionId}`, {
      config: {
        broadcast: { self: false },
      },
    })

    channel
      .on('broadcast', { event: 'draw' }, ({ payload }) => {
        if (payload && payload.senderId !== currentUserId) {
          drawSegment(payload.segment as StrokeSegment)
        }
      })
      .on('broadcast', { event: 'clear' }, ({ payload }) => {
        if (payload && payload.senderId !== currentUserId) {
          clearCanvasLocal()
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [sessionId, currentUserId, drawSegment, clearCanvasLocal])

  const getNormalizedCoords = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    }
  }

  const startDrawing = (clientX: number, clientY: number) => {
    const pt = getNormalizedCoords(clientX, clientY)
    if (!pt) return
    isDrawingRef.current = true
    lastPointRef.current = pt
  }

  const moveDrawing = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current || !lastPointRef.current) return
    const nextPt = getNormalizedCoords(clientX, clientY)
    if (!nextPt) return

    const seg: StrokeSegment = {
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: nextPt.x,
      y1: nextPt.y,
      color: isEraser ? '#ffffff' : color,
      width: isEraser ? Math.max(brushSize * 4, 16) : brushSize,
    }

    drawSegment(seg)
    lastPointRef.current = nextPt

    channelRef.current?.send({
      type: 'broadcast',
      event: 'draw',
      payload: { senderId: currentUserId, segment: seg },
    })
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  const handleClear = () => {
    clearCanvasLocal()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'clear',
      payload: { senderId: currentUserId },
    })
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `skillswap-whiteboard-${sessionId.slice(0, 6)}.png`
    a.click()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Header & Controls */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Live Collaborative Whiteboard</h3>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
              {isConnected ? 'Synced live with peer' : 'Connecting...'}
            </p>
          </div>
        </div>

        {/* Color & Brush Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Palette className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            {COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                onClick={() => {
                  setColor(c.hex)
                  setIsEraser(false)
                }}
                className={`w-4 h-4 rounded-full transition-transform ${
                  !isEraser && color === c.hex ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : ''
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          <select
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700"
            aria-label="Brush thickness"
          >
            <option value={2}>Thin</option>
            <option value={4}>Medium</option>
            <option value={8}>Thick</option>
          </select>

          <Button
            type="button"
            variant={isEraser ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsEraser(!isEraser)}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5 mr-1" /> Eraser
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            title="Save drawing as PNG"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Save
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-red-600 hover:bg-red-50"
            title="Clear board for both users"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="p-3 bg-slate-100/60">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrawing(e.clientX, e.clientY)}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            if (e.touches[0]) startDrawing(e.touches[0].clientX, e.touches[0].clientY)
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) moveDrawing(e.touches[0].clientX, e.touches[0].clientY)
          }}
          onTouchEnd={stopDrawing}
          className="w-full aspect-video bg-white rounded-xl border border-slate-200 shadow-inner cursor-crosshair touch-none"
        />
      </div>
    </div>
  )
}
