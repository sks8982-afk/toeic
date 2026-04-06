// Design Ref: §2.4 — 게이미피케이션 데이터 모델

export interface DailyQuest {
  readonly id: string;
  readonly description: string;
  readonly target: number;
  readonly current: number;
  readonly xpReward: number;
  readonly completed: boolean;
}

export interface UserProgress {
  readonly xp: number;
  readonly level: number;
  readonly streak: number;
  readonly lastStudyDate: string;
  readonly toeic: {
    readonly totalSolved: number;
    readonly correctRate: number;
    readonly estimatedScore: number;
    readonly dailyGoal: number;
  };
  readonly speak: {
    readonly totalConversations: number;
    readonly currentLevel: number;
    readonly avgPronunciation: number;
    readonly avgGrammar: number;
    readonly completedScenarios: readonly string[];
  };
  readonly vocabulary: {
    readonly dailyNewTarget: 10 | 30 | 50;
    readonly todayNewLearned: number;
    readonly todayReviewed: number;
    readonly bookmarks: readonly string[];
  };
  readonly settings: {
    readonly vocabDailyTarget: 10 | 30 | 50;
    readonly toeicDailyTarget: number;
    readonly selectedVoiceId: string;
  };
}

export const DEFAULT_USER_PROGRESS: UserProgress = {
  xp: 0,
  level: 1,
  streak: 0,
  lastStudyDate: '',
  toeic: {
    totalSolved: 0,
    correctRate: 0,
    estimatedScore: 0,
    dailyGoal: 20,
  },
  speak: {
    totalConversations: 0,
    currentLevel: 1,
    avgPronunciation: 0,
    avgGrammar: 0,
    completedScenarios: [],
  },
  vocabulary: {
    dailyNewTarget: 30,
    todayNewLearned: 0,
    todayReviewed: 0,
    bookmarks: [],
  },
  settings: {
    vocabDailyTarget: 30,
    toeicDailyTarget: 20,
    selectedVoiceId: 'emma',
  },
};
