// Design Ref: §5.2 — 단어 + Leitner SRS 데이터 모델

export type VocabCategory = 'business' | 'finance' | 'hr' | 'marketing' | 'daily' | 'travel';
export type VocabDifficulty = 'basic' | 'intermediate' | 'advanced';
export type LeitnerBox = 1 | 2 | 3 | 4 | 5;

export interface VocabWord {
  readonly id: string;
  readonly word: string;
  readonly meaning: string;
  readonly pronunciation: string;
  readonly partOfSpeech: string;
  readonly exampleSentence: string;
  readonly category: VocabCategory;
  readonly difficulty: VocabDifficulty;
}

export interface VocabProgress {
  readonly wordId: string;
  readonly box: LeitnerBox;
  readonly lastReviewed: string;
  readonly nextReviewDue: string;
  readonly correctStreak: number;
  readonly totalAttempts: number;
  readonly totalCorrect: number;
}

export const BOX_INTERVALS: Record<LeitnerBox, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
} as const;
