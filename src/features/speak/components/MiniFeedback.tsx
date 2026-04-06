// Design Ref: §2.3.2 F-FEED-05 — 실시간 미니 피드백 (Great/Good/Try Again)
'use client';

import { useEffect, useState } from 'react';
import type { OverallRating } from '@/types';

interface MiniFeedbackProps {
  readonly rating: OverallRating | null;
}

const RATING_CONFIG = {
  great: { emoji: '🌟', text: 'Great!', bg: 'bg-green-100 text-green-700' },
  good: { emoji: '👍', text: 'Good', bg: 'bg-blue-100 text-blue-700' },
  try_again: { emoji: '💪', text: 'Try Again', bg: 'bg-orange-100 text-orange-700' },
} as const;

export function MiniFeedback({ rating }: MiniFeedbackProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!rating) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [rating]);

  if (!visible || !rating) return null;

  const config = RATING_CONFIG[rating];

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div className={`px-4 py-2 rounded-full font-semibold text-sm ${config.bg} shadow-lg`}>
        {config.emoji} {config.text}
      </div>
    </div>
  );
}
