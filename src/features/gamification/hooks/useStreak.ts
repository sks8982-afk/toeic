// Design Ref: §2.4 F-GAME-03 — 스트릭 관리 (연속 학습일)
'use client';

import { useCallback } from 'react';
import { useProgress } from '@/shared/providers/ProgressProvider';
import { format, differenceInCalendarDays } from 'date-fns';

export function useStreak() {
  const { progress, updateProgress } = useProgress();

  const streak = progress.streak;
  const lastStudyDate = progress.lastStudyDate;

  const recordStudy = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    updateProgress(prev => {
      if (prev.lastStudyDate === today) {
        // 오늘 이미 기록됨
        return prev;
      }

      const daysDiff = prev.lastStudyDate
        ? differenceInCalendarDays(new Date(today), new Date(prev.lastStudyDate))
        : 0;

      let newStreak: number;
      if (daysDiff === 1) {
        // 어제 학습 → 스트릭 유지 + 1
        newStreak = prev.streak + 1;
      } else if (daysDiff === 0) {
        // 같은 날
        newStreak = prev.streak;
      } else {
        // 1일 이상 빠짐 → 스트릭 리셋
        newStreak = 1;
      }

      return {
        ...prev,
        streak: newStreak,
        lastStudyDate: today,
      };
    });
  }, [updateProgress]);

  const isStudiedToday = progress.lastStudyDate === format(new Date(), 'yyyy-MM-dd');

  return { streak, lastStudyDate, isStudiedToday, recordStudy } as const;
}
