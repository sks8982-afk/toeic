// Design Ref: §2.2.2 F-VOCAB-05 — Leitner Box SRS 상태 관리
'use client';

import { useCallback } from 'react';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  promoteWord,
  demoteWord,
  keepWord,
  createNewProgress,
  getBoxDistribution,
} from '../lib/leitner-engine';
import type { VocabProgress } from '@/types';

export function useLeitnerBox() {
  const { user } = useAuth();
  const storageKey = user ? `vocab-leitner-${user.id}` : 'vocab-leitner-guest';
  const [allProgress, setAllProgress] = useLocalStorage<VocabProgress[]>(
    storageKey,
    [],
  );

  const getProgress = useCallback(
    (wordId: string): VocabProgress | undefined => {
      return allProgress.find(p => p.wordId === wordId);
    },
    [allProgress],
  );

  const initWord = useCallback(
    (wordId: string) => {
      setAllProgress(prev => {
        if (prev.find(p => p.wordId === wordId)) return prev;
        return [...prev, createNewProgress(wordId)];
      });
    },
    [setAllProgress],
  );

  const promote = useCallback(
    (wordId: string) => {
      setAllProgress(prev =>
        prev.map(p => (p.wordId === wordId ? promoteWord(p) : p)),
      );
    },
    [setAllProgress],
  );

  const demote = useCallback(
    (wordId: string) => {
      setAllProgress(prev =>
        prev.map(p => (p.wordId === wordId ? demoteWord(p) : p)),
      );
    },
    [setAllProgress],
  );

  const keep = useCallback(
    (wordId: string) => {
      setAllProgress(prev =>
        prev.map(p => (p.wordId === wordId ? keepWord(p) : p)),
      );
    },
    [setAllProgress],
  );

  const boxDistribution = getBoxDistribution(allProgress);
  const totalLearned = allProgress.length;
  const graduated = allProgress.filter(p => p.box === 5 && p.correctStreak >= 4).length;

  return {
    allProgress,
    getProgress,
    initWord,
    promote,
    demote,
    keep,
    boxDistribution,
    totalLearned,
    graduated,
  } as const;
}
