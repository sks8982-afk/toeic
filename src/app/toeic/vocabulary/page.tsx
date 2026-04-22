// 단어 학습 — DB 추천 API 기반 순차 소비
// 절대 규칙: 확인한 단어는 미확인 단어보다 우선순위가 높지 않음.
// 세션 내에서도 같은 단어가 재등장하지 않도록 순차 소비 + 중복 가드.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/shared/components/ui';
import { Flashcard } from '@/features/vocabulary/components';
import { useXP } from '@/features/gamification/hooks/useXP';
import { useStreak } from '@/features/gamification/hooks/useStreak';
import { useAuth } from '@/shared/providers/AuthProvider';
import { logVocabStudy, updateDailySummary } from '@/shared/lib/activity-logger';
import { XP_REWARDS } from '@/features/gamification/lib/xp-table';
import { XPPopup } from '@/features/gamification/components';
import type { VocabWord } from '@/types';

const SESSION_FETCH_COUNT = 20; // 한 번에 받아오는 단어 수
const DAILY_TARGET = 30;        // 오늘 학습 목표

export default function VocabularyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addXP, lastXPGain } = useXP();
  const { recordStudy } = useStreak();

  // 현재 세션에서 본 단어 목록 (중복 가드용) — id + 정규화된 단어
  const seenIdsRef = useRef<Set<string>>(new Set());
  const seenWordsRef = useRef<Set<string>>(new Set());
  const sessionStats = useRef({ total: 0, correct: 0 });

  const [queue, setQueue] = useState<VocabWord[]>([]); // 아직 안 본 대기 큐
  const [current, setCurrent] = useState<VocabWord | null>(null);
  const [learnedToday, setLearnedToday] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const fetchMore = useCallback(async () => {
    if (!user || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/vocabulary/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, count: SESSION_FETCH_COUNT }),
      });
      const data = (await res.json()) as { readonly words?: readonly VocabWord[] };
      const incoming = data.words ?? [];

      // 세션 내 이미 본 것 제외 (ID / 단어 정규화 둘 다 체크)
      const filtered: VocabWord[] = [];
      for (const w of incoming) {
        const key = (w.word ?? '').trim().toLowerCase();
        if (!key) continue;
        if (seenIdsRef.current.has(w.id)) continue;
        if (seenWordsRef.current.has(key)) continue;
        seenIdsRef.current.add(w.id);
        seenWordsRef.current.add(key);
        filtered.push(w);
      }

      setQueue(prev => [...prev, ...filtered]);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '단어를 불러오지 못했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading]);

  // 첫 로드: 큐 채우기 + 현재 단어 세팅
  useEffect(() => {
    if (!user) return;
    if (current) return;
    if (queue.length === 0) {
      fetchMore();
      return;
    }
    // 큐에서 첫 항목 꺼내기
    const [first, ...rest] = queue;
    setCurrent(first);
    setQueue(rest);
  }, [user, queue, current, fetchMore]);

  // 학습 기록 (DB)
  const recordKnown = useCallback(
    async (wordId: string) => {
      if (!user) return;
      try {
        await fetch('/api/vocabulary/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, wordId, action: 'know' }),
        });
      } catch {
        /* 네트워크 실패는 조용히 무시 */
      }
    },
    [user],
  );

  const handleNext = useCallback(() => {
    if (!current) return;

    // DB 기록: 한 번 봤음 = know
    recordKnown(current.id);
    addXP(XP_REWARDS.VOCAB_CORRECT);
    sessionStats.current.total++;
    sessionStats.current.correct++;

    if (user) {
      logVocabStudy(user.id, current.id, current.word, 'know', 1, 2);
      updateDailySummary(user.id, 'vocab_learned');
    }
    recordStudy();

    const nextLearned = learnedToday + 1;
    setLearnedToday(nextLearned);

    // 일일 목표 달성 시 완료
    if (nextLearned >= DAILY_TARGET) {
      setCurrent(null);
      setCompleted(true);
      return;
    }

    // 큐에서 다음 꺼내기
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
    } else {
      // 큐 비었으면 현재 카드 비우고 재fetch 유도
      setCurrent(null);
      fetchMore();
    }
  }, [current, queue, learnedToday, recordKnown, addXP, recordStudy, user, fetchMore]);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/toeic')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
            aria-label="뒤로"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">단어 학습</h1>
        </div>
        <button
          onClick={() => router.push('/toeic/vocabulary/test')}
          className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 hover:bg-blue-100"
        >
          📝 단어 테스트
        </button>
      </div>

      {/* 진행 요약 */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">오늘 학습</p>
            <p className="text-2xl font-bold text-blue-600">
              {learnedToday}
              <span className="text-sm font-normal text-gray-400"> / {DAILY_TARGET}</span>
            </p>
          </div>
          <div className="w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(100, (learnedToday / DAILY_TARGET) * 100)}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 완료 화면 */}
      {completed && (
        <div className="text-center py-8 space-y-5">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">오늘 학습 완료!</h2>
          <Card padding="md">
            <p className="text-3xl font-bold text-blue-600">{sessionStats.current.correct}</p>
            <p className="text-xs text-gray-500 mt-1">이번 세션에서 본 단어</p>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push('/toeic/vocabulary/test')}
              size="lg"
              fullWidth
            >
              테스트
            </Button>
            <Button onClick={() => router.push('/toeic')} size="lg" fullWidth>
              돌아가기
            </Button>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {!completed && !current && isLoading && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">단어를 불러오는 중...</p>
        </div>
      )}

      {/* 에러 */}
      {!completed && !current && !isLoading && errorMsg && (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl">😵</p>
          <p className="text-sm text-red-600">{errorMsg}</p>
          <Button onClick={fetchMore} variant="secondary">
            다시 시도
          </Button>
        </div>
      )}

      {/* 단어가 더 없음 */}
      {!completed && !current && !isLoading && !errorMsg && queue.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl">📭</p>
          <p className="text-sm text-gray-500">더 이상 학습할 단어가 없습니다</p>
          <Button onClick={() => router.push('/toeic')} variant="secondary">
            돌아가기
          </Button>
        </div>
      )}

      {/* 학습 카드 */}
      {!completed && current && <Flashcard word={current} onNext={handleNext} />}

      {/* XP 팝업 */}
      <XPPopup amount={lastXPGain} show={lastXPGain > 0} />
    </div>
  );
}
