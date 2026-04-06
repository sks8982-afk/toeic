// TOEIC 리스닝 문제 생성 API — Gemini로 생성
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';

const DIFFICULTY_GUIDE: Record<string, string> = {
  easy: 'Simple short sentence (1-2 sentences). Clear pronunciation, common words. Example: announcement, short message.',
  medium: 'Short conversation (2-4 exchanges between 2 people). Business context like office, meeting. Moderate speed.',
  hard: 'Longer conversation or announcement (4-6 sentences). Complex business situation, some idioms, natural speed.',
};

const requestSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { difficulty } = parsed.data;
    const guide = DIFFICULTY_GUIDE[difficulty];

    const prompt = `Generate a TOEIC Listening Comprehension question.

Difficulty: ${difficulty} — ${guide}

Create a realistic TOEIC-style listening question. Return ONLY valid JSON (no markdown):
{
  "audioText": "The English text to be read aloud by TTS. For conversations, use format: (Man) Hello... (Woman) Hi...",
  "question": "한국어로 된 질문. 예: 남자는 왜 전화했습니까?",
  "options": ["선택지1 (한국어)", "선택지2", "선택지3", "선택지4"],
  "correctIndex": 0,
  "explanation": "한국어 해설. 왜 이 답이 맞는지 설명.",
  "transcript": "Full English transcript for review after answering"
}

Rules:
- audioText: natural English, realistic TOEIC scenario (office, store, airport, etc.)
- question and options: in Korean
- Make the wrong options plausible but clearly wrong if you understood the audio
- For easy: single announcement or message
- For medium: 2-person short dialogue
- For hard: longer dialogue with details to catch`;

    const rawResponse = await generateContent(prompt);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate question' }, { status: 500 });
    }

    const question = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      id: `listen-${difficulty}-${Date.now()}`,
      difficulty,
      ...question,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
