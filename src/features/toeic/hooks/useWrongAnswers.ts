// Design Ref: §2.2.1 F-TOEIC-07 — 오답 노트 (SRS 기반 재출제)
'use client';

import { useCallback } from 'react';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import { useAuth } from '@/shared/providers/AuthProvider';
import { addDays, format, isBefore } from 'date-fns';
import type { ToeicQuestion, WrongAnswer } from '@/types';

export function useWrongAnswers() {
  const { user } = useAuth();
  const storageKey = user ? `toeic-wrong-${user.id}` : 'toeic-wrong-guest';
  const [wrongAnswers, setWrongAnswers] = useLocalStorage<WrongAnswer[]>(
    storageKey,
    [],
  );

  const addWrongAnswer = useCallback(
    (question: ToeicQuestion) => {
      setWrongAnswers(prev => {
        // 이미 같은 문제가 있으면 업데이트
        const exists = prev.find(w => w.questionId === question.id);
        if (exists) {
          return prev.map(w =>
            w.questionId === question.id
              ? { ...w, reviewDue: format(addDays(new Date(), 1), 'yyyy-MM-dd'), interval: 1, reviewCount: w.reviewCount }
              : w,
          );
        }

        const newWrong: WrongAnswer = {
          questionId: question.id,
          question,
          wrongAt: new Date().toISOString(),
          reviewDue: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          reviewCount: 0,
          interval: 1,
        };
        return [...prev, newWrong];
      });
    },
    [setWrongAnswers],
  );

  const markReviewed = useCallback(
    (questionId: string, correct: boolean) => {
      setWrongAnswers(prev =>
        prev.map(w => {
          if (w.questionId !== questionId) return w;

          if (correct) {
            // 간격 확장: 1 → 3 → 7일
            const nextInterval = w.interval === 1 ? 3 : w.interval === 3 ? 7 : 7;
            return {
              ...w,
              reviewCount: w.reviewCount + 1,
              interval: nextInterval,
              reviewDue: format(addDays(new Date(), nextInterval), 'yyyy-MM-dd'),
            };
          }

          // 틀리면 다시 1일 후
          return {
            ...w,
            reviewCount: w.reviewCount + 1,
            interval: 1,
            reviewDue: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          };
        }),
      );
    },
    [setWrongAnswers],
  );

  const getDueReviews = useCallback((): WrongAnswer[] => {
    const today = new Date();
    return wrongAnswers.filter(w =>
      isBefore(new Date(w.reviewDue), addDays(today, 1)),
    );
  }, [wrongAnswers]);

  const removeResolved = useCallback(
    (questionId: string) => {
      setWrongAnswers(prev => prev.filter(w => w.questionId !== questionId));
    },
    [setWrongAnswers],
  );

  return {
    wrongAnswers,
    dueReviews: getDueReviews(),
    addWrongAnswer,
    markReviewed,
    removeResolved,
    totalCount: wrongAnswers.length,
  } as const;
}
