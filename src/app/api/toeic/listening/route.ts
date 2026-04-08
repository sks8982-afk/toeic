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

    // 매번 다른 시나리오를 위한 랜덤 시드
    const scenarios = ['office meeting', 'phone inquiry', 'restaurant reservation', 'hotel check-in', 'delivery problem', 'job interview', 'travel agency', 'medical appointment', 'car repair shop', 'library service', 'gym membership', 'bank inquiry', 'real estate tour', 'conference registration', 'tech support call'];
    const names = [['David','Jennifer'], ['Mark','Lisa'], ['Tom','Amanda'], ['Chris','Michelle'], ['Robert','Emily'], ['Kevin','Rachel'], ['Brian','Nicole'], ['Steve','Angela']];
    const picked = scenarios[Math.floor(Math.random() * scenarios.length)];
    const pickedNames = names[Math.floor(Math.random() * names.length)];

    const prompt = `Generate a TOEIC Listening Comprehension question.

Difficulty: ${difficulty} — ${guide}
Scenario: ${picked}
Character names: ${pickedNames[0]} (Man) and ${pickedNames[1]} (Woman)

IMPORTANT: Do NOT start with "Hi [name]" greeting. Start naturally mid-conversation or with a question/statement.
Good starts: "I just received...", "Have you seen...", "Excuse me, I was wondering...", "We need to talk about..."

Return ONLY valid JSON (no markdown):
{
  "audioText": "Full English dialogue with (Man) and (Woman) tags. Min 8-10 lines for medium/hard.",
  "question": "한국어 질문 (구체적)",
  "options": ["한국어 선택지1", "선택지2", "선택지3", "선택지4"],
  "correctIndex": 0,
  "explanation": "한국어 해설",
  "transcript": "Full English transcript"
}

Rules:
- audioText: natural English, use the scenario and names above
- question and options: in Korean
- For easy: single announcement or message (3-4 sentences)
- For medium: 2-person dialogue (8-10 lines)
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
