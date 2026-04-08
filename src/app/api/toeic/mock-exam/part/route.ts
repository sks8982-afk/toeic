// 모의고사 파트별 생성 API — 5문제씩 점진적 생성
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';

const requestSchema = z.object({
  part: z.enum(['part3', 'part4', 'part5', 'part6', 'part7']),
  count: z.number().int().min(1).max(15).default(5),
});

const PART_PROMPTS: Record<string, (count: number) => string> = {
  part3: (count) => `Generate ${count} TOEIC Part 3 Listening questions (conversations).

EACH conversation MUST:
- Have 10-14 lines alternating between two speakers
- Use different character names and scenarios for EACH question (NO repeating names!)
- Start naturally — NOT with greetings like "Hi Sarah" every time
- Start mid-conversation or with a question/statement instead

VARIETY RULES (each question must use a DIFFERENT combination):
Scenarios (pick different ones): phone inquiry, office discussion, appointment change, delivery issue, project update, complaint handling, event planning, schedule conflict, training session, equipment problem
Speaker names (pick different ones): David/Jennifer, Mark/Lisa, Tom/Amanda, Chris/Michelle, Robert/Emily, Kevin/Rachel, Brian/Nicole, Steve/Angela, Paul/Catherine, Alex/Diana

Starting examples (vary these — NEVER start the same way twice):
- "(Man) I just got an email about the quarterly review..."
- "(Woman) Excuse me, I was wondering if you could help me with..."
- "(Man) Have you had a chance to look at the new proposal?"
- "(Woman) I'm calling about the order I placed last week."
- "(Man) We need to discuss the budget changes before Friday."

Include specific details: names, dates, times, prices, locations.

Return ONLY valid JSON array:
[{
  "audioText": "(Woman) ... (Man) ... [10+ lines, varied start, NO repeated names]",
  "question": "한국어 질문 (구체적: 누가/무엇을/왜/언제)",
  "options": ["한국어 선택지1", "선택지2", "선택지3", "선택지4"],
  "correctIndex": 0,
  "explanation": "한국어 해설",
  "part": "listening"
}]`,

  part4: (count) => `Generate ${count} TOEIC Part 4 Listening questions (talks/announcements).

Each is a LONG monologue — at least 8-12 sentences.
Types: company announcement, voicemail, news report, tour guide, meeting presentation, advertisement.
Include specific details: names, numbers, dates, locations, instructions.

Return ONLY valid JSON array:
[{
  "audioText": "Full monologue text [MUST be 8-12 sentences with details]",
  "question": "한국어 질문",
  "options": ["한국어 선택지1", "선택지2", "선택지3", "선택지4"],
  "correctIndex": 0,
  "explanation": "한국어 해설",
  "part": "listening"
}]`,

  part5: (count) => `Generate ${count} TOEIC Part 5 questions (incomplete sentences).

Each: one business English sentence with ___ blank, 4 English options.
Mix types: POS (40%), tense (20%), preposition (15%), conjunction (15%), vocabulary (10%).

Return ONLY valid JSON array:
[{
  "sentence": "The manager ___ approved the new hiring plan for next quarter.",
  "options": ["recent", "recently", "recentness", "more recent"],
  "correctIndex": 1,
  "explanation": "동사 approved를 수식하므로 부사 recently가 정답",
  "grammarPoint": "품사 (부사)",
  "part": "reading"
}]`,

  part6: (count) => `Generate ${count} TOEIC Part 6 questions (text completion).

Each: a 4-6 sentence business paragraph (email, memo, notice) with ONE ___ blank.
Context matters — must read the full paragraph to determine the answer.

Return ONLY valid JSON array:
[{
  "sentence": "Dear Mr. Kim,\\n\\nThank you for your inquiry about our annual conference. This year's event will ___ on September 15th at the Grand Hotel. We expect over 500 attendees from various industries. Please find the registration form attached.",
  "options": ["take place", "take part", "take over", "take off"],
  "correctIndex": 0,
  "explanation": "'take place'는 '개최되다'의 의미. 문맥상 행사가 열리는 것이므로 정답",
  "grammarPoint": "구동사 (text completion)",
  "part": "reading"
}]`,

  part7: (count) => `Generate ${count} TOEIC Part 7 questions (reading comprehension).

Each: a FULL English passage (email, advertisement, article, memo, notice) of 8-15 sentences with specific details.
Then a Korean comprehension question about the passage.

Return ONLY valid JSON array:
[{
  "sentence": "Dear valued customers,\\n\\nWe are pleased to announce that Greenfield Supermarket will be relocating to a larger facility at 450 Oak Avenue, effective March 1st. [... at least 8-15 sentences with details about hours, promotions, parking, contact info ...]",
  "question": "이 공지의 주요 목적은 무엇입니까?",
  "options": ["매장 이전 안내", "할인 행사 홍보", "영업시간 변경", "직원 채용 공고"],
  "correctIndex": 0,
  "explanation": "첫 문장에서 relocating to a larger facility라고 하므로 매장 이전 안내가 정답",
  "grammarPoint": "독해 (주제 파악)",
  "part": "reading"
}]`,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { part, count } = parsed.data;
    const prompt = PART_PROMPTS[part](count);
    const raw = await generateContent(prompt);
    const match = raw.match(/\[[\s\S]*\]/);

    if (!match) return NextResponse.json({ error: 'Generation failed' }, { status: 500 });

    const questions = JSON.parse(match[0]);
    return NextResponse.json({ questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
