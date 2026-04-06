// Design Ref: §2.4 F-GAME-04 — 데일리 퀘스트 정의

export interface QuestDefinition {
  readonly id: string;
  readonly description: string;
  readonly target: number;
  readonly xpReward: number;
  readonly type: 'toeic' | 'vocab' | 'speak' | 'general';
}

export const DAILY_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'toeic-20',
    description: 'TOEIC 문제 20개 풀기',
    target: 20,
    xpReward: 25,
    type: 'toeic',
  },
  {
    id: 'vocab-30',
    description: '단어 30개 학습하기',
    target: 30,
    xpReward: 25,
    type: 'vocab',
  },
  {
    id: 'speak-1',
    description: 'AI 영어 대화 1회 완료',
    target: 1,
    xpReward: 30,
    type: 'speak',
  },
  {
    id: 'vocab-review',
    description: '복습 단어 모두 소화하기',
    target: 1,
    xpReward: 20,
    type: 'vocab',
  },
  {
    id: 'toeic-streak-5',
    description: 'TOEIC 5문제 연속 정답',
    target: 5,
    xpReward: 15,
    type: 'toeic',
  },
];

export function getTodayQuests(): QuestDefinition[] {
  // 매일 3~4개 퀘스트 선택 (간단한 로테이션)
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const startIdx = dayOfYear % DAILY_QUESTS.length;
  const count = 3;
  const quests: QuestDefinition[] = [];
  for (let i = 0; i < count; i++) {
    quests.push(DAILY_QUESTS[(startIdx + i) % DAILY_QUESTS.length]);
  }
  return quests;
}
