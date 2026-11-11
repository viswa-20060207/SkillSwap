import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AiHelperRequestBody {
  sessionId?: string
  prompt?: string
  topic?: string
  mode?: 'ask' | 'quiz' | 'summary'
}

function buildSmartStudyFallback(topic: string, prompt: string, mode: string): string {
  const cleanTopic = topic || 'this skill'

  if (mode === 'quiz') {
    return [
      `### Practice Questions for ${cleanTopic}`,
      '',
      `1. **Core Concept:** Explain the most important foundational principle in ${cleanTopic} in your own words, and describe when you would apply it.`,
      `2. **Debugging / Problem Solving:** What is a common beginner mistake when working with ${cleanTopic}, and how do you diagnose and fix it?`,
      `3. **Practical Exercise:** Design a small 15-minute mini-task using ${cleanTopic} and walk your peer through step-by-step.`,
      '',
      `_Tip: Add \`GEMINI_API_KEY\` to your environment variables to unlock dynamic live Gemini AI responses._`,
    ].join('\n')
  }

  if (mode === 'summary') {
    return [
      `### Study Checklist for ${cleanTopic}`,
      '',
      `- **Goal Setting:** Confirm what specific sub-topic the learner wants to master today.`,
      `- **Live Walkthrough:** Demonstrate 1 concrete example in the Notes/Whiteboard tab before diving into edge cases.`,
      `- **Hands-on Practice:** Have the learner explain or solve a small variation back to verify understanding.`,
      `- **Next Steps:** Share a snippet or PDF reference under Notes & Code for follow-up review.`,
      '',
      `_Tip: Add \`GEMINI_API_KEY\` to your environment variables for live Gemini AI session summarization._`,
    ].join('\n')
  }

  return [
    `### Study Guide: ${cleanTopic}`,
    prompt ? `**Your Question:** "${prompt}"` : '',
    '',
    `Here is a structured way to tackle this during your ${cleanTopic} session:`,
    `1. **Break it down:** Identify the inputs, core logic, and expected outcome.`,
    `2. **Trace an example:** Sketch a quick flow diagram on the **Whiteboard** tab together.`,
    `3. **Verify edge cases:** Test with a small snippet in the **Notes & Code** tab.`,
    '',
    `_Note: Running in Built-in Study Assistant mode. Set \`GEMINI_API_KEY\` in \`.env.local\` or Vercel for live Gemini AI answers._`,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as AiHelperRequestBody
    const { sessionId, prompt = '', topic = 'General Learning', mode = 'ask' } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Verify user is a participant of this accepted session
    const { data: session, error: sessionErr } = await supabase
      .from('session_requests')
      .select('id, from_id, to_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.from_id !== user.id && session.to_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.status !== 'accepted') {
      return NextResponse.json({ error: 'Session is not accepted' }, { status: 403 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      return NextResponse.json({
        reply: buildSmartStudyFallback(topic, prompt, mode),
        provider: 'fallback',
      })
    }

    const systemInstruction =
      mode === 'quiz'
        ? `Create 3 concise, practical practice questions with brief hints for a peer learning session on "${topic}".`
        : mode === 'summary'
        ? `Provide a clear, concise bulleted study plan and key takeaways for a 1-on-1 mentoring session on "${topic}".`
        : `You are a helpful 1-on-1 peer study assistant for a learning session on "${topic}". Answer clearly and concisely with practical examples.`

    const userPrompt = prompt.trim() || `Help us with our ${topic} session (${mode}).`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        geminiApiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nStudent Request: ${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 700,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      // Graceful fallback if key quota or network issue occurs
      return NextResponse.json({
        reply: buildSmartStudyFallback(topic, prompt, mode),
        provider: 'fallback',
      })
    }

    const data = await geminiRes.json()
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      buildSmartStudyFallback(topic, prompt, mode)

    return NextResponse.json({ reply, provider: 'gemini' })
  } catch (err) {
    console.error('AI helper error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
