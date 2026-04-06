// Speak 대화 종합 리포트
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, Button, ProgressBar, LoadingSkeleton } from '@/shared/components/ui';

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pronunciation = Number(searchParams.get('pronunciation') ?? '0');
  const grammar = Number(searchParams.get('grammar') ?? '0');
  const turns = Number(searchParams.get('turns') ?? '0');
  const scenario = searchParams.get('scenario') ?? '자유 대화';

  const overall = Math.round((pronunciation + grammar) / 2);

  function getRating(score: number): { label: string; color: string; emoji: string } {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', emoji: '🌟' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', emoji: '👍' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600', emoji: '📚' };
    return { label: 'Keep Trying', color: 'text-orange-600', emoji: '💪' };
  }

  const rating = getRating(overall);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/speak')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">대화 리포트</h1>
      </div>

      {/* 종합 평가 */}
      <Card padding="lg" className="text-center">
        <p className="text-5xl mb-2">{rating.emoji}</p>
        <p className={`text-2xl font-bold ${rating.color}`}>{rating.label}</p>
        <p className="text-sm text-gray-500 mt-1">{scenario}</p>
        <p className="text-4xl font-bold text-gray-900 mt-3">{overall}</p>
        <p className="text-xs text-gray-400">종합 점수</p>
      </Card>

      {/* 세부 점수 */}
      <Card padding="lg">
        <h3 className="font-bold text-gray-900 mb-4">세부 평가</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">발음 정확도</span>
              <span className="text-sm font-bold text-gray-900">{pronunciation}점</span>
            </div>
            <ProgressBar value={pronunciation} max={100} color="blue" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">문법 정확도</span>
              <span className="text-sm font-bold text-gray-900">{grammar}점</span>
            </div>
            <ProgressBar value={grammar} max={100} color="green" />
          </div>
        </div>
      </Card>

      {/* 대화 통계 */}
      <Card padding="md">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-gray-900">{turns}</p>
            <p className="text-xs text-gray-500">대화 턴</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-600">{pronunciation}</p>
            <p className="text-xs text-gray-500">발음 점수</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{grammar}</p>
            <p className="text-xs text-gray-500">문법 점수</p>
          </div>
        </div>
      </Card>

      {/* 버튼 */}
      <div className="space-y-3">
        <Button onClick={() => router.push('/speak')} fullWidth size="lg">
          다른 대화 시작하기
        </Button>
        <Button onClick={() => router.push('/')} fullWidth size="lg" variant="secondary">
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
}

export default function SpeakReportPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={5} />}>
      <ReportContent />
    </Suspense>
  );
}
