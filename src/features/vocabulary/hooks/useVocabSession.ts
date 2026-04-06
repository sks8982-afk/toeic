// Design Ref: §2.2.2 F-VOCAB-02 — 일일 학습 세션 관리
'use client';

import { useState, useCallback, useMemo } from 'react';
import { buildDailySession } from '../lib/leitner-engine';
import type { VocabWord, VocabProgress } from '@/types';

type SessionPhase = 'review' | 'new' | 'complete';
type QuizType = 'flashcard' | 'en-to-kr' | 'kr-to-en' | 'fill-blank' | 'listening';

interface SessionState {
  readonly phase: SessionPhase;
  readonly currentIndex: number;
  readonly quizType: QuizType;
  readonly reviewedCount: number;
  readonly newLearnedCount: number;
}

export function useVocabSession(
  allProgress: VocabProgress[],
  allWords: VocabWord[],
  dailyTarget: number,
) {
  const wordMap = useMemo(() => {
    const map = new Map<string, VocabWord>();
    for (const w of allWords) map.set(w.id, w);
    return map;
  }, [allWords]);

  const session = useMemo(
    () => buildDailySession(allProgress, allWords.map(w => w.id), dailyTarget),
    [allProgress, allWords, dailyTarget],
  );

  const [state, setState] = useState<SessionState>({
    phase: session.reviews.length > 0 ? 'review' : 'new',
    currentIndex: 0,
    quizType: 'flashcard',
    reviewedCount: 0,
    newLearnedCount: 0,
  });

  const currentItems = state.phase === 'review'
    ? session.reviews.map(r => wordMap.get(r.wordId)).filter(Boolean) as VocabWord[]
    : session.newWordIds.map(id => wordMap.get(id)).filter(Boolean) as VocabWord[];

  const currentWord = currentItems[state.currentIndex] ?? null;
  const totalInPhase = currentItems.length;

  const nextWord = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentIndex + 1;
      const isReview = prev.phase === 'review';

      // 현재 phase 아이템이 남아있으면 다음으로
      if (nextIndex < (isReview ? session.reviews.length : session.newWordIds.length)) {
        const quizTypes: QuizType[] = ['flashcard', 'en-to-kr', 'kr-to-en', 'fill-blank'];
        const randomQuiz = quizTypes[Math.floor(Math.random() * quizTypes.length)];
        return { ...prev, currentIndex: nextIndex, quizType: randomQuiz };
      }

      // 복습 끝 → 신규로
      if (isReview && session.newWordIds.length > 0) {
        return {
          ...prev,
          phase: 'new' as SessionPhase,
          currentIndex: 0,
          quizType: 'flashcard',
          reviewedCount: session.reviews.length,
        };
      }

      // 모두 완료
      return {
        ...prev,
        phase: 'complete' as SessionPhase,
        reviewedCount: isReview ? session.reviews.length : prev.reviewedCount,
        newLearnedCount: session.newWordIds.length,
      };
    });
  }, [session]);

  return {
    ...state,
    currentWord,
    totalInPhase,
    reviewCount: session.reviews.length,
    newCount: session.newWordIds.length,
    stuckCount: session.stuckWords.length,
    nextWord,
  } as const;
}
