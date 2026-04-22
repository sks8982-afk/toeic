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

    const prompt = `Generate ${count} HIGH-LEVEL TOEIC vocabulary for Korean learners aiming at 800~900 score.

Category: ${catLabel}
${excludeList ? `EXCLUDE these words (already learned): ${excludeList}` : ''}

Return ONLY a valid JSON array (no markdown):
[
  {
    "word": "adhere to",
    "meaning": "(규칙을) 고수하다, 준수하다",
    "pronunciation": "/ədˈhɪər tə/",
    "partOfSpeech": "phrasal_verb",
    "exampleSentence": "All employees must adhere to the company's confidentiality policy.",
    "category": "business",
    "difficulty": "advanced",
    "targetScore": 850,
    "isIdiom": true
  }
]

CRITICAL RULES:
- Target level: TOEIC 800~900 (NOT basic). Words must genuinely appear in real TOEIC tests.
- Include a HEALTHY MIX of:
  * Single advanced words (e.g. expedite, scrutinize, reconcile, mitigate)
  * Phrasal verbs (e.g. phase out, come up with, look into)
  * Idioms / set phrases (e.g. "in lieu of", "on behalf of", "take into account")
- At LEAST 30% of items must be idioms or phrasal verbs (set isIdiom: true)
- partOfSpeech: use one of [noun, verb, adjective, adverb, phrasal_verb, idiom]
- difficulty: MUST be "advanced" or "intermediate" (NO "basic")
- targetScore: 750~950 (most around 800-900)
- exampleSentence: realistic TOEIC Part 5~7 business context
- meaning: concise Korean (1~4 words)
- Do NOT repeat any word from the exclude list
- Do NOT include obvious/basic words like meeting, office, report, email`;

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

    interface GeneratedWord {
      readonly id: string;
      readonly word: string;
      readonly meaning: string;
      readonly pronunciation?: string;
      readonly partOfSpeech?: string;
      readonly exampleSentence: string;
      readonly category?: string;
      readonly difficulty?: string;
      readonly targetScore: number;
      readonly isIdiom: boolean;
    }

    const words: GeneratedWord[] = uniqueWords.map((w): GeneratedWord => ({
      id: wordId(w.word, w.meaning),
      word: w.word,
      meaning: w.meaning,
      pronunciation: w.pronunciation,
      partOfSpeech: w.partOfSpeech,
      exampleSentence: w.exampleSentence,
      category: w.category,
      difficulty: w.difficulty,
      targetScore: Number(w.targetScore) || 800,
      isIdiom:
        String(w.isIdiom) === 'true' ||
        ['idiom', 'phrasal_verb'].includes((w.partOfSpeech ?? '').toLowerCase()),
    }));

    // v4 단어 마스터 테이블에도 누적 (추천 API가 이걸 사용)
    if (words.length > 0) {
      await supabaseAdmin
        .from('toeic_vocabulary')
        .upsert(
          words.map(w => ({
            id: w.id,
            word: w.word,
            meaning: w.meaning,
            pronunciation: w.pronunciation ?? null,
            part_of_speech: w.partOfSpeech ?? 'noun',
            example_sentence: w.exampleSentence,
            category: w.category || 'general',
            difficulty: w.difficulty || 'advanced',
            target_score: w.targetScore,
            is_idiom: w.isIdiom,
            source: 'ai',
          })),
          { onConflict: 'id', ignoreDuplicates: true },
        );
    }

    return NextResponse.json({ words });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
