// 단어 추천 API — 사용자별 학습 상태 기반
// 우선순위 (절대 규칙):
//   1. 아직 안 본 단어 (user_vocab_learned에 없음) — 최우선
//   2. 오답 표시된 단어 (status='wrong')
//   3. 확인 완료(status='learning'/'mastered')된 단어는 모든 미확인 단어를 소진한 뒤에만 등장
//
// "사용자가 확인한 단어는 미확인한 단어보다 우선순위로 나오면 안 된다"
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const requestSchema = z.object({
  userId: z.string().min(1),
  count: z.number().int().min(1).max(50).default(20),
  category: z
    .enum(['business', 'finance', 'hr', 'marketing', 'daily', 'travel', 'general', 'idiom'])
    .optional(),
  minTargetScore: z.number().int().min(400).max(990).optional(),
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

function toApiShape(row: VocabRow) {
  return {
    id: row.id,
    word: row.word,
    meaning: row.meaning,
    pronunciation: row.pronunciation ?? '',
    partOfSpeech: row.part_of_speech,
    exampleSentence: row.example_sentence,
    category: row.category,
    difficulty: row.difficulty,
    targetScore: row.target_score,
    isIdiom: row.is_idiom,
  };
}

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

    const { userId, count, category, minTargetScore } = parsed.data;

    // 1) 사용자의 학습 상태 전체 조회
    const { data: learnedRows, error: learnedErr } = await supabaseAdmin
      .from('user_vocab_learned')
      .select('word_id, status')
      .eq('user_id', userId);

    if (learnedErr) {
      return NextResponse.json({ error: learnedErr.message }, { status: 500 });
    }

    const learnedIds = new Set<string>((learnedRows ?? []).map(r => r.word_id));
    const wrongIds = (learnedRows ?? [])
      .filter(r => r.status === 'wrong')
      .map(r => r.word_id);

    // 2) 미확인 단어를 우선으로 가져온다 (절대 규칙)
    let unseenQuery = supabaseAdmin
      .from('toeic_vocabulary')
      .select('*')
      .limit(count * 3); // 랜덤 섞어 쓸 여유
    if (category) unseenQuery = unseenQuery.eq('category', category);
    if (minTargetScore) unseenQuery = unseenQuery.gte('target_score', minTargetScore);

    const { data: candidatePool, error: poolErr } = await unseenQuery;
    if (poolErr) {
      return NextResponse.json({ error: poolErr.message }, { status: 500 });
    }

    const pool = (candidatePool ?? []) as VocabRow[];
    const unseen = pool.filter(w => !learnedIds.has(w.id));

    // 3) 미확인 단어로 count를 다 채울 수 있으면 그것만 반환 (확인 단어는 절대 섞지 않음)
    if (unseen.length >= count) {
      // 섞어서 앞에서 count개
      const shuffled = [...unseen].sort(() => Math.random() - 0.5).slice(0, count);
      return NextResponse.json({
        words: shuffled.map(toApiShape),
        source: 'unseen_only',
        stats: {
          totalLearned: learnedIds.size,
          totalWrong: wrongIds.length,
          returnedCount: shuffled.length,
        },
      });
    }

    // 4) 미확인만으로는 부족 → 먼저 미확인 전부 + 부족분은 오답(wrong) 단어로 채움
    const needMore = count - unseen.length;
    let fillers: VocabRow[] = [];

    if (wrongIds.length > 0 && needMore > 0) {
      let wrongQuery = supabaseAdmin
        .from('toeic_vocabulary')
        .select('*')
        .in('id', wrongIds)
        .limit(needMore);
      if (category) wrongQuery = wrongQuery.eq('category', category);

      const { data: wrongWords } = await wrongQuery;
      fillers = (wrongWords ?? []) as VocabRow[];
    }

    const result = [
      ...unseen.sort(() => Math.random() - 0.5),
      ...fillers.sort(() => Math.random() - 0.5),
    ].slice(0, count);

    return NextResponse.json({
      words: result.map(toApiShape),
      source: unseen.length === 0 ? 'wrong_only' : 'unseen_plus_wrong',
      stats: {
        totalLearned: learnedIds.size,
        totalWrong: wrongIds.length,
        unseenUsed: unseen.length,
        wrongUsed: fillers.length,
        returnedCount: result.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
