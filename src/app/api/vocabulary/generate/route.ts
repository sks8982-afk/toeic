// AI 단어 생성 API — 기존 단어를 다 학습하면 새 단어 생성
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';

const requestSchema = z.object({
  count: z.number().int().min(5).max(30).default(10),
  category: z.enum(['business', 'finance', 'hr', 'marketing', 'daily', 'travel']).optional(),
  excludeWords: z.array(z.string()).optional().default([]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { count, category, excludeWords } = parsed.data;
    const catLabel = category ?? 'mixed (business, daily, travel)';
    const excludeList = excludeWords.slice(0, 50).join(', ');

    const prompt = `Generate ${count} TOEIC vocabulary words for Korean learners.

Category: ${catLabel}
${excludeList ? `EXCLUDE these words (already learned): ${excludeList}` : ''}

Return ONLY a valid JSON array (no markdown):
[
  {
    "word": "negotiate",
    "meaning": "협상하다",
    "pronunciation": "/nɪˈɡoʊʃieɪt/",
    "partOfSpeech": "verb",
    "exampleSentence": "We need to negotiate the terms of the contract.",
    "category": "business",
    "difficulty": "intermediate"
  }
]

Rules:
- Each word must have: word, meaning (Korean, 1-3 words), pronunciation (IPA), partOfSpeech, exampleSentence (TOEIC-style), category, difficulty
- partOfSpeech: if multiple (e.g. noun AND verb), use "noun, verb"
- difficulty: basic (common), intermediate (frequent TOEIC), advanced (harder)
- Mix difficulties: ~50% basic, ~35% intermediate, ~15% advanced
- exampleSentence must be realistic business/workplace context
- Do NOT repeat any word from the exclude list`;

    const rawResponse = await generateContent(prompt);
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate words' }, { status: 500 });
    }

    const words = JSON.parse(jsonMatch[0]).map((w: Record<string, string>, i: number) => ({
      ...w,
      id: `ai-vocab-${Date.now()}-${i}`,
    }));

    return NextResponse.json({ words });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
