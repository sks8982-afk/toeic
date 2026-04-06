// Design Ref: §2.2.2 F-VOCAB-08 — Leitner Box 진행도 바 차트
'use client';

import type { LeitnerBox } from '@/types';

interface BoxProgressProps {
  readonly distribution: Record<LeitnerBox, number>;
  readonly total: number;
}

const BOX_LABELS = ['매일', '3일', '7일', '14일', '30일'] as const;
const BOX_COLORS = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-400'] as const;

export function BoxProgress({ distribution, total }: BoxProgressProps) {
  if (total === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        아직 학습한 단어가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {([1, 2, 3, 4, 5] as LeitnerBox[]).map((box, idx) => {
        const count = distribution[box];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <div key={box} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-10 shrink-0">
              Box {box}
            </span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${BOX_COLORS[idx]} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 w-16 text-right shrink-0">
              {count}개 ({BOX_LABELS[idx]})
            </span>
          </div>
        );
      })}
    </div>
  );
}
