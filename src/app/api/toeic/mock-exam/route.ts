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

    // 리스닝 문제 생성
    const listeningPrompt = `Generate ${listeningCount} TOEIC Listening questions.
Difficulty: ${difficulty}
Mix of: short announcements (Part 1-2 style) and short conversations (Part 3-4 style).

Return ONLY a valid JSON array:
[{"audioText":"English text to read aloud via TTS","question":"한국어 질문","options":["선택지1","선택지2","선택지3","선택지4"],"correctIndex":0,"explanation":"한국어 해설","part":"listening"}]

Rules:
- audioText: natural English, TOEIC scenarios (office, store, airport, etc.)
- question and options: in Korean
- For short ones: 1-2 sentences. For dialogues: 2-4 exchanges with (Man)/(Woman) format.`;

    // 리딩 문제 생성
    const readingPrompt = `Generate ${readingCount} TOEIC Reading Part 5 questions.
Difficulty: ${difficulty}
Mix types: grammar (pos, tense, agreement, preposition, conjunction) and vocabulary.

Return ONLY a valid JSON array:
[{"sentence":"English sentence with ___ blank","options":["option A","option B","option C","option D"],"correctIndex":0,"explanation":"한국어 해설","grammarPoint":"문법 포인트","part":"reading"}]`;

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
