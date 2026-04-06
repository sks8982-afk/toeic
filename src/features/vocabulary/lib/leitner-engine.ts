// Design Ref: §5.1 — Leitner Box SRS 엔진 (순수 함수)
// Plan SC: SC-08 — 학습 기록 저장 및 복원
import { addDays } from 'date-fns';
import { BOX_INTERVALS, type VocabProgress, type LeitnerBox } from '@/types';

export function promoteWord(progress: VocabProgress): VocabProgress {
  const nextBox = Math.min(progress.box + 1, 5) as LeitnerBox;
  const now = new Date();
  return {
    ...progress,
    box: nextBox,
    correctStreak: progress.correctStreak + 1,
    totalAttempts: progress.totalAttempts + 1,
    totalCorrect: progress.totalCorrect + 1,
    nextReviewDue: addDays(now, BOX_INTERVALS[nextBox]).toISOString(),
    lastReviewed: now.toISOString(),
  };
}

export function demoteWord(progress: VocabProgress): VocabProgress {
  const now = new Date();
  return {
    ...progress,
    box: 1,
    correctStreak: 0,
    totalAttempts: progress.totalAttempts + 1,
    nextReviewDue: addDays(now, 1).toISOString(),
    lastReviewed: now.toISOString(),
  };
}

export function keepWord(progress: VocabProgress): VocabProgress {
  // "애매해요" — 같은 박스에 유지, 내일 다시
  const now = new Date();
  return {
    ...progress,
    totalAttempts: progress.totalAttempts + 1,
    nextReviewDue: addDays(now, 1).toISOString(),
    lastReviewed: now.toISOString(),
  };
}

export function getDueWords(words: VocabProgress[], today: Date = new Date()): VocabProgress[] {
  return words.filter(w => new Date(w.nextReviewDue) <= today);
}

export function getStuckWords(words: VocabProgress[], dayThreshold: number = 3): VocabProgress[] {
  const threshold = addDays(new Date(), -dayThreshold);
  return words.filter(
    w => w.box === 1 && w.lastReviewed && new Date(w.lastReviewed) < threshold,
  );
}

export function createNewProgress(wordId: string): VocabProgress {
  return {
    wordId,
    box: 1 as LeitnerBox,
    lastReviewed: '',
    nextReviewDue: new Date().toISOString(),
    correctStreak: 0,
    totalAttempts: 0,
    totalCorrect: 0,
  };
}

export function getBoxDistribution(words: VocabProgress[]): Record<LeitnerBox, number> {
  const dist: Record<LeitnerBox, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const w of words) {
    dist[w.box]++;
  }
  return dist;
}

export interface DailySession {
  readonly reviews: VocabProgress[];
  readonly newWordIds: string[];
  readonly stuckWords: VocabProgress[];
}

export function buildDailySession(
  allProgress: VocabProgress[],
  allWordIds: string[],
  dailyTarget: number,
): DailySession {
  const reviews = getDueWords(allProgress);
  const stuckWords = getStuckWords(allProgress);

  // 이미 학습 중인 단어 ID 셋
  const learnedIds = new Set(allProgress.map(w => w.wordId));

  // 신규 단어: 아직 학습하지 않은 단어에서 dailyTarget개
  const newWordIds = allWordIds
    .filter(id => !learnedIds.has(id))
    .slice(0, dailyTarget);

  return { reviews, newWordIds, stuckWords };
}
