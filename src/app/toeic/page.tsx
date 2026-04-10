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

      {/* 오답 복습 알림 — 통계 카드와 간격 추가 확보 */}
      {dueReviews.length > 0 && (
        <Card variant="highlight" padding="md" className="mt-2">
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

      {/* 시작 버튼 — 버튼마다 명확한 간격 + 테두리로 구분감 */}
      <div className="flex flex-col gap-4">
        {/* 모의고사 */}
        <Link href="/toeic/mock-exam" className="block">
          <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-700 bg-gradient-to-r from-indigo-500 to-blue-600 p-5 text-white shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📋</span>
              <div>
                <p className="font-bold">TOEIC 모의고사</p>
                <p className="text-xs text-indigo-100">리스닝 + 리딩 시험 모드</p>
              </div>
            </div>
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
          </div>
        </Link>

        <Link
          href={selectedType ? `/toeic/quiz?type=${selectedType}` : '/toeic/quiz'}
          className="block"
        >
          <Button
            fullWidth
            size="lg"
            className="border-2 border-blue-700 shadow-md hover:shadow-lg"
          >
            {selectedType ? `${selectedType} 문제 풀기` : '랜덤 문제 풀기'}
          </Button>
        </Link>

        <Link href="/toeic/listening" className="block">
          <Button
            fullWidth
            size="lg"
            variant="secondary"
            className="border-2 border-gray-300 shadow-sm hover:shadow-md"
          >
            🎧 리스닝 문제풀기
          </Button>
        </Link>

        <Link href="/toeic/vocabulary" className="block">
          <Button
            fullWidth
            size="lg"
            variant="secondary"
            className="border-2 border-gray-300 shadow-sm hover:shadow-md"
          >
            📚 단어 학습
          </Button>
        </Link>

        <Link href="/toeic/wrong-notes" className="block">
          <Button
            fullWidth
            size="lg"
            variant="secondary"
            className="border-2 border-gray-300 shadow-sm hover:shadow-md"
          >
            📋 오답 노트 ({wrongAnswers.length}개)
          </Button>
        </Link>
      </div>
    </div>
  );
}
