// 단어 테스트 세트 API — 학습한(= user_vocab_learned 에 있는) 단어 중 N개 랜덤 선출
// 정답/오답 기록은 기존 /api/vocabulary/record 를 재사용
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const requestSchema = z.object({
  userId: z.string().min(1),
  count: z.number().int().min(5).max(100).default(20),
  onlyWrong: z.boolean().optional().default(false), // true면 오답 플래그만
});

interface VocabRow {
  readonly id: string;
  readonly word: string;
  readonly meaning: string;
  readonly pronunciation: string | null;
  readonly part_of_speech: string;
  readonly example_sentence: string;
  readonly category: string;
  readonly difficulty: string;
  readonly target_score: number;
  readonly is_idiom: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { userId, count, onlyWrong } = parsed.data;

    // 사용자가 학습한(= 한 번 이상 본) 단어 목록
    let q = supabaseAdmin
      .from('user_vocab_learned')
      .select('word_id, status')
      .eq('user_id', userId);
    if (onlyWrong) q = q.eq('status', 'wrong');

    const { data: learnedRows, error: learnedErr } = await q;
    if (learnedErr) {
      return NextResponse.json({ error: learnedErr.message }, { status: 500 });
    }

    const wordIds = (learnedRows ?? []).map(r => r.word_id);
    if (wordIds.length === 0) {
      return NextResponse.json({ words: [], total: 0, message: '학습한 단어가 없습니다' });
    }

    // 마스터에서 실제 단어 정보 조회
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from('toeic_vocabulary')
      .select('*')
      .in('id', wordIds);
    if (rowsErr) {
      return NextResponse.json({ error: rowsErr.message }, { status: 500 });
    }

    // 랜덤 셔플 후 N개
    const shuffled = [...(rows ?? [] as VocabRow[])].sort(() => Math.random() - 0.5).slice(0, count);

    return NextResponse.json({
      total: (rows ?? []).length,
      words: shuffled.map((r: VocabRow) => ({
        id: r.id,
        word: r.word,
        meaning: r.meaning,
        pronunciation: r.pronunciation ?? '',
        partOfSpeech: r.part_of_speech,
        exampleSentence: r.example_sentence,
        category: r.category,
        difficulty: r.difficulty,
        targetScore: r.target_score,
        isIdiom: r.is_idiom,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
