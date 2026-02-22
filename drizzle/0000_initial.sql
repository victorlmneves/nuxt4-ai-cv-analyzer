-- ── CV Analyst — initial schema migration ────────────────────────────────────
-- Run via: npm run db:migrate
-- Or apply directly in Supabase Dashboard → SQL Editor

-- Enums
CREATE TYPE "role" AS ENUM ('admin', 'recruiter');
CREATE TYPE "provider" AS ENUM ('anthropic', 'openai', 'gemini');
CREATE TYPE "verdict" AS ENUM ('strong fit', 'good fit', 'partial fit', 'weak fit');

-- Users
CREATE TABLE IF NOT EXISTS "users" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email"        TEXT NOT NULL UNIQUE,
    "name"         TEXT NOT NULL,
    "avatar_url"   TEXT,
    "role"         "role" NOT NULL DEFAULT 'recruiter',
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analyses
CREATE TABLE IF NOT EXISTS "analyses" (
    "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"          UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "candidate_name"   TEXT NOT NULL,
    "candidate_role"   TEXT,
    "role_name"        TEXT NOT NULL,
    "overall_score"    INTEGER NOT NULL,
    "technical_score"  INTEGER NOT NULL,
    "experience_score" INTEGER NOT NULL,
    "soft_skills_score" INTEGER NOT NULL,
    "verdict"          "verdict" NOT NULL,
    "red_flag_count"   INTEGER NOT NULL DEFAULT 0,
    "provider"         "provider" NOT NULL,
    "result"           JSONB NOT NULL,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "is_archived"      BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "analyses_user_id_idx" ON "analyses"("user_id");
CREATE INDEX IF NOT EXISTS "analyses_created_at_idx" ON "analyses"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "analyses_verdict_idx" ON "analyses"("verdict");

-- ── Make first user an admin ───────────────────────────────────────────────────
-- Run this after your first login to grant yourself admin access:
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
