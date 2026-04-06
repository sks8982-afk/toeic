// Design Ref: §7.1 — 상단 프로그레스 바 (학습 진행률)
'use client';

interface ProgressBarProps {
  readonly value: number;    // 0 ~ max
  readonly max: number;
  readonly color?: 'blue' | 'green' | 'orange' | 'purple';
  readonly showLabel?: boolean;
  readonly size?: 'sm' | 'md';
}

const colorStyles = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
};

export function ProgressBar({
  value,
  max,
  color = 'blue',
  showLabel = false,
  size = 'md',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${size === 'sm' ? 'h-2' : 'h-3'}`}>
        <div
          className={`${colorStyles[color]} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-1 text-right">{value}/{max}</p>
      )}
    </div>
  );
}
