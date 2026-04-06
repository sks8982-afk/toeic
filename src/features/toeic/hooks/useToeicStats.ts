// Design Ref: §2.2.1 F-TOEIC-10 — 유형별 통계 관리
'use client';

import { useCallback } from 'react';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import { useAuth } from '@/shared/providers/AuthProvider';
import { createInitialAccuracy, estimateScore } from '../lib/scoring';
import type { GrammarType } from '@/types';

interface ToeicStatsData {
  readonly totalSolved: number;
  readonly accuracyByType: Record<GrammarType, { total: number; correct: number }>;
}

const INITIAL_STATS: ToeicStatsData = {
  totalSolved: 0,
  accuracyByType: createInitialAccuracy(),
};

export function useToeicStats() {
  const { user } = useAuth();
  const storageKey = user ? `toeic-stats-${user.id}` : 'toeic-stats-guest';
  const [stats, setStats] = useLocalStorage<ToeicStatsData>(storageKey, INITIAL_STATS);

  const recordAnswer = useCallback(
    (type: GrammarType, correct: boolean) => {
      setStats(prev => {
        const prevTypeStats = prev.accuracyByType[type];
        return {
          ...prev,
          totalSolved: prev.totalSolved + 1,
          accuracyByType: {
            ...prev.accuracyByType,
            [type]: {
              total: prevTypeStats.total + 1,
              correct: prevTypeStats.correct + (correct ? 1 : 0),
            },
          },
        };
      });
    },
    [setStats],
  );

  const estimated = estimateScore(stats.accuracyByType);

  const overallRate =
    stats.totalSolved > 0
      ? Object.values(stats.accuracyByType).reduce((sum, s) => sum + s.correct, 0) / stats.totalSolved
      : 0;

  return {
    totalSolved: stats.totalSolved,
    accuracyByType: stats.accuracyByType,
    estimatedScore: estimated,
    overallRate: Math.round(overallRate * 100),
    recordAnswer,
  } as const;
}
