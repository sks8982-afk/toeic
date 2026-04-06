// 단어 학습 통계 hook
'use client';

import { useMemo } from 'react';
import { useLeitnerBox } from './useLeitnerBox';
import { BOX_INTERVALS } from '@/types';

export function useVocabStats() {
  const { allProgress, boxDistribution, totalLearned, graduated } = useLeitnerBox();

  const stats = useMemo(() => {
    const totalAttempts = allProgress.reduce((sum, p) => sum + p.totalAttempts, 0);
    const totalCorrect = allProgress.reduce((sum, p) => sum + p.totalCorrect, 0);
    const accuracyRate = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    const avgBox = totalLearned > 0
      ? (allProgress.reduce((sum, p) => sum + p.box, 0) / totalLearned).toFixed(1)
      : '0';

    return {
      totalLearned,
      graduated,
      totalAttempts,
      totalCorrect,
      accuracyRate,
      avgBox: Number(avgBox),
      boxDistribution,
    };
  }, [allProgress, totalLearned, graduated, boxDistribution]);

  return stats;
}
