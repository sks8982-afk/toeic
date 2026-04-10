// AI 단어 생성 API — 기존 단어를 다 학습하면 새 단어 생성
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';
import { createClient } from '@supabase/supabase-js';

/** 단어 내용 기반의 안정 ID (같은 단어=같은 ID) */
function wordId(word: string, meaning: string): string {
  const hash = createHash('sha256')
    .update(`${word.trim().toLowerCase()}|${meaning.trim()}`)
    .digest('hex')
    .slice(0, 12);
  return `ai-vocab-${hash}`;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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

    // DB에서 이미 존재하는 단어 목록 가져와서 exclude에 추가
    const { data: existingWords } = await supabaseAdmin
      .from('vocabulary_words')
      .select('word');
    const dbWords = (existingWords ?? []).map((r: { word: string }) => r.word.toLowerCase());
    const allExclude = [...new Set([...excludeWords, ...dbWords])].slice(0, 300);

    const promptWithExclude = prompt.replace(
      excludeList ? `EXCLUDE these words (already learned): ${excludeList}` : '',
      `EXCLUDE these words (already in DB): ${allExclude.join(', ')}`,
    );

    const rawResponse = await generateContent(promptWithExclude);
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate words' }, { status: 500 });
    }

    const generatedWords = JSON.parse(jsonMatch[0]) as Record<string, string>[];

    // DB 기준 중복 제거
    const dbWordSet = new Set(dbWords);
    const uniqueWords = generatedWords.filter(w => !dbWordSet.has(w.word.toLowerCase()));

    // 새 단어를 DB에 저장 (다른 계정에서도 사용 가능)
    if (uniqueWords.length > 0) {
      await supabaseAdmin.from('vocabulary_words').insert(
        uniqueWords.map(w => ({
          word: w.word,
          meaning: w.meaning,
          pronunciation: w.pronunciation,
          part_of_speech: w.partOfSpeech,
          example_sentence: w.exampleSentence,
          category: w.category || 'daily',
          difficulty: w.difficulty || 'intermediate',
        })),
      );
    }

    const words = uniqueWords.map((w) => ({
      ...w,
      id: wordId(w.word, w.meaning),
    }));

    return NextResponse.json({ words });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
