'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserPlus, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [college, setCollege] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            college: college.trim(),
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }

      // Check if session was immediately established (auto-confirm enabled or session active)
      if (data.session) {
        // Redirect to profile/edit to fill name, bio, college per requirement
        router.push('/profile/edit?first_time=true')
        router.refresh()
        return
      }

      // If email confirmation is required, notify user or sign in if confirmed
      // Attempt login to verify session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!signInError && signInData.session) {
        router.push('/profile/edit?first_time=true')
        router.refresh()
        return
      }

      // If email confirmation is required by Supabase settings:
      setError('Account created! Please check your email inbox to confirm your account, then sign in.')
      setIsLoading(false)
    } catch {
      setError('An unexpected error occurred during sign up. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Join the SkillSwap peer learning network</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            id="name"
            name="name"
            type="text"
            label="Full Name"
            placeholder="Alex Johnson"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />

          <Input
            id="college"
            name="college"
            type="text"
            label="College / University"
            placeholder="e.g. Stanford University"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            autoComplete="organization"
          />

          <Input
            id="email"
            name="email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            helperText="At least 6 characters"
          />

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isLoading}
          >
            Create Account & Setup Profile
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
