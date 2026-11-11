'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { X, CheckCircle2, ShieldCheck, AlertCircle, Award } from 'lucide-react'

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
}

const SKILL_QUIZZES: Record<string, QuizQuestion[]> = {
  java: [
    {
      question: 'Which keyword is used in Java to prevent a method from being overridden by subclasses?',
      options: ['static', 'final', 'private', 'abstract'],
      correctIndex: 1,
    },
    {
      question: 'Which collection class does NOT allow duplicate elements and stores them in sorted order?',
      options: ['ArrayList', 'HashMap', 'TreeSet', 'LinkedList'],
      correctIndex: 2,
    },
    {
      question: 'What is the parent class of all classes in Java?',
      options: ['java.lang.System', 'java.lang.Object', 'java.lang.Class', 'java.util.Base'],
      correctIndex: 1,
    },
  ],
  python: [
    {
      question: 'Which data structure in Python is immutable?',
      options: ['List', 'Dictionary', 'Set', 'Tuple'],
      correctIndex: 3,
    },
    {
      question: 'What does the `yield` keyword do inside a Python function?',
      options: [
        'Terminates the program',
        'Turns the function into a generator',
        'Raises an exception',
        'Imports a module lazily',
      ],
      correctIndex: 1,
    },
    {
      question: 'What is the time complexity of looking up a key in a Python dictionary on average?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctIndex: 0,
    },
  ],
  'c++': [
    {
      question: 'Which C++ feature enables runtime polymorphism?',
      options: ['Function overloading', 'Virtual functions', 'Templates', 'Inline functions'],
      correctIndex: 1,
    },
    {
      question: 'Which smart pointer enforces exclusive ownership of a dynamically allocated object?',
      options: ['std::shared_ptr', 'std::weak_ptr', 'std::unique_ptr', 'std::auto_ptr'],
      correctIndex: 2,
    },
    {
      question: 'What is the default access specifier for members of a C++ `class`?',
      options: ['public', 'protected', 'private', 'internal'],
      correctIndex: 2,
    },
  ],
  c: [
    {
      question: 'Which operator is used in C to get the memory address of a variable?',
      options: ['*', '&', '->', '%'],
      correctIndex: 1,
    },
    {
      question: 'Which standard library function allocates memory and initializes all bytes to zero?',
      options: ['malloc()', 'realloc()', 'calloc()', 'free()'],
      correctIndex: 2,
    },
    {
      question: 'What does `sizeof(char)` always evaluate to in standard C?',
      options: ['1 byte', '2 bytes', '4 bytes', 'Depends on OS'],
      correctIndex: 0,
    },
  ],
  communication: [
    {
      question: 'What is the most effective way to practice active listening during a 1-on-1 session?',
      options: [
        'Interrupt immediately with corrections',
        'Paraphrase key points back to confirm understanding',
        'Multitask while listening',
        'Avoid asking clarifying questions',
      ],
      correctIndex: 1,
    },
    {
      question: 'When explaining a complex technical topic to a beginner, what should you do first?',
      options: [
        'Start with low-level implementation edge cases',
        'Use a simple real-world analogy and core concept first',
        'Share raw API documentation without context',
        'Skip fundamentals to save time',
      ],
      correctIndex: 1,
    },
    {
      question: 'Which feedback style helps a peer improve without feeling discouraged?',
      options: [
        'Constructive, specific, and actionable feedback',
        'Vague criticism without examples',
        'Comparing them negatively to others',
        'Giving no feedback at all',
      ],
      correctIndex: 0,
    },
  ],
}

function getQuestionsForSkill(skillName: string): QuizQuestion[] {
  const normalized = skillName.trim().toLowerCase()
  if (SKILL_QUIZZES[normalized]) return SKILL_QUIZZES[normalized]
  if (normalized.includes('interview') || normalized.includes('speaking') || normalized.includes('english')) {
    return SKILL_QUIZZES.communication
  }
  // General problem-solving & mentorship quiz for custom skills
  return [
    {
      question: `When mentoring a peer in ${skillName}, what is the best way to structure a 30-minute session?`,
      options: [
        'Lecture non-stop without checking comprehension',
        'Set a clear goal, demonstrate an example, and let the learner practice',
        'Ask the learner to read docs silently',
        'Skip hands-on exercises',
      ],
      correctIndex: 1,
    },
    {
      question: 'If a learner gets stuck on a concept, what should a verified mentor do?',
      options: [
        'Give them the final answer without explaining why',
        'Break the problem into smaller steps and guide them with hints',
        'End the session early',
        'Tell them to search online',
      ],
      correctIndex: 1,
    },
    {
      question: `What ensures high quality when teaching ${skillName} on SkillSwap?`,
      options: [
        'Sharing accurate notes, practical examples, and verifying understanding',
        'Using overly complex jargon',
        'Ignoring the learner’s skill level',
        'Avoiding questions',
      ],
      correctIndex: 0,
    },
  ]
}

interface SkillQuizModalProps {
  isOpen: boolean
  onClose: () => void
  userSkillId: string
  skillName: string
  onVerified: (userSkillId: string) => void
}

export function SkillQuizModal({
  isOpen,
  onClose,
  userSkillId,
  skillName,
  onVerified,
}: SkillQuizModalProps) {
  const questions = getQuestionsForSkill(skillName)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { success, error: toastError } = useToast()

  if (!isOpen) return null

  const correctCount = questions.reduce(
    (acc, q, idx) => (answers[idx] === q.correctIndex ? acc + 1 : acc),
    0
  )
  const passed = correctCount >= 2

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all 3 questions before submitting.')
      return
    }
    setError(null)
    setSubmitted(true)

    if (passed) {
      setSaving(true)
      try {
        const supabase = createClient()
        const { error: updateErr } = await supabase
          .from('user_skills')
          .update({ is_verified: true })
          .eq('id', userSkillId)

        if (updateErr) throw updateErr

        success(`Congratulations! "${skillName}" is now Verified!`)
        onVerified(userSkillId)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not save verification status.'
        toastError(msg)
        setError(msg)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
          aria-label="Close quiz"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Verify Skill: {skillName}</h2>
            <p className="text-xs text-slate-500">
              Score at least 2/3 to earn a Verified Mentor badge
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                passed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {passed ? <Award className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {passed ? 'Skill Verified!' : 'Almost there!'}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                You scored <span className="font-bold">{correctCount} / {questions.length}</span>.
                {passed
                  ? ' Your profile now displays a Verified badge for this skill.'
                  : ' You need at least 2 correct answers to verify this skill.'}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              {!passed && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Try Again
                </Button>
              )}
              <Button size="sm" onClick={onClose} isLoading={saving}>
                {passed ? 'Done' : 'Close'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="space-y-2 border-b border-slate-100 pb-4 last:border-0">
                <p className="text-sm font-semibold text-slate-800">
                  {qIdx + 1}. {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, optIdx) => {
                    const selected = answers[qIdx] === optIdx
                    return (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                          selected
                            ? 'border-blue-500 bg-blue-50/50 text-slate-900 font-medium'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qIdx}`}
                          checked={selected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit Quiz
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
