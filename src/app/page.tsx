// 메인 화면 — TOEIC / Speak 선택 + 게이미피케이션
'use client';

import Link from 'next/link';
import { Card } from '@/shared/components/ui';
import { XPBar, StreakBadge, DailyQuests } from '@/features/gamification/components';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useToeicStats } from '@/features/toeic/hooks/useToeicStats';
import { useLeitnerBox } from '@/features/vocabulary/hooks/useLeitnerBox';

export default function Home() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.name ?? '사용자';
  const { totalSolved, estimatedScore } = useToeicStats();
  const { totalLearned } = useLeitnerBox();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* 헤더 — 인사 + 프로필 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">안녕하세요,</p>
          <h1 className="text-xl font-bold text-gray-900">{userName}님 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          <StreakBadge />
          <Link
            href="/profile"
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md hover:shadow-lg transition-shadow"
          >
            {userName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>

      {/* XP 바 */}
      <XPBar />

      {/* 오늘의 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <p className="text-xl font-bold text-blue-600">{estimatedScore || '-'}</p>
          <p className="text-[10px] text-gray-500">예상 점수</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <p className="text-xl font-bold text-green-600">{totalSolved}</p>
          <p className="text-[10px] text-gray-500">문제 풀이</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-xl">
          <p className="text-xl font-bold text-purple-600">{totalLearned}</p>
          <p className="text-[10px] text-gray-500">학습 단어</p>
        </div>
      </div>

      {/* 모드 선택 카드 */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">학습 모드</h2>

        {/* TOEIC 카드 */}
        <Link href="/toeic" className="block">
          <div className="relative overflow-hidden rounded-2xl border-2 border-blue-700 bg-gradient-to-r from-blue-500 to-blue-700 p-5 text-white shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shrink-0">
                📝
              </div>
              <div>
                <h2 className="text-lg font-bold">TOEIC</h2>
                <p className="text-sm text-blue-100 mt-0.5">
                  Part 5 문제풀이 + 단어 학습
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur rounded-full">
                AI 문제 생성
              </span>
              <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur rounded-full">
                오답 SRS
              </span>
              <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur rounded-full">
                단어장
              </span>
            </div>
            {/* 배경 장식 */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />
          </div>
        </Link>

        {/* Speak 카드 */}
        <Link href="/speak" className="block">
          <div className="relative overflow-hidden rounded-2xl border-2 border-purple-700 bg-gradient-to-r from-purple-500 to-pink-600 p-5 text-white shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shrink-0">
                🎙️
              </div>
              <div>
                <h2 className="text-lg font-bold">Speak</h2>
                <p className="text-sm text-purple-100 mt-0.5">
                  AI와 영어 대화 연습
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur rounded-full">
                음성 대화
              </span>
              <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur rounded-full">
                발음 피드백
              </span>
              <span className="text-xs px-2.5 py-1 bg-white/20 backdrop-blur rounded-full">
                시나리오
              </span>
            </div>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />
          </div>
        </Link>
      </div>

      {/* 데일리 퀘스트 */}
      <DailyQuests />

      {/* 랭킹 바로가기 */}
      <Link href="/ranking">
        <Card variant="interactive" padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">랭킹 확인하기</p>
                <p className="text-xs text-gray-500">다른 학습자들과 순위를 비교해보세요</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Card>
      </Link>
    </div>
  );
}
