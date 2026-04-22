// 단어 학습 결과를 user_vocab_learned 에 기록/업데이트
// action:
//   'know'    → box +1, status='learning' (box=5면 mastered)
//   'unsure'  → box 유지, status='learning'
//   'unknown' → box=1, status='wrong' (오답 플래그 세움)
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const requestSchema = z.object({
  userId: z.string().min(1),
  wordId: z.string().min(1),
  action: z.enum(['know', 'unsure', 'unknown']),
});

interface ExistingRow {
  readonly id: string;
  readonly box: number;
  readonly correct_count: number;
  readonly wrong_count: number;
}

function intervalDays(box: number): number {
  // Leitner 간격: 1/2/4/8/16일
  switch (box) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 4;
    case 4: return 8;
    default: return 16;
  }
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { userId, wordId, action } = parsed.data;

    // 기존 행 조회
    const { data: existing } = await supabaseAdmin
      .from('user_vocab_learned')
      .select('id, box, correct_count, wrong_count')
      .eq('user_id', userId)
      .eq('word_id', wordId)
      .maybeSingle();

    const prev = existing as ExistingRow | null;
    const nowIso = new Date().toISOString();

    // 새 box/status 계산
    let nextBox = prev?.box ?? 1;
    let status: 'learning' | 'mastered' | 'wrong' = 'learning';
    let correctCount = prev?.correct_count ?? 0;
    let wrongCount = prev?.wrong_count ?? 0;

    if (action === 'know') {
      nextBox = Math.min(nextBox + 1, 5);
      correctCount += 1;
      status = nextBox >= 5 ? 'mastered' : 'learning';
    } else if (action === 'unknown') {
      nextBox = 1;
      wrongCount += 1;
      status = 'wrong';
    } else {
      // unsure: box 유지
      status = 'learning';
    }

    const nextReviewAt = addDaysIso(intervalDays(nextBox));

    if (prev) {
      const { error } = await supabaseAdmin
        .from('user_vocab_learned')
        .update({
          box: nextBox,
          status,
          correct_count: correctCount,
          wrong_count: wrongCount,
          last_seen_at: nowIso,
          next_review_at: nextReviewAt,
        })
        .eq('id', prev.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabaseAdmin.from('user_vocab_learned').insert({
        user_id: userId,
        word_id: wordId,
        box: nextBox,
        status,
        correct_count: correctCount,
        wrong_count: wrongCount,
        last_seen_at: nowIso,
        next_review_at: nextReviewAt,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, box: nextBox, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
