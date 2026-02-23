-- Migration: Add status, notes, companyCulture to analyses
ALTER TABLE analyses ADD COLUMN status TEXT NOT NULL DEFAULT 'in_process';
ALTER TABLE analyses ADD COLUMN notes JSONB NOT NULL DEFAULT '[]';
ALTER TABLE analyses ADD COLUMN company_culture TEXT;
