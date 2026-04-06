// Design Ref: §2.2 — TOEIC 메인 화면 (유형 선택 + 오답 노트 + 통계)
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/shared/components/ui';
import { TypeSelector } from '@/features/toeic/components';
import { useToeicStats } from '@/features/toeic/hooks/useToeicStats';
import { useWrongAnswers } from '@/features/toeic/hooks/useWrongAnswers';
import { XPBar } from '@/features/gamification/components';
import { StreakBadge } from '@/features/gamification/components';
import type { GrammarType } from '@/types';

export default function ToeicPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<GrammarType | null>(null);
  const { totalSolved, estimatedScore, overallRate, accuracyByType } = useToeicStats();
  const { dueReviews, wrongAnswers } = useWrongAnswers();

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">TOEIC</h1>
        </div>
        <div className="flex items-center gap-2">
          <StreakBadge />
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600"
          >
            👤
          </Link>
        </div>
      </div>

      {/* XP 바 */}
      <XPBar />

      {/* 예상 점수 + 통계 카드 (클릭하면 대시보드) */}
      <Link href="/toeic/dashboard">
      <Card variant="interactive" padding="lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600">{estimatedScore}</p>
            <p className="text-xs text-gray-500 mt-1">예상 점수</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{totalSolved}</p>
            <p className="text-xs text-gray-500 mt-1">풀이 수</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">{overallRate}%</p>
            <p className="text-xs text-gray-500 mt-1">정답률</p>
          </div>
        </div>
      </Card>
      </Link>

      {/* 오답 복습 알림 */}
      {dueReviews.length > 0 && (
        <Card variant="highlight" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">오답 복습</p>
              <p className="text-sm text-blue-700">
                오늘 복습할 문제가 {dueReviews.length}개 있습니다
              </p>
            </div>
            <Link href="/toeic/quiz?mode=review">
              <Button size="sm">복습하기</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* 유형 선택 */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">문제 유형 선택</h2>
        <TypeSelector
          selected={selectedType}
          onSelect={setSelectedType}
          accuracyByType={accuracyByType}
        />
      </div>

      {/* 시작 버튼 */}
      <div className="space-y-3">
        <Link
          href={selectedType ? `/toeic/quiz?type=${selectedType}` : '/toeic/quiz'}
        >
          <Button fullWidth size="lg">
            {selectedType ? `${selectedType} 문제 풀기` : '랜덤 문제 풀기'}
          </Button>
        </Link>

        <Link href="/toeic/vocabulary">
          <Button fullWidth size="lg" variant="secondary">
            📚 단어 학습
          </Button>
        </Link>

        <Link href="/toeic/wrong-notes">
          <Button fullWidth size="lg" variant="secondary">
            📋 오답 노트 ({wrongAnswers.length}개)
          </Button>
        </Link>
      </div>
    </div>
  );
}
