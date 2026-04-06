// Design Ref: §7.5 — 하단 네비게이션 바 (모바일: 하단, 데스크톱: 좌측 사이드바)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/toeic', label: 'TOEIC', icon: '📝' },
  { href: '/speak', label: 'Speak', icon: '🎙️' },
  { href: '/ranking', label: '랭킹', icon: '🏆' },
  { href: '/profile', label: '프로필', icon: '👤' },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex flex-col items-center justify-center w-full h-full gap-0.5
              transition-colors duration-150
              ${isActive(item.href) ? 'text-blue-600' : 'text-gray-400'}
            `}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
