// Design Ref: §7.2 — 레벨 + XP 바 (눈에 띄는 디자인)
'use client';

import { ProgressBar } from '@/shared/components/ui';
import { useXP } from '../hooks/useXP';

const LEVEL_COLORS = [
  'from-gray-400 to-gray-500',     // 1-5
  'from-green-400 to-green-600',    // 6-10
  'from-blue-400 to-blue-600',      // 11-15
  'from-purple-400 to-purple-600',  // 16-20
  'from-orange-400 to-orange-600',  // 21-30
  'from-red-400 to-red-600',        // 31-40
  'from-yellow-400 to-yellow-600',  // 41-50
] as const;

function getLevelColor(level: number): string {
  if (level <= 5) return LEVEL_COLORS[0];
  if (level <= 10) return LEVEL_COLORS[1];
  if (level <= 15) return LEVEL_COLORS[2];
  if (level <= 20) return LEVEL_COLORS[3];
  if (level <= 30) return LEVEL_COLORS[4];
  if (level <= 40) return LEVEL_COLORS[5];
  return LEVEL_COLORS[6];
}

function getLevelTitle(level: number): string {
  if (level <= 5) return 'Starter';
  if (level <= 10) return 'Learner';
  if (level <= 15) return 'Explorer';
  if (level <= 20) return 'Achiever';
  if (level <= 30) return 'Expert';
  if (level <= 40) return 'Master';
  return 'Legend';
}

export function XPBar() {
  const { level, xp, xpProgress } = useXP();
  const gradient = getLevelColor(level);
  const title = getLevelTitle(level);

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-200 shadow-sm">
      {/* 레벨 뱃지 */}
      <div className={`
        w-12 h-12 rounded-xl bg-gradient-to-br ${gradient}
        flex flex-col items-center justify-center text-white shadow-md shrink-0
      `}>
        <span className="text-lg font-bold leading-none">{level}</span>
        <span className="text-[8px] font-medium opacity-80">LV</span>
      </div>

      {/* XP 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-700">{title}</span>
          <span className="text-[10px] text-gray-400">{xp} XP</span>
        </div>
        <ProgressBar
          value={xpProgress.current}
          max={xpProgress.needed || 1}
          color="purple"
          size="sm"
        />
        <p className="text-[10px] text-gray-400 mt-0.5 text-right">
          다음 레벨까지 {Math.max(0, xpProgress.needed - xpProgress.current)} XP
        </p>
      </div>
    </div>
  );
}
