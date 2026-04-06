// Design Ref: §5.1 — TOEIC 문제 데이터 모델

export type GrammarType =
  | 'pos'           // 품사
  | 'tense'         // 시제
  | 'agreement'     // 수일치
  | 'relative'      // 관계사
  | 'preposition'   // 전치사
  | 'conjunction'   // 접속사
  | 'vocabulary';   // 어휘

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ToeicQuestion {
  readonly id: string;
  readonly type: GrammarType;
  readonly difficulty: Difficulty;
  readonly sentence: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
  readonly grammarPoint: string;
}

export interface WrongAnswer {
  readonly questionId: string;
  readonly question: ToeicQuestion;
  readonly wrongAt: string;
  readonly reviewDue: string;
  readonly reviewCount: number;
  readonly interval: number;
}

// 리스닝 문제
export type ListeningDifficulty = 'easy' | 'medium' | 'hard';

export interface ListeningQuestion {
  readonly id: string;
  readonly difficulty: ListeningDifficulty;
  readonly audioText: string;        // TTS로 읽을 영어 텍스트 (대화 or 문장)
  readonly question: string;         // 질문 (한국어)
  readonly options: readonly string[];  // 4지선다
  readonly correctIndex: number;
  readonly explanation: string;      // 해설 (한국어)
  readonly transcript: string;       // 전체 스크립트 (정답 확인 후 표시)
}

export interface ToeicStats {
  readonly totalSolved: number;
  readonly correctRate: number;
  readonly estimatedScore: number;
  readonly accuracyByType: Record<GrammarType, { total: number; correct: number }>;
  readonly wrongAnswers: readonly WrongAnswer[];
  readonly dailyGoal: number;
}
