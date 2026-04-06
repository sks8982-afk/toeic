// Design Ref: §6.1 — 학습 진행 Context Provider + Supabase 동기화
'use client';

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useUserProgress } from '@/shared/hooks/useUserProgress';
import { useAuth } from '@/shared/providers/AuthProvider';
import { syncProgressToSupabase } from '@/shared/lib/sync-progress';
import { type UserProgress, DEFAULT_USER_PROGRESS } from '@/types';

interface ProgressContextValue {
  readonly progress: UserProgress;
  readonly updateProgress: (updater: (prev: UserProgress) => UserProgress) => void;
  readonly resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue>({
  progress: DEFAULT_USER_PROGRESS,
  updateProgress: () => {},
  resetProgress: () => {},
});

export function ProgressProvider({ children }: { readonly children: ReactNode }) {
  const { progress, updateProgress, resetProgress } = useUserProgress();
  const { user } = useAuth();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // XP/레벨 변경 시 Supabase에 디바운스 동기화 (5초)
  useEffect(() => {
    if (!user) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const name = user.user_metadata?.name ?? '사용자';
      syncProgressToSupabase(user.id, progress.xp, progress.level, progress.streak, name);
    }, 5000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [progress.xp, progress.level, progress.streak, user]);

  return (
    <ProgressContext.Provider value={{ progress, updateProgress, resetProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  return useContext(ProgressContext);
}
