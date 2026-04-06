// 학습 진행 Context Provider — Supabase 양방향 동기화
'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useUserProgress } from '@/shared/hooks/useUserProgress';
import { useAuth } from '@/shared/providers/AuthProvider';
import { syncProgressToSupabase, loadProgressFromSupabase } from '@/shared/lib/sync-progress';
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
  const [loaded, setLoaded] = useState(false);

  // 로그인 시 Supabase에서 데이터 로드 (LocalStorage보다 DB 우선)
  useEffect(() => {
    if (!user || loaded) return;

    loadProgressFromSupabase(user.id).then(remote => {
      if (!remote) {
        setLoaded(true);
        return;
      }

      // DB의 XP가 로컬보다 높으면 DB 데이터로 덮어쓰기
      // 로컬이 더 높으면 로컬 유지 (오프라인 학습 보존)
      updateProgress(local => {
        if (remote.xp > local.xp) {
          return {
            ...local,
            xp: remote.xp,
            level: remote.level,
            streak: remote.streak,
            lastStudyDate: remote.lastStudyDate || local.lastStudyDate,
          };
        }
        return local;
      });

      setLoaded(true);
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // XP/레벨 변경 시 Supabase에 디바운스 동기화 (3초)
  useEffect(() => {
    if (!user || !loaded) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const name = user.user_metadata?.name ?? '사용자';
      syncProgressToSupabase(user.id, progress.xp, progress.level, progress.streak, name);
    }, 3000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [progress.xp, progress.level, progress.streak, user, loaded]);

  return (
    <ProgressContext.Provider value={{ progress, updateProgress, resetProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  return useContext(ProgressContext);
}
