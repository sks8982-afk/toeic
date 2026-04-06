// Design Ref: §5.3, §5.4 — Speak 관련 데이터 모델

export type Accent = 'us' | 'uk' | 'au';
export type SpeakLevel = 1 | 2 | 3 | 4 | 5;
export type OverallRating = 'great' | 'good' | 'try_again';

export interface VoiceCharacter {
  readonly id: string;
  readonly name: string;
  readonly gender: 'female' | 'male';
  readonly accent: Accent;
  readonly description: string;
  readonly googleVoiceId: string;
  readonly previewUrl?: string;
}

export interface Scenario {
  readonly id: string;
  readonly title: string;
  readonly titleKo: string;
  readonly description: string;
  readonly minLevel: SpeakLevel;
  readonly maxLevel: SpeakLevel;
  readonly missions: readonly string[];
  readonly keyExpressions: readonly string[];
}

export interface GrammarIssue {
  readonly original: string;
  readonly corrected: string;
  readonly explanation: string;
}

export interface ChatFeedback {
  readonly pronunciation: number;
  readonly grammar: readonly GrammarIssue[];
  readonly suggestions: readonly string[];
}

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'ai';
  readonly text: string;
  readonly audioUrl?: string;
  readonly timestamp: number;
  readonly feedback?: ChatFeedback;
}

export interface SpeakStats {
  readonly totalConversations: number;
  readonly currentLevel: SpeakLevel;
  readonly avgPronunciation: number;
  readonly avgGrammar: number;
  readonly completedScenarios: readonly string[];
  readonly weeklyScores: readonly { date: string; pronunciation: number; grammar: number }[];
}
