// Design Ref: §4.1 — POST /api/toeic/generate
// Plan SC: SC-01 — TOEIC 문제 생성 정상 동작
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';
import { buildGeneratePrompt } from '@/features/toeic/lib/generate-prompt';
import type { ToeicQuestion, GrammarType } from '@/types';

/**
 * 문장 내용 기반의 안정적인 ID 생성.
 * Date.now() 기반 ID는 같은 문장도 매번 다른 ID가 되어
 * 중복 출제/중복 오답등록 버그를 유발함 → 콘텐츠 해시로 고정.
 */
function contentId(prefix: string, ...parts: readonly string[]): string {
  const hash = createHash('sha256')
    .update(parts.map(p => p.trim()).join('|'))
    .digest('hex')
    .slice(0, 12);
  return `${prefix}-${hash}`;
}

const requestSchema = z.object({
  type: z.enum(['pos', 'tense', 'agreement', 'relative', 'preposition', 'conjunction', 'vocabulary']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  count: z.number().int().min(1).max(5).optional().default(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { type, difficulty, count } = parsed.data;
    const prompt = buildGeneratePrompt(type, difficulty, count);
    const text = await generateContent(prompt);

    // JSON 파싱 (Gemini 응답에서 JSON 추출)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 },
      );
    }

    const rawQuestions = JSON.parse(jsonMatch[0]) as Array<{
      sentence: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      grammarPoint: string;
    }>;

    const questions: ToeicQuestion[] = rawQuestions.map((q) => ({
      id: contentId(`ai-${type}`, q.sentence, q.options.join('||'), String(q.correctIndex)),
      type: type as GrammarType,
      difficulty,
      sentence: q.sentence,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      grammarPoint: q.grammarPoint,
    }));

    return NextResponse.json({ questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
