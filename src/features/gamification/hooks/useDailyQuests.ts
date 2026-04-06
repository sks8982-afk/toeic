// Design Ref: §2.4 F-GAME-04 — 데일리 퀘스트 상태 관리
'use client';

import { useMemo } from 'react';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import { useAuth } from '@/shared/providers/AuthProvider';
import { format } from 'date-fns';
import { getTodayQuests } from '../lib/quest-definitions';
import type { DailyQuest } from '@/types';

interface DailyQuestState {
  readonly date: string;
  readonly quests: DailyQuest[];
}

export function useDailyQuests() {
  const { user } = useAuth();
  const storageKey = user ? `quests-${user.id}` : 'quests-guest';
  const today = format(new Date(), 'yyyy-MM-dd');

  const [state, setState] = useLocalStorage<DailyQuestState>(storageKey, {
    date: '',
    quests: [],
  });

  // 날짜가 바뀌면 퀘스트 리셋
  const quests = useMemo(() => {
    if (state.date === today) return state.quests;

    const definitions = getTodayQuests();
    const newQuests: DailyQuest[] = definitions.map(def => ({
      id: def.id,
      description: def.description,
      target: def.target,
      current: 0,
      xpReward: def.xpReward,
      completed: false,
    }));

    setState({ date: today, quests: newQuests });
    return newQuests;
  }, [state, today, setState]);

  const updateQuestProgress = (questId: string, increment: number) => {
    setState(prev => ({
      ...prev,
      quests: prev.quests.map(q => {
        if (q.id !== questId) return q;
        const newCurrent = Math.min(q.current + increment, q.target);
        return {
          ...q,
          current: newCurrent,
          completed: newCurrent >= q.target,
        };
      }),
    }));
  };

  const completedCount = quests.filter(q => q.completed).length;
  const totalCount = quests.length;

  return { quests, updateQuestProgress, completedCount, totalCount } as const;
}
