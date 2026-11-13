-- ==============================================================================
-- SkillSwap Real-World Production Migration
-- Migration: 003_realworld.sql
-- Adds: Scheduling (scheduled_at, duration_mins) to session_requests
-- ==============================================================================

ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.session_requests
ADD COLUMN IF NOT EXISTS duration_mins INTEGER DEFAULT 45;
