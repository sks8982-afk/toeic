// 로그인 필수 페이지를 보호하는 가드
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/providers/AuthProvider';
import { LoadingSkeleton } from '@/shared/components/ui';

export function AuthGuard({ children }: { readonly children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSkeleton lines={3} />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
