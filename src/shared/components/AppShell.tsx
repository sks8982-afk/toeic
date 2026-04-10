// 앱 쉘 — 인증 페이지에서는 BottomNav 숨김
'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/shared/components/ui';
import { AuthGuard } from './AuthGuard';
import { UpdateChecker } from './UpdateChecker';
import type { ReactNode } from 'react';

const PUBLIC_PATHS = ['/auth/login', '/auth/signup'];

export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
      <UpdateChecker />
    </AuthGuard>
  );
}
