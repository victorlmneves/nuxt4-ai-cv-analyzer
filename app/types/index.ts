// ── Provider ──────────────────────────────────────────────────────────────────
export type TProvider = 'anthropic' | 'openai' | 'gemini';
export type TIntegrationEase = 'easy' | 'moderate' | 'challenging';

// ── Input ─────────────────────────────────────────────────────────────────────
export interface IAnalysisInput {
    cvText: string;
    jobDescription: string;
    provider: TProvider;
}

// ── Skill ─────────────────────────────────────────────────────────────────────
export interface ISkill {
    name: string;
    yearsOfExperience: number | null;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    lastUsed: string | null;
}

export interface ITechStack {
    languages: ISkill[];
    frameworks: ISkill[];
    databases: ISkill[];
    tools: ISkill[];
    cloud: ISkill[];
    other: ISkill[];
}

// ── Red Flag ──────────────────────────────────────────────────────────────────
export type TRedFlagSeverity = 'low' | 'medium' | 'high';

export interface IRedFlag {
    title: string;
    description: string;
    severity: TRedFlagSeverity;
}

// ── Soft Skills ───────────────────────────────────────────────────────────────
export interface ISoftSkill {
    name: string;
    evidence: string;
    confidence: 'low' | 'medium' | 'high';
}

// ── Interview Questions ───────────────────────────────────────────────────────
export type TQuestionCategory = 'technical' | 'behavioural' | 'situational' | 'cultural';

export interface IInterviewQuestion {
    question: string;
    category: TQuestionCategory;
    rationale: string;
    targetSkill: string;
}

// ── Fit Score ─────────────────────────────────────────────────────────────────
export interface IFitScore {
    overall: number;
    technical: number;
    experience: number;
    softSkills: number;
    verdict: 'strong fit' | 'good fit' | 'partial fit' | 'weak fit';
    summary: string;
}

// ── Analysis Result ───────────────────────────────────────────────────────────
export interface ICandidateProfile {
    name: string | null;
    currentRole: string | null;
    totalExperience: string | null;
    location: string | null;
    education: string | null;
}

export interface IAnalysisResult {
    candidate: ICandidateProfile;
    fitScore: IFitScore;
    techStack: ITechStack;
    softSkills: ISoftSkill[];
    redFlags: IRedFlag[];
    interviewQuestions: IInterviewQuestion[];
    strengths: string[];
    gaps: string[];
    provider: TProvider;
    analysedAt: string;
    cvText?: string;
    jobDescription?: string;
}

// ── History Entry — scalar columns (no JSONB) ──────────────────────────────
// Matches GET /api/analyses list. Full result loaded via GET /api/analyses/:id.
export interface IHistoryEntry {
    id: string;
    candidateName: string;
    candidateRole: string | null;
    roleName: string;
    overallScore: number;
    technicalScore: number;
    experienceScore: number;
    softSkillsScore: number;
    verdict: IFitScore['verdict'];
    redFlagCount: number;
    provider: TProvider;
    createdAt: string;
}

// ── Comparison ────────────────────────────────────────────────────────────────
export interface IComparisonCandidate {
    analysisId: string;
    name: string;
    currentRole: string | null;
    overallScore: number;
    technicalScore: number;
    experienceScore: number;
    softSkillsScore: number;
    verdict: IFitScore['verdict'];
    redFlagCount: number;
    topStrengths: string[];
    topGaps: string[];
    techStackHighlights: string[];
    integrationEase: TIntegrationEase;
    integrationRationale: string;
}

export interface IComparisonResult {
    candidates: IComparisonCandidate[];
    roleName: string;
    winner: string;
    rankedOrder: string[];
    recommendation: string;
    provider: TProvider;
    comparedAt: string;
    jobDescription?: string;
}

export interface IComparisonHistoryEntry {
    id: string;
    roleName: string;
    candidateCount: number;
    provider: TProvider;
    createdAt: string;
}

// ── JD Generator ─────────────────────────────────────────────────────────────
export interface IJDSections {
    summary: string;
    responsibilities: string;
    requirements: string;
    niceToHave: string;
    offer: string;
}

export interface IGeneratedJD {
    title: string;
    fullText: string;
    sections: IJDSections;
}

// ── Admin stats ───────────────────────────────────────────────────────────────
export interface IAdminRecruiter {
    userId: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    analysisCount: number;
    avgScore: string | null;
    lastSeenAt: string;
}

export interface IAdminStats {
    totals: { totalAnalyses: number; avgScore: string | null };
    byVerdict: Array<{ verdict: string; count: number }>;
    byProvider: Array<{ provider: string; count: number }>;
    byRecruiter: IAdminRecruiter[];
    recent: Array<{
        id: string;
        candidateName: string;
        roleName: string;
        overallScore: number;
        verdict: string;
        provider: string;
        createdAt: string;
        recruiterName: string;
    }>;
    strongFitPlacement: {
        total: number;
        placed: number;
        rate: number | null;
        byProvider: Array<{
            provider: string;
            total: number;
            placed: number;
            rate: number | null;
        }>;
    };
}
