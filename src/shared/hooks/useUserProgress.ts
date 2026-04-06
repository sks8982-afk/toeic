// Design Ref: §6.1 — 전체 학습 진행 상태 관리 (유저별 LocalStorage)
'use client';

import { useLocalStorage } from './useLocalStorage';
import { useAuth } from '@/shared/providers/AuthProvider';
import { type UserProgress, DEFAULT_USER_PROGRESS } from '@/types';

export function useUserProgress() {
  const { user } = useAuth();
  const storageKey = user ? `progress-${user.id}` : 'progress-guest';

  const [progress, setProgress, resetProgress] = useLocalStorage<UserProgress>(
    storageKey,
    DEFAULT_USER_PROGRESS,
  );

  const updateProgress = (updater: (prev: UserProgress) => UserProgress) => {
    setProgress(updater);
  };

  return { progress, updateProgress, resetProgress } as const;
}
