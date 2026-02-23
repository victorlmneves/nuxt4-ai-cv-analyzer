import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '#server/utils/auth';
import { extractJson } from '#server/utils/ai';
import type { TProvider, IGeneratedJD } from '~/types';

interface IJDInput {
    notes: string;
    provider: TProvider;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const JD_SYSTEM_PROMPT = `You are an expert technical recruiter and copywriter specialising in writing compelling, inclusive job descriptions.

Given informal recruiter notes describing a position, generate a complete, professional job description that is:
- Engaging and employer-brand positive
- Free from discriminatory language (no age, gender, nationality, or appearance references)
- Structured clearly for candidates to quickly understand the opportunity
- Honest about requirements vs nice-to-haves

Return ONLY valid JSON — no markdown, no backticks, no preamble — matching this schema exactly:
{
  "title": string (the job title),
  "fullText": string (the complete JD as plain text, ready to copy-paste),
  "sections": {
    "summary": string (2-3 sentence company/role intro),
    "responsibilities": string (bulleted list as newline-separated items starting with "- "),
    "requirements": string (must-have skills/experience as newline-separated "- " items),
    "niceToHave": string (optional extras as newline-separated "- " items),
    "offer": string (what the company offers: salary range placeholder, benefits, culture)
  }
}`;

function buildJDUserPrompt(notes: string): string {
    return `Convert these recruiter notes into a complete job description:

## Notes
${notes}

Return the JSON object exactly. No other text.`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
    await requireAuth(event);
    const body = await readBody<IJDInput>(event);

    if (!body.notes?.trim()) {
        throw createError({ statusCode: 400, statusMessage: 'Notes are required.' });
    }

    const config = useRuntimeConfig();
    let raw: string;

    switch (body.provider) {
        case 'anthropic': {
            if (!config.anthropicApiKey) {
                throw createError({ statusCode: 400, statusMessage: 'Anthropic API key not configured.' });
            }

            const client = new Anthropic({ apiKey: config.anthropicApiKey as string });
            const msg = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 2048,
                system: JD_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: buildJDUserPrompt(body.notes) }],
            });

            raw = msg.content
                .filter((b) => b.type === 'text')
                .map((b) => (b as { type: 'text'; text: string }).text)
                .join('');
            break;
        }

        case 'openai': {
            if (!config.openaiApiKey) {
                throw createError({ statusCode: 400, statusMessage: 'OpenAI API key not configured.' });
            }

            const client = new OpenAI({ apiKey: config.openaiApiKey as string });
            const res = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                max_tokens: 2048,
                messages: [
                    { role: 'system', content: JD_SYSTEM_PROMPT },
                    { role: 'user', content: buildJDUserPrompt(body.notes) },
                ],
                response_format: { type: 'json_object' },
            });

            raw = res.choices[0]?.message.content ?? '{}';
            break;
        }

        case 'gemini': {
            if (!config.geminiApiKey) {
                throw createError({ statusCode: 400, statusMessage: 'Gemini API key not configured.' });
            }

            const genAI = new GoogleGenerativeAI(config.geminiApiKey as string);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: JD_SYSTEM_PROMPT });
            const res = await model.generateContent(buildJDUserPrompt(body.notes));

            raw = res.response.text();
            break;
        }

        default:
            throw createError({ statusCode: 400, statusMessage: 'Invalid provider specified.' });
    }

    const result = extractJson<IGeneratedJD>(raw);

    return result;
});
