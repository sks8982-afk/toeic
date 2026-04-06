// Design Ref: §5.2 — 적응형 난이도 + 예상 점수 계산
import type { GrammarType, Difficulty } from '@/types';

interface TypeStats {
  readonly total: number;
  readonly correct: number;
}

export function getAccuracyRate(stats: TypeStats): number {
  if (stats.total === 0) return 0;
  return stats.correct / stats.total;
}

export function getWeakestType(
  accuracyByType: Record<GrammarType, TypeStats>,
): { type: GrammarType; difficulty: Difficulty } {
  const entries = Object.entries(accuracyByType) as [GrammarType, TypeStats][];

  // 풀이 횟수가 0인 유형은 제외 (아직 시도 안 함)
  const attempted = entries.filter(([, s]) => s.total > 0);

  if (attempted.length === 0) {
    // 아직 아무것도 안 풀었으면 기본값
    return { type: 'pos', difficulty: 'easy' };
  }

  // 정답률 가장 낮은 유형 선택
  const [weakestType] = attempted.sort(
    ([, a], [, b]) => getAccuracyRate(a) - getAccuracyRate(b),
  )[0];

  const rate = getAccuracyRate(
    accuracyByType[weakestType],
  );

  const difficulty: Difficulty =
    rate < 0.4 ? 'easy' : rate < 0.7 ? 'medium' : 'hard';

  return { type: weakestType, difficulty };
}

// TOEIC 예상 점수 계산 (간단 추정)
// 실제 TOEIC 점수 범위: 5~495 (Reading)
export function estimateScore(
  accuracyByType: Record<GrammarType, TypeStats>,
): number {
  const entries = Object.entries(accuracyByType) as [GrammarType, TypeStats][];
  const attempted = entries.filter(([, s]) => s.total > 0);

  if (attempted.length === 0) return 0;

  const totalCorrect = attempted.reduce((sum, [, s]) => sum + s.correct, 0);
  const totalAttempts = attempted.reduce((sum, [, s]) => sum + s.total, 0);
  const overallRate = totalCorrect / totalAttempts;

  // 정답률 → 예상 점수 매핑 (Reading 기준)
  // 0% → 100점, 50% → 300점, 100% → 495점
  const score = Math.round(100 + overallRate * 395);
  return Math.min(495, Math.max(5, score));
}

// 초기 accuracyByType 생성
export function createInitialAccuracy(): Record<GrammarType, TypeStats> {
  return {
    pos: { total: 0, correct: 0 },
    tense: { total: 0, correct: 0 },
    agreement: { total: 0, correct: 0 },
    relative: { total: 0, correct: 0 },
    preposition: { total: 0, correct: 0 },
    conjunction: { total: 0, correct: 0 },
    vocabulary: { total: 0, correct: 0 },
  };
}
