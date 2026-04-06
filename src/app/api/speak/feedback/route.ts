// Design Ref: §4.4 — POST /api/speak/feedback (발음/문법 피드백)
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';
import { calculatePronunciationScore } from '@/features/speak/lib/pronunciation';

const requestSchema = z.object({
  expected: z.string(),
  userSaid: z.string(),
  level: z.number().int().min(1).max(5),
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

    const { expected, userSaid, level } = parsed.data;

    // 발음 점수 (텍스트 비교 기반)
    const pronunciationScore = calculatePronunciationScore(expected, userSaid);

    // Gemini로 문법/표현 분석
    const prompt = `Analyze this English sentence from a level ${level} Korean learner.
User said: "${userSaid}"
Expected (context): "${expected}"

Return ONLY valid JSON:
{
  "grammarIssues": [{"original": "wrong part", "corrected": "correct form", "explanation": "Korean explanation"}],
  "suggestions": ["better expression 1"],
  "overallRating": "great" or "good" or "try_again"
}

Rating criteria: great = no issues + natural, good = minor issues, try_again = significant issues.
If the sentence is perfectly fine, return empty arrays with "great".`;

    const rawResponse = await generateContent(prompt);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

    let analysis = { grammarIssues: [], suggestions: [], overallRating: 'good' as const };
    if (jsonMatch) {
      try {
        analysis = JSON.parse(jsonMatch[0]);
      } catch {
        // 파싱 실패 시 기본값
      }
    }

    return NextResponse.json({
      pronunciationScore,
      grammarIssues: analysis.grammarIssues ?? [],
      suggestions: analysis.suggestions ?? [],
      overallRating: analysis.overallRating ?? 'good',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
