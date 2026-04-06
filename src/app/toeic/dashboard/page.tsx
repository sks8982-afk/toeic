// TOEIC 학습 대시보드 — 유형별 히트맵 + 예상 점수 + 통계
'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/shared/components/ui';
import { useToeicStats } from '@/features/toeic/hooks/useToeicStats';
import { useWrongAnswers } from '@/features/toeic/hooks/useWrongAnswers';
import type { GrammarType } from '@/types';

const TYPE_LABELS: Record<GrammarType, string> = {
  pos: '품사',
  tense: '시제',
  agreement: '수일치',
  relative: '관계사',
  preposition: '전치사',
  conjunction: '접속사',
  vocabulary: '어휘',
};

function getHeatColor(rate: number): string {
  if (rate >= 80) return 'bg-green-500 text-white';
  if (rate >= 60) return 'bg-green-300 text-green-900';
  if (rate >= 40) return 'bg-yellow-300 text-yellow-900';
  if (rate >= 20) return 'bg-orange-300 text-orange-900';
  if (rate > 0) return 'bg-red-400 text-white';
  return 'bg-gray-100 text-gray-400';
}

export default function ToeicDashboardPage() {
  const router = useRouter();
  const { totalSolved, estimatedScore, overallRate, accuracyByType } = useToeicStats();
  const { wrongAnswers, dueReviews } = useWrongAnswers();

  const types = Object.entries(TYPE_LABELS) as [GrammarType, string][];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/toeic')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">학습 대시보드</h1>
      </div>

      {/* 예상 점수 대형 카드 */}
      <Card padding="lg" className="text-center">
        <p className="text-sm text-gray-500 mb-1">TOEIC 예상 점수</p>
        <p className="text-5xl font-bold text-blue-600">{estimatedScore || '-'}</p>
        <p className="text-xs text-gray-400 mt-2">총 {totalSolved}문제 풀이 · 정답률 {overallRate}%</p>
      </Card>

      {/* 유형별 히트맵 */}
      <Card padding="lg">
        <h3 className="font-bold text-gray-900 mb-4">유형별 정답률</h3>
        <div className="grid grid-cols-2 gap-3">
          {types.map(([type, label]) => {
            const stats = accuracyByType[type];
            const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
            const color = getHeatColor(rate);

            return (
              <div
                key={type}
                className={`p-4 rounded-xl text-center ${color} transition-all`}
              >
                <p className="text-2xl font-bold">{stats.total > 0 ? `${rate}%` : '-'}</p>
                <p className="text-xs font-medium mt-1">{label}</p>
                <p className="text-[10px] opacity-70 mt-0.5">
                  {stats.correct}/{stats.total}문제
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center">
          초록 = 80%+ · 노랑 = 40~60% · 빨강 = 20% 미만
        </p>
      </Card>

      {/* 오답 노트 요약 */}
      <Card padding="lg">
        <h3 className="font-bold text-gray-900 mb-3">오답 노트</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">{wrongAnswers.length}</p>
            <p className="text-xs text-gray-500">총 오답</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <p className="text-2xl font-bold text-orange-600">{dueReviews.length}</p>
            <p className="text-xs text-gray-500">오늘 복습 대상</p>
          </div>
        </div>
      </Card>

      {/* 추천 */}
      {totalSolved > 0 && (
        <Card padding="md" className="bg-blue-50 border-blue-200">
          <p className="text-sm font-semibold text-blue-900 mb-1">AI 추천</p>
          <p className="text-xs text-blue-700">
            {(() => {
              const weakest = types
                .filter(([t]) => accuracyByType[t].total > 0)
                .sort(([a], [b]) => {
                  const rA = accuracyByType[a].correct / accuracyByType[a].total;
                  const rB = accuracyByType[b].correct / accuracyByType[b].total;
                  return rA - rB;
                })[0];
              if (!weakest) return '더 많은 문제를 풀어보세요!';
              return `"${weakest[1]}" 유형이 가장 약합니다. 집중 연습을 추천합니다.`;
            })()}
          </p>
        </Card>
      )}
    </div>
  );
}
