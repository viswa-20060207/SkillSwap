'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { SkillLevel, SkillRole } from '@/lib/database.types'
import {
  Camera,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Sparkles,
  BookOpen,
  ArrowRight,
} from 'lucide-react'

interface UserSkillItem {
  id: string
  skill_id: string
  name: string
  role: SkillRole
  level: SkillLevel
}

interface AvailableSkill {
  id: string
  name: string
  category: 'technical' | 'soft_skill'
}

export default function ProfileEditPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFirstTime = searchParams.get('first_time') === 'true'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Profile fields
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [college, setCollege] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Skills state
  const [userSkills, setUserSkills] = useState<UserSkillItem[]>([])
  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([])

  // New skill addition states
  const [teachSkillName, setTeachSkillName] = useState('')
  const [teachLevel, setTeachLevel] = useState<SkillLevel>('intermediate')
  const [learnSkillName, setLearnSkillName] = useState('')
  const [learnLevel, setLearnLevel] = useState<SkillLevel>('beginner')

  // Feedback messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadProfileAndSkills() {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setName(profile.name || '')
        setBio(profile.bio || '')
        setCollege(profile.college || '')
        setAvatarUrl(profile.avatar_url || '')
      }

      // Fetch all available skills catalog
      const { data: skillsData } = await supabase
        .from('skills')
        .select('*')
        .order('name')

      if (skillsData) {
        setAvailableSkills(skillsData)
      }

      // Fetch user's existing skills
      const { data: userSkillsData } = await supabase
        .from('user_skills')
        .select('id, skill_id, role, level, skills(id, name)')
        .eq('user_id', user.id)

      interface UserSkillQueryItem {
        id: string
        skill_id: string
        role: SkillRole
        level: SkillLevel
        skills: { id: string; name: string } | null
      }

      if (userSkillsData) {
        const rows = userSkillsData as unknown as UserSkillQueryItem[]
        const formatted: UserSkillItem[] = rows.map((item) => ({
          id: item.id,
          skill_id: item.skill_id,
          name: item.skills?.name || 'Unknown',
          role: item.role,
          level: item.level,
        }))
        setUserSkills(formatted)
      }

      setLoading(false)
    }

    loadProfileAndSkills()
  }, [router])

  // Avatar upload to Supabase Storage 'avatars' bucket
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploadingAvatar(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const filePath = `${userId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl

      setAvatarUrl(publicUrl)

      // Automatically update profile row
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId)

      setMessage({ type: 'success', text: 'Avatar uploaded successfully!' })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload avatar.'
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Save profile information
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          bio: bio.trim(),
          college: college.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      setMessage({ type: 'success', text: 'Profile details saved successfully!' })
      router.refresh()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save profile.'
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setSaving(false)
    }
  }

  // Add a skill (teach or learn)
  const handleAddSkill = async (role: SkillRole) => {
    if (!userId) return
    const rawSkillName = role === 'teach' ? teachSkillName.trim() : learnSkillName.trim()
    const level = role === 'teach' ? teachLevel : learnLevel

    if (!rawSkillName) return

    setMessage(null)

    try {
      const supabase = createClient()

      // Find or create skill in skills table
      let skillId = ''
      const existing = availableSkills.find(
        (s) => s.name.toLowerCase() === rawSkillName.toLowerCase()
      )

      if (existing) {
        skillId = existing.id
      } else {
        // Insert new skill
        const category = ['communication', 'interview skills', 'english speaking', 'public speaking'].some(
          (s) => rawSkillName.toLowerCase().includes(s)
        )
          ? 'soft_skill'
          : 'technical'

        const { data: newSkill, error: skillInsertError } = await supabase
          .from('skills')
          .insert({ name: rawSkillName, category })
          .select()
          .single()

        if (skillInsertError) throw skillInsertError
        skillId = newSkill.id
        setAvailableSkills((prev) => [...prev, newSkill])
      }

      // Check if already in userSkills
      if (userSkills.some((us) => us.skill_id === skillId && us.role === role)) {
        setMessage({ type: 'error', text: `You already added "${rawSkillName}" under this section.` })
        return
      }

      // Insert into user_skills
      const { data: newUserSkill, error: userSkillError } = await supabase
        .from('user_skills')
        .insert({
          user_id: userId,
          skill_id: skillId,
          role,
          level,
        })
        .select()
        .single()

      if (userSkillError) throw userSkillError

      setUserSkills((prev) => [
        ...prev,
        {
          id: newUserSkill.id,
          skill_id: skillId,
          name: rawSkillName,
          role,
          level,
        },
      ])

      // Clear input
      if (role === 'teach') setTeachSkillName('')
      else setLearnSkillName('')

      setMessage({ type: 'success', text: `Added "${rawSkillName}" to your skills!` })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add skill.'
      setMessage({ type: 'error', text: errorMsg })
    }
  }

  // Remove a skill
  const handleRemoveSkill = async (userSkillId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('user_skills').delete().eq('id', userSkillId)
      if (error) throw error

      setUserSkills((prev) => prev.filter((item) => item.id !== userSkillId))
      setMessage({ type: 'success', text: 'Skill removed.' })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove skill.'
      setMessage({ type: 'error', text: errorMsg })
    }
  }

  const teachSkills = userSkills.filter((s) => s.role === 'teach')
  const learnSkills = userSkills.filter((s) => s.role === 'learn')

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <Skeleton className="h-6 w-1/4" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Welcome Banner for first-time onboarding */}
      {isFirstTime && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Welcome to SkillSwap!
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Complete your profile and add skills you can teach and skills you want to learn.
            </p>
          </div>
          {userId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/profile/${userId}`)}
              className="bg-white text-blue-600 hover:bg-blue-50 border-white shrink-0 hidden sm:inline-flex"
            >
              Skip to Profile <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* SECTION 1: Personal Details */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
            <p className="text-xs text-slate-500">Update your public profile details</p>
          </div>
          {userId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/profile/${userId}`)}
            >
              View Public Profile
            </Button>
          )}
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
          <div className="relative group">
            <Avatar src={avatarUrl} name={name || 'User'} size="xl" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform hover:scale-105 focus:outline-none"
              title="Upload new avatar"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-slate-800">Profile Photo</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              JPG, PNG or GIF. Uploaded directly to your secure avatars bucket.
            </p>
            {uploadingAvatar && (
              <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></span> Uploading...
              </p>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="name"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              required
            />
            <Input
              id="college"
              label="College / Organization"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g. MIT, Berkeley, Tech Enthusiast"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
              About / Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a brief intro about what you're passionate about..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={saving}>
              Save Profile Info
            </Button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Skills I Can Teach */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Skills I Can Teach</h2>
            <p className="text-xs text-slate-500">Others can find and request 1-on-1 sessions for these skills</p>
          </div>
        </div>

        {/* Existing teaching skills */}
        <div className="flex flex-wrap gap-2.5 min-h-[40px] items-center">
          {teachSkills.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No teaching skills added yet. Add your first skill below!</p>
          ) : (
            teachSkills.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 border border-blue-200 rounded-lg text-sm text-blue-900 font-medium"
              >
                <span>{item.name}</span>
                <Badge variant="blue" size="sm">
                  {item.level}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(item.id)}
                  className="text-blue-400 hover:text-red-600 transition-colors ml-0.5"
                  title="Remove skill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Add teaching skill input */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1">
            <input
              type="text"
              list="teach-skills-list"
              value={teachSkillName}
              onChange={(e) => setTeachSkillName(e.target.value)}
              placeholder="e.g. Python, Java, Communication..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="teach-skills-list">
              {availableSkills.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <select
            value={teachLevel}
            onChange={(e) => setTeachLevel(e.target.value as SkillLevel)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAddSkill('teach')}
            disabled={!teachSkillName.trim()}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Teaching Skill
          </Button>
        </div>
      </div>

      {/* SECTION 3: Skills I Want to Learn */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Skills I Want to Learn</h2>
            <p className="text-xs text-slate-500">Share what topics or technologies you are aiming to learn</p>
          </div>
        </div>

        {/* Existing learning skills */}
        <div className="flex flex-wrap gap-2.5 min-h-[40px] items-center">
          {learnSkills.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No learning skills added yet. Add what you want to master!</p>
          ) : (
            learnSkills.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50/80 border border-purple-200 rounded-lg text-sm text-purple-900 font-medium"
              >
                <span>{item.name}</span>
                <Badge variant="purple" size="sm">
                  {item.level}
                </Badge>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(item.id)}
                  className="text-purple-400 hover:text-red-600 transition-colors ml-0.5"
                  title="Remove skill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Add learning skill input */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1">
            <input
              type="text"
              list="learn-skills-list"
              value={learnSkillName}
              onChange={(e) => setLearnSkillName(e.target.value)}
              placeholder="e.g. C++, Interview Skills, English Speaking..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <datalist id="learn-skills-list">
              {availableSkills.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <select
            value={learnLevel}
            onChange={(e) => setLearnLevel(e.target.value as SkillLevel)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddSkill('learn')}
            disabled={!learnSkillName.trim()}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Learning Skill
          </Button>
        </div>
      </div>
    </div>
  )
}
