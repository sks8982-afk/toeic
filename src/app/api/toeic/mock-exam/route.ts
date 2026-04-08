// AI 모의고사 생성 + 기존 모의고사 목록 조회
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const generateSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  listeningCount: z.number().int().default(10),
  readingCount: z.number().int().default(10),
});

// GET: 모의고사 목록
export async function GET() {
  const { data, error } = await supabase
    .from('mock_exams')
    .select('id, title, description, total_questions, difficulty, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exams: data });
}

// POST: AI 모의고사 생성
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { difficulty, listeningCount, readingCount } = parsed.data;

    const difficultyGuide = {
      easy: { listening: 'Each audio must be at least 3-4 sentences long. Use simple vocabulary.', reading: 'Use common words and simple grammar structures.' },
      medium: { listening: 'Each audio must be at least 5-8 sentences or 3-4 dialogue exchanges. Use business vocabulary.', reading: 'Use business vocabulary and moderate grammar complexity.' },
      hard: { listening: 'Each audio must be at least 8-12 sentences or 5-6 dialogue exchanges with details. Use advanced vocabulary and idioms.', reading: 'Use advanced vocabulary, complex structures, and subtle distinctions.' },
    }[difficulty];

    // 리스닝 문제 생성
    const listeningPrompt = `Generate ${listeningCount} TOEIC Listening Comprehension questions.
Difficulty: ${difficulty}. ${difficultyGuide.listening}

Question distribution:
- 3 questions: Short announcement/message (company announcement, voicemail, store notice, weather report)
- 4 questions: Two-person conversation with (Man) and (Woman) tags. Topic: office, restaurant, hotel, airport, store
- 3 questions: Longer talk or announcement (meeting presentation, tour guide, news report)

IMPORTANT: Each audioText MUST be substantial and realistic:
- Announcements: minimum 3 sentences with specific details (names, dates, times, locations)
- Conversations: minimum 3 back-and-forth exchanges (6 lines total) with natural dialogue
- Talks: minimum 4-5 sentences with context and details

Example of GOOD audioText for a conversation:
"(Woman) Hi, I'm calling about the marketing report. Is it ready yet? (Man) Almost. I just need to add the sales figures from last quarter. I should have it done by this afternoon. (Woman) That's great. Could you also include the comparison chart? The director specifically asked for it. (Man) Sure, I'll add that. Should I email it to you or bring a printed copy to the meeting? (Woman) Email is fine. The meeting starts at 3, so please send it by 2:30."

Return ONLY a valid JSON array:
[{
  "audioText": "Full English text to be read aloud (MUST be substantial, see above)",
  "question": "한국어로 된 구체적인 질문 (예: 여자는 왜 전화했습니까?)",
  "options": ["구체적인 한국어 선택지1", "선택지2", "선택지3", "선택지4"],
  "correctIndex": 0,
  "explanation": "한국어 해설 (왜 이 답이 맞는지, 어떤 부분에서 단서를 찾을 수 있는지)",
  "part": "listening"
}]`;

    // 리딩 문제 생성
    const readingPrompt = `Generate ${readingCount} TOEIC Reading Part 5-6 questions.
Difficulty: ${difficulty}. ${difficultyGuide.reading}

Question distribution:
- 5 questions: Part 5 style (single sentence with ___ blank, grammar/vocabulary)
- 3 questions: Part 6 style (short paragraph 2-3 sentences with ___ blank in context)
- 2 questions: Part 7 style (reading passage 3-4 sentences, then comprehension question in Korean)

For Part 5: sentence must be a complete, realistic business sentence.
For Part 6: provide a short paragraph context, mark the blank with ___.
For Part 7: provide the English passage in "sentence" field, question in Korean in a separate field.

Return ONLY a valid JSON array:
[{
  "sentence": "English sentence or paragraph (for Part 7: the reading passage)",
  "question": "한국어 질문 (Part 7용, Part 5-6은 빈칸이 질문이므로 null)",
  "options": ["option A", "option B", "option C", "option D"],
  "correctIndex": 0,
  "explanation": "한국어 해설 (문법 포인트나 지문의 어떤 부분이 단서인지 설명)",
  "grammarPoint": "문법/유형 태그 (예: 품사, 시제, 독해)",
  "part": "reading"
}]`;

    const [listeningRaw, readingRaw] = await Promise.all([
      generateContent(listeningPrompt),
      generateContent(readingPrompt),
    ]);

    const listeningMatch = listeningRaw.match(/\[[\s\S]*\]/);
    const readingMatch = readingRaw.match(/\[[\s\S]*\]/);

    const listeningQuestions = listeningMatch ? JSON.parse(listeningMatch[0]) : [];
    const readingQuestions = readingMatch ? JSON.parse(readingMatch[0]) : [];

    const total = listeningQuestions.length + readingQuestions.length;
    const title = `AI 모의고사 (${difficulty === 'easy' ? '기초' : difficulty === 'medium' ? '중급' : '고급'}) — ${total}문제`;

    // DB에 저장
    const { data: exam, error } = await supabase
      .from('mock_exams')
      .insert({
        title,
        description: `리스닝 ${listeningQuestions.length}문제 + 리딩 ${readingQuestions.length}문제`,
        total_questions: total,
        listening_questions: listeningQuestions,
        reading_questions: readingQuestions,
        difficulty,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ exam });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
