import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.sessionId

    // 1. Verify user is a participant of the accepted session
    const { data: session, error: sessionError } = await supabase
      .from('session_requests')
      .select('id, from_id, to_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const isParticipant = session.from_id === user.id || session.to_id === user.id
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.status !== 'accepted') {
      return NextResponse.json({ error: 'Session is not accepted yet' }, { status: 400 })
    }

    const dailyApiKey = process.env.DAILY_API_KEY
    const roomName = `skillswap-${sessionId.replace(/[^a-zA-Z0-9-]/g, '')}`

    // 2. If DAILY_API_KEY is configured, interact with Daily.co REST API
    if (dailyApiKey && dailyApiKey !== 'your-daily-api-key') {
      const expTimestamp = Math.floor(Date.now() / 1000) + 7200 // 2 hours expiration

      // Try creating room
      const createRes = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName,
          privacy: 'public',
          properties: {
            exp: expTimestamp,
            start_video_off: true,
            start_audio_off: false,
            enable_screenshare: true,
          },
        }),
      })

      if (createRes.ok) {
        const roomData = await createRes.json()
        return NextResponse.json({ url: roomData.url })
      }

      // If room already exists, fetch existing room
      const getRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
        },
      })

      if (getRes.ok) {
        const existingData = await getRes.json()
        return NextResponse.json({ url: existingData.url })
      }
    }

    // Fallback room URL if DAILY_API_KEY is pending or for testing
    // Daily demo domain or direct link
    const fallbackUrl = `https://skillswap.daily.co/${roomName}`
    return NextResponse.json({
      url: fallbackUrl,
      notice: !dailyApiKey ? 'DAILY_API_KEY not configured in .env.local; returning room placeholder URL' : undefined,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
