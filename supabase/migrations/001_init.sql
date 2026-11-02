-- ==============================================================================
-- SkillSwap Initial Database Schema & Security Migration
-- Migration: 001_init.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABLES
-- ==============================================================================

-- 1.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    college TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.2 SKILLS TABLE
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('technical', 'soft_skill')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.3 USER_SKILLS TABLE
CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('teach', 'learn')),
    level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_skill_role UNIQUE (user_id, skill_id, role)
);

-- 1.4 FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

-- 1.5 SESSION_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.session_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
    message TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_no_self_session CHECK (from_id <> to_id)
);

-- 1.6 MESSAGES TABLE (Realtime Chat for Accepted Sessions)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.session_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.7 NOTES TABLE (Files and Code Snippets for Accepted Sessions)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.session_requests(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('file', 'snippet')),
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    file_path TEXT DEFAULT '',
    language TEXT DEFAULT 'plaintext',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.8 REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_no_self_report CHECK (reporter_id <> target_id)
);

-- 1.9 BLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id)
);

-- ==============================================================================
-- 2. INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills(name);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_role ON public.user_skills(skill_id, role);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_participants ON public.session_requests(from_id, to_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notes_session_id ON public.notes(session_id, created_at);

-- ==============================================================================
-- 3. AUTOMATIC PROFILE CREATION TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, avatar_url, bio, college)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1),
            'SkillSwap Member'
        ),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        '',
        ''
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop trigger if existing and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. SEED SKILLS
-- ==============================================================================

INSERT INTO public.skills (name, category) VALUES
    ('C', 'technical'),
    ('C++', 'technical'),
    ('Python', 'technical'),
    ('Java', 'technical'),
    ('Communication', 'soft_skill'),
    ('Interview Skills', 'soft_skill'),
    ('English Speaking', 'soft_skill'),
    ('Public Speaking', 'soft_skill')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;

-- ==============================================================================
-- 5. STORAGE BUCKETS CONFIGURATION
-- ==============================================================================

-- Create 'avatars' public bucket if not present
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create 'notes' private bucket if not present
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6.1 PROFILES POLICIES
-- Readable by any signed-in user, writable only by the owner
-- ------------------------------------------------------------------------------
CREATE POLICY "Profiles readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 6.2 SKILLS POLICIES
-- Readable by all authenticated users
-- ------------------------------------------------------------------------------
CREATE POLICY "Skills readable by authenticated users"
    ON public.skills FOR SELECT
    TO authenticated
    USING (true);

-- ------------------------------------------------------------------------------
-- 6.3 USER_SKILLS POLICIES
-- Readable by any signed-in user, writable only by owner
-- ------------------------------------------------------------------------------
CREATE POLICY "User skills readable by authenticated users"
    ON public.user_skills FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can manage their own skills (insert)"
    ON public.user_skills FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skills (update)"
    ON public.user_skills FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skills (delete)"
    ON public.user_skills FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6.4 FOLLOWS POLICIES
-- Users manage their own follow rows; readable by authenticated users
-- ------------------------------------------------------------------------------
CREATE POLICY "Follows readable by authenticated users"
    ON public.follows FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.follows FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    TO authenticated
    USING (auth.uid() = follower_id);

-- ------------------------------------------------------------------------------
-- 6.5 SESSION_REQUESTS POLICIES
-- Visible and editable only by the two participants (from_id or to_id)
-- ------------------------------------------------------------------------------
CREATE POLICY "Session requests visible only to participants"
    ON public.session_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = from_id OR auth.uid() = to_id);

CREATE POLICY "Users can create session requests"
    ON public.session_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = from_id);

CREATE POLICY "Participants can update session request status"
    ON public.session_requests FOR UPDATE
    TO authenticated
    USING (auth.uid() = from_id OR auth.uid() = to_id)
    WITH CHECK (auth.uid() = from_id OR auth.uid() = to_id);

-- ------------------------------------------------------------------------------
-- 6.6 MESSAGES POLICIES
-- Only participants of an accepted session can read or insert
-- ------------------------------------------------------------------------------
CREATE POLICY "Messages readable only by participants of accepted session"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id = messages.session_id
              AND sr.status = 'accepted'
              AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
        )
    );

CREATE POLICY "Messages insertable only by participants of accepted session"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id = messages.session_id
              AND sr.status = 'accepted'
              AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
        )
    );

-- ------------------------------------------------------------------------------
-- 6.7 NOTES POLICIES
-- Only participants of an accepted session can read or insert notes/snippets
-- ------------------------------------------------------------------------------
CREATE POLICY "Notes readable only by participants of accepted session"
    ON public.notes FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id = notes.session_id
              AND sr.status = 'accepted'
              AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
        )
    );

CREATE POLICY "Notes insertable only by participants of accepted session"
    ON public.notes FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = uploader_id
        AND EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id = notes.session_id
              AND sr.status = 'accepted'
              AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
        )
    );

CREATE POLICY "Notes updatable by author in accepted session"
    ON public.notes FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = uploader_id
        AND EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id = notes.session_id
              AND sr.status = 'accepted'
              AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
        )
    )
    WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Notes deletable by author in accepted session"
    ON public.notes FOR DELETE
    TO authenticated
    USING (
        auth.uid() = uploader_id
        AND EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id = notes.session_id
              AND sr.status = 'accepted'
              AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
        )
    );

-- ------------------------------------------------------------------------------
-- 6.8 REPORTS POLICIES
-- Insert only by authenticated users (reporter_id = auth.uid())
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- ------------------------------------------------------------------------------
-- 6.9 BLOCKS POLICIES
-- Users manage their own blocks
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own blocks"
    ON public.blocks FOR SELECT
    TO authenticated
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
    ON public.blocks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove blocks"
    ON public.blocks FOR DELETE
    TO authenticated
    USING (auth.uid() = blocker_id);

-- ==============================================================================
-- 7. STORAGE RLS POLICIES
-- ==============================================================================

-- Avatars: Public read, owner upload/update/delete
CREATE POLICY "Avatars are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Notes: Private session participants only
CREATE POLICY "Participants can view session note files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'notes'
        AND EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id::text = (storage.foldername(name))[1]
              AND sr.status = 'accepted'
              AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
        )
    );

CREATE POLICY "Participants can upload session note files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'notes'
        AND EXISTS (
            SELECT 1 FROM public.session_requests sr
            WHERE sr.id::text = (storage.foldername(name))[1]
              AND sr.status = 'accepted'
              AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
        )
    );
