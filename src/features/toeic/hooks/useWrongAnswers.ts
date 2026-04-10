// Design Ref: §2.2.1 F-TOEIC-07 — 오답 노트 (SRS 기반 재출제)
'use client';

import { useCallback } from 'react';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import { useAuth } from '@/shared/providers/AuthProvider';
import { addDays, format, isBefore } from 'date-fns';
import type { ToeicQuestion, WrongAnswer } from '@/types';

/** 문장 정규화 — 공백/대소문자 차이로 같은 문제가 중복 저장되지 않게 */
function normalizeSentence(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

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
        // 중복 판정: questionId 우선, 없으면 문장 내용까지 (ID가 달라도 같은 문장이면 같은 문제)
        const normalizedNew = normalizeSentence(question.sentence);
        const exists = prev.find(
          w =>
            w.questionId === question.id ||
            normalizeSentence(w.question.sentence) === normalizedNew,
        );
        if (exists) {
          // 기존 항목의 SRS 진행 상태는 유지 (오답 재등록으로 간격이 초기화되지 않도록)
          // 단, 아직 오늘 복습 대상이 아니었다면 오늘로 당겨옴
          return prev.map(w =>
            w === exists
              ? {
                  ...w,
                  reviewDue: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
                }
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
      setWrongAnswers(prev => {
        const result: WrongAnswer[] = [];
        for (const w of prev) {
          if (w.questionId !== questionId) {
            result.push(w);
            continue;
          }

          if (correct) {
            // SRS 완료 조건: 이미 7일 간격까지 도달한 문제를 또 맞히면 "완전 숙지"로 간주하고 제거.
            // 1 → 3 → 7 → (다음 번엔 삭제)
            if (w.interval >= 7) {
              continue; // 배열에서 제외 (= 오답노트에서 삭제)
            }
            const nextInterval = w.interval === 1 ? 3 : 7;
            result.push({
              ...w,
              reviewCount: w.reviewCount + 1,
              interval: nextInterval,
              reviewDue: format(addDays(new Date(), nextInterval), 'yyyy-MM-dd'),
            });
            continue;
          }

          // 틀리면 다시 1일 후
          result.push({
            ...w,
            reviewCount: w.reviewCount + 1,
            interval: 1,
            reviewDue: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          });
        }
        return result;
      });
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
