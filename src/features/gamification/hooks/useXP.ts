// Design Ref: §2.4 F-GAME-01, F-GAME-02 — XP 획득 + 레벨 계산
'use client';

import { useState, useCallback, useRef } from 'react';
import { useProgress } from '@/shared/providers/ProgressProvider';
import { getLevelForXP, getXPProgress } from '../lib/xp-table';

export function useXP() {
  const { progress, updateProgress } = useProgress();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [lastXPGain, setLastXPGain] = useState(0);
  const pendingLevelUp = useRef(false);

  const level = getLevelForXP(progress.xp);
  const xpProgress = getXPProgress(progress.xp);

  const addXP = useCallback(
    (amount: number) => {
      setLastXPGain(amount);

      // 레벨업 판정을 updater 밖에서 수행 (렌더 중 setState 방지)
      const oldLevel = getLevelForXP(progress.xp);
      const newLevel = getLevelForXP(progress.xp + amount);
      pendingLevelUp.current = newLevel > oldLevel;

      updateProgress(prev => {
        const newXP = prev.xp + amount;
        return { ...prev, xp: newXP, level: getLevelForXP(newXP) };
      });

      // 다음 틱에서 레벨업 모달 표시
      if (pendingLevelUp.current) {
        setTimeout(() => setShowLevelUp(true), 0);
      }
    },
    [updateProgress, progress.xp],
  );

  const dismissLevelUp = useCallback(() => {
    setShowLevelUp(false);
  }, []);

  return {
    xp: progress.xp,
    level,
    xpProgress,
    lastXPGain,
    showLevelUp,
    addXP,
    dismissLevelUp,
  } as const;
}
