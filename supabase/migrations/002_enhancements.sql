-- ==============================================================================
-- SkillSwap Enhancements Migration
-- Migration: 002_enhancements.sql
-- Adds: Skill Verification (Quiz), Session Completion & Star Ratings/Reviews
-- ==============================================================================

-- 1. Add is_verified column to user_skills
ALTER TABLE public.user_skills
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- 2. Add completed_at column to session_requests
ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Create session_reviews table
CREATE TABLE IF NOT EXISTS public.session_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.session_requests(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_no_self_review CHECK (reviewer_id <> reviewee_id),
    CONSTRAINT uq_session_reviewer UNIQUE (session_id, reviewer_id)
);

-- Indexes for reviews lookup
CREATE INDEX IF NOT EXISTS idx_session_reviews_reviewee ON public.session_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_session_reviews_session ON public.session_reviews(session_id);

-- 4. Enable RLS on session_reviews
ALTER TABLE public.session_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for session_reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'session_reviews' AND policyname = 'Reviews are viewable by authenticated users'
    ) THEN
        CREATE POLICY "Reviews are viewable by authenticated users"
            ON public.session_reviews FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'session_reviews' AND policyname = 'Session participants can create reviews'
    ) THEN
        CREATE POLICY "Session participants can create reviews"
            ON public.session_reviews FOR INSERT
            TO authenticated
            WITH CHECK (
                auth.uid() = reviewer_id
                AND EXISTS (
                    SELECT 1 FROM public.session_requests sr
                    WHERE sr.id = session_reviews.session_id
                      AND sr.status = 'accepted'
                      AND (sr.from_id = auth.uid() OR sr.to_id = auth.uid())
                )
            );
    END IF;
END $$;
