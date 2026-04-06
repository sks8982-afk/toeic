// Design Ref: §2.4 — XP/레벨 시스템 (Lv.1 ~ Lv.50)
// Plan SC: SC-07 — XP/스트릭 동작

// 레벨별 필요 누적 XP (레벨업에 필요한 총 XP)
// 패턴: 초반은 빠르게, 후반은 점진적으로 느려짐
const XP_TABLE: readonly number[] = [
  0,      // Lv.1 (시작)
  100,    // Lv.2
  250,    // Lv.3
  450,    // Lv.4
  700,    // Lv.5
  1000,   // Lv.6
  1350,   // Lv.7
  1750,   // Lv.8
  2200,   // Lv.9
  2700,   // Lv.10
  3300,   // Lv.11
  4000,   // Lv.12
  4800,   // Lv.13
  5700,   // Lv.14
  6700,   // Lv.15
  7800,   // Lv.16
  9000,   // Lv.17
  10300,  // Lv.18
  11700,  // Lv.19
  13200,  // Lv.20
  14800,  // Lv.21
  16500,  // Lv.22
  18300,  // Lv.23
  20200,  // Lv.24
  22200,  // Lv.25
  24300,  // Lv.26
  26500,  // Lv.27
  28800,  // Lv.28
  31200,  // Lv.29
  33700,  // Lv.30
  36300,  // Lv.31
  39000,  // Lv.32
  41800,  // Lv.33
  44700,  // Lv.34
  47700,  // Lv.35
  50800,  // Lv.36
  54000,  // Lv.37
  57300,  // Lv.38
  60700,  // Lv.39
  64200,  // Lv.40
  67800,  // Lv.41
  71500,  // Lv.42
  75300,  // Lv.43
  79200,  // Lv.44
  83200,  // Lv.45
  87300,  // Lv.46
  91500,  // Lv.47
  95800,  // Lv.48
  100200, // Lv.49
  104700, // Lv.50
];

export const MAX_LEVEL = 50;

export function getLevelForXP(xp: number): number {
  for (let i = XP_TABLE.length - 1; i >= 0; i--) {
    if (xp >= XP_TABLE[i]) return i + 1;
  }
  return 1;
}

export function getXPForLevel(level: number): number {
  const idx = Math.max(0, Math.min(level - 1, XP_TABLE.length - 1));
  return XP_TABLE[idx];
}

export function getXPProgress(xp: number): { current: number; needed: number; percentage: number } {
  const level = getLevelForXP(xp);
  if (level >= MAX_LEVEL) {
    return { current: 0, needed: 0, percentage: 100 };
  }
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const current = xp - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  const percentage = Math.round((current / needed) * 100);
  return { current, needed, percentage };
}

// XP 보상 상수
export const XP_REWARDS = {
  TOEIC_CORRECT: 10,
  TOEIC_STREAK_BONUS: 5,       // 5문제 연속 정답 보너스
  VOCAB_CORRECT: 5,
  VOCAB_BOX_PROMOTE: 3,         // Box 승급 보너스
  SPEAK_CONVERSATION: 20,
  SPEAK_GREAT_RATING: 10,
  DAILY_QUEST_COMPLETE: 25,
  STREAK_DAILY: 5,              // 매일 접속 보너스
} as const;
