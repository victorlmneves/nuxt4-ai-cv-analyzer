import { pgTable, text, integer, jsonb, timestamp, boolean, pgEnum, uuid } from 'drizzle-orm/pg-core';

// ── Enums ─────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum('role', ['admin', 'recruiter']);
export const providerEnum = pgEnum('provider', ['anthropic', 'openai', 'gemini']);
export const verdictEnum = pgEnum('verdict', ['strong fit', 'good fit', 'partial fit', 'weak fit']);

// ── Users ─────────────────────────────────────────────────────────────────────
// Managed by nuxt-auth-utils + OAuth (Google / GitHub).
// The email is the stable identity; name and avatar come from the OAuth provider.
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    role: roleEnum('role').notNull().default('recruiter'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Analyses ──────────────────────────────────────────────────────────────────
// Each row is one CV analysis. The full AI result is stored as JSONB so we
// keep full flexibility without dozens of columns — we query by the top-level
// scalar fields (score, verdict, candidate name) and load the JSONB on demand.
export const analyses = pgTable('analyses', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    // Extracted from the AI result for fast querying without parsing JSONB
    candidateName: text('candidate_name').notNull(),
    candidateRole: text('candidate_role'),
    roleName: text('role_name').notNull(),
    overallScore: integer('overall_score').notNull(),
    technicalScore: integer('technical_score').notNull(),
    experienceScore: integer('experience_score').notNull(),
    softSkillsScore: integer('soft_skills_score').notNull(),
    verdict: verdictEnum('verdict').notNull(),
    redFlagCount: integer('red_flag_count').notNull().default(0),
    provider: providerEnum('provider').notNull(),

    // Full AI result — parsed when viewing a single analysis
    result: jsonb('result').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    isArchived: boolean('is_archived').notNull().default(false),
});

// ── Comparisons ───────────────────────────────────────────────────────────────
// Each row is one multi-CV comparison session.
// Scalar columns allow fast list queries; full IComparisonResult stored as JSONB.
export const comparisons = pgTable('comparisons', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),

    roleName: text('role_name').notNull(),
    candidateCount: integer('candidate_count').notNull(),
    provider: providerEnum('provider').notNull(),

    result: jsonb('result').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    isArchived: boolean('is_archived').notNull().default(false),
});
