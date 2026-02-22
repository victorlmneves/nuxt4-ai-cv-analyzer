// ── Provider ──────────────────────────────────────────────────────────────────
export type TProvider = 'anthropic' | 'openai' | 'gemini';

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
}

// ── History Entry ─────────────────────────────────────────────────────────────
export interface IHistoryEntry {
    id: string;
    result: IAnalysisResult;
    candidateName: string;
    roleName: string;
    createdAt: string;
}
