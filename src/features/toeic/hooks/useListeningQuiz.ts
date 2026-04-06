// TOEIC 리스닝 퀴즈 — 프리페치 + 저장/이어풀기 + 미사용 문제 캐시
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import type { ListeningQuestion, ListeningDifficulty } from '@/types';

const STORAGE_KEY_SESSION = 'listening-session';
const STORAGE_KEY_CACHE = 'listening-cache';

interface ListeningSession {
  readonly difficulty: ListeningDifficulty;
  readonly currentQuestion: ListeningQuestion | null;
  readonly selectedAnswer: number | null;
  readonly showResult: boolean;
  readonly isCorrect: boolean | null;
  readonly totalSolved: number;
  readonly totalCorrect: number;
  readonly savedAt: number;
}

const INITIAL_SESSION: ListeningSession = {
  difficulty: 'medium',
  currentQuestion: null,
  selectedAnswer: null,
  showResult: false,
  isCorrect: null,
  totalSolved: 0,
  totalCorrect: 0,
  savedAt: 0,
};

export function useListeningQuiz() {
  const { user } = useAuth();
  const sessionKey = user ? `${STORAGE_KEY_SESSION}-${user.id}` : `${STORAGE_KEY_SESSION}-guest`;
  const cacheKey = user ? `${STORAGE_KEY_CACHE}-${user.id}` : `${STORAGE_KEY_CACHE}-guest`;

  const [session, setSession] = useLocalStorage<ListeningSession>(sessionKey, INITIAL_SESSION);
  const [cachedQuestions, setCachedQuestions] = useLocalStorage<ListeningQuestion[]>(cacheKey, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefetchingRef = useRef(false);

  // 캐시에서 문제 가져오기 (난이도 매칭)
  const popFromCache = useCallback((difficulty: ListeningDifficulty): ListeningQuestion | null => {
    const match = cachedQuestions.find(q => q.difficulty === difficulty);
    if (match) {
      setCachedQuestions(prev => prev.filter(q => q.id !== match.id));
      return match;
    }
    return null;
  }, [cachedQuestions, setCachedQuestions]);

  // API에서 문제 생성
  const fetchQuestion = useCallback(async (difficulty: ListeningDifficulty): Promise<ListeningQuestion | null> => {
    try {
      const res = await fetch('/api/toeic/listening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  // 다음 문제 프리페치 (백그라운드)
  const prefetchNext = useCallback(async (difficulty: ListeningDifficulty) => {
    if (prefetchingRef.current) return;
    // 캐시에 같은 난이도 문제가 이미 있으면 스킵
    if (cachedQuestions.some(q => q.difficulty === difficulty)) return;

    prefetchingRef.current = true;
    const question = await fetchQuestion(difficulty);
    if (question) {
      setCachedQuestions(prev => [...prev, question]);
    }
    prefetchingRef.current = false;
  }, [cachedQuestions, fetchQuestion, setCachedQuestions]);

  // 새 문제 시작 (캐시 우선 → API 폴백)
  const startQuestion = useCallback(async (difficulty: ListeningDifficulty) => {
    setError(null);
    setIsLoading(true);

    // 1. 캐시에서 가져오기
    const cached = popFromCache(difficulty);
    if (cached) {
      setSession(prev => ({
        ...prev,
        difficulty,
        currentQuestion: cached,
        selectedAnswer: null,
        showResult: false,
        isCorrect: null,
        savedAt: Date.now(),
      }));
      setIsLoading(false);
      // 다음 문제 프리페치
      prefetchNext(difficulty);
      return;
    }

    // 2. API에서 생성
    const question = await fetchQuestion(difficulty);
    if (question) {
      setSession(prev => ({
        ...prev,
        difficulty,
        currentQuestion: question,
        selectedAnswer: null,
        showResult: false,
        isCorrect: null,
        savedAt: Date.now(),
      }));
      // 다음 문제 프리페치
      prefetchNext(difficulty);
    } else {
      setError('문제 생성에 실패했습니다. 다시 시도해주세요.');
    }
    setIsLoading(false);
  }, [popFromCache, fetchQuestion, prefetchNext, setSession]);

  // 정답 선택
  const selectAnswer = useCallback((index: number) => {
    setSession(prev => {
      if (prev.showResult || !prev.currentQuestion) return prev;
      const isCorrect = index === prev.currentQuestion.correctIndex;
      return {
        ...prev,
        selectedAnswer: index,
        showResult: true,
        isCorrect,
        totalSolved: prev.totalSolved + 1,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        savedAt: Date.now(),
      };
    });
  }, [setSession]);

  // 다음 문제로 (새 문제 생성)
  const nextQuestion = useCallback(() => {
    startQuestion(session.difficulty);
  }, [session.difficulty, startQuestion]);

  // 세션 리셋
  const resetSession = useCallback(() => {
    setSession(INITIAL_SESSION);
  }, [setSession]);

  // 저장된 세션이 있고 문제가 풀리지 않았으면 이어하기
  const hasResumable = session.currentQuestion !== null && !session.showResult && session.savedAt > 0;

  return {
    ...session,
    isLoading,
    error,
    hasResumable,
    startQuestion,
    selectAnswer,
    nextQuestion,
    resetSession,
    cachedCount: cachedQuestions.length,
  } as const;
}
