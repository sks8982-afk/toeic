// Design Ref: §2.2.2 — "복습 N개 + 신규 N개" 세션 헤더
'use client';

interface SessionHeaderProps {
  readonly phase: 'review' | 'new' | 'complete';
  readonly reviewCount: number;
  readonly newCount: number;
  readonly currentIndex: number;
  readonly totalInPhase: number;
}

export function SessionHeader({ phase, reviewCount, newCount, currentIndex, totalInPhase }: SessionHeaderProps) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
      <div className="flex gap-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          ${phase === 'review' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
          <span>복습</span>
          <span className="font-bold">{reviewCount}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          ${phase === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
          <span>신규</span>
          <span className="font-bold">{newCount}</span>
        </div>
      </div>

      {phase !== 'complete' && (
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {totalInPhase}
        </span>
      )}
    </div>
  );
}
