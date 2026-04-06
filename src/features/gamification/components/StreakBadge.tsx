// Design Ref: §7.2 — 스트릭 불꽃 아이콘 + "N일 연속!" 배너
'use client';

import { useStreak } from '../hooks/useStreak';

export function StreakBadge() {
  const { streak, isStudiedToday } = useStreak();

  if (streak === 0) return null;

  return (
    <div className={`
      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
      ${isStudiedToday
        ? 'bg-orange-100 text-orange-700'
        : 'bg-gray-100 text-gray-500'}
    `}>
      <span className={`text-lg ${isStudiedToday ? 'animate-bounce' : ''}`}>
        {isStudiedToday ? '🔥' : '❄️'}
      </span>
      <span>{streak}일</span>
    </div>
  );
}
