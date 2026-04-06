// Design Ref: §7.2 — 정답 시 +XP 팝업 애니메이션 (떠오르는 숫자)
'use client';

import { useEffect, useState } from 'react';

interface XPPopupProps {
  readonly amount: number;
  readonly show: boolean;
  readonly onDone?: () => void;
}

export function XPPopup({ amount, show, onDone }: XPPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show || amount === 0) return;

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1200);

    return () => clearTimeout(timer);
  }, [show, amount, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="animate-float-up text-3xl font-bold text-yellow-500 drop-shadow-lg">
        +{amount} XP
      </div>
    </div>
  );
}
