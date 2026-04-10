// Design Ref: §2.2.1 — TOEIC 퀴즈 세션 관리 (프리셋 우선 + AI 생성 폴백)
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import type { ToeicQuestion, GrammarType, Difficulty } from '@/types';
import presetQuestions from '@/data/toeic/preset-questions.json';

interface QuizState {
  readonly questions: ToeicQuestion[];
  readonly currentIndex: number;
  readonly selectedAnswer: number | null;
  readonly showFeedback: boolean;
  readonly isCorrect: boolean | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly sessionCorrect: number;
  readonly sessionTotal: number;
}

const INITIAL_STATE: QuizState = {
  questions: [],
  currentIndex: 0,
  selectedAnswer: null,
  showFeedback: false,
  isCorrect: null,
  isLoading: false,
  error: null,
  sessionCorrect: 0,
  sessionTotal: 0,
};

/** 문장 정규화: 공백/대소문자 차이로 "같은 문장"이 중복되지 않게 */
function normalizeSentence(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getPresetQuestions(type: GrammarType | null, count: number, solvedIds: readonly string[]): ToeicQuestion[] {
  const solvedSet = new Set(solvedIds);
  const typed = presetQuestions as ToeicQuestion[];
  const available = typed.filter(q =>
    (!type || q.type === type) && !solvedSet.has(q.id),
  );

  const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled;
}

/**
 * 이미 푼 문제 / 현재 세션에 있는 문제 중복 제거.
 * ID가 달라도 문장이 같으면 같은 문제로 간주 (방어적).
 */
function dedupeQuestions(
  incoming: readonly ToeicQuestion[],
  solvedIds: readonly string[],
  existing: readonly ToeicQuestion[],
): ToeicQuestion[] {
  const solvedSet = new Set(solvedIds);
  const seenSentences = new Set(existing.map(q => normalizeSentence(q.sentence)));
  const result: ToeicQuestion[] = [];
  for (const q of incoming) {
    if (solvedSet.has(q.id)) continue;
    const key = normalizeSentence(q.sentence);
    if (seenSentences.has(key)) continue;
    seenSentences.add(key);
    result.push(q);
  }
  return result;
}

export function useToeicQuiz() {
  const { user } = useAuth();
  const solvedKey = user ? `toeic-solved-${user.id}` : 'toeic-solved-guest';
  const [solvedIds, setSolvedIds] = useLocalStorage<string[]>(solvedKey, []);
  const [state, setState] = useState<QuizState>(INITIAL_STATE);

  const currentQuestion = state.questions[state.currentIndex] ?? null;

  const fetchQuestions = useCallback(async (type: GrammarType, difficulty: Difficulty, count = 3) => {
    // 1단계: 프리셋 문제에서 먼저 가져오기 (풀었던 문제 제외)
    const preset = getPresetQuestions(type, count, solvedIds);
    if (preset.length >= count) {
      setState(prev => ({
        ...prev,
        questions: [...prev.questions, ...dedupeQuestions(preset, solvedIds, prev.questions)],
        isLoading: false,
        error: null,
      }));
      return;
    }

    // 2단계: 프리셋 부족 시 AI 생성 (프리셋 + AI 혼합)
    if (preset.length > 0) {
      setState(prev => ({
        ...prev,
        questions: [...prev.questions, ...dedupeQuestions(preset, solvedIds, prev.questions)],
      }));
    }

    const remaining = count - preset.length;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const res = await fetch('/api/toeic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, difficulty, count: remaining }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to generate questions');
      }

      const data = await res.json() as { readonly questions: readonly ToeicQuestion[] };

      // AI 생성 결과도 이미 푼 문제/현재 세션과 중복 제거
      setState(prev => ({
        ...prev,
        questions: [...prev.questions, ...dedupeQuestions(data.questions, solvedIds, prev.questions)],
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // AI 실패해도 프리셋 문제가 있으면 계속 진행 가능
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: prev.questions.length > 0 ? null : message,
      }));
    }
  }, [solvedIds]);

  const selectAnswer = useCallback((answerIndex: number) => {
    setState(prev => {
      if (prev.showFeedback || !prev.questions[prev.currentIndex]) return prev;

      const question = prev.questions[prev.currentIndex];
      const isCorrect = answerIndex === question.correctIndex;

      // 풀은 문제 ID 저장 (중복 출제 방지)
      setSolvedIds(ids => ids.includes(question.id) ? ids : [...ids, question.id]);

      return {
        ...prev,
        selectedAnswer: answerIndex,
        showFeedback: true,
        isCorrect,
        sessionCorrect: prev.sessionCorrect + (isCorrect ? 1 : 0),
        sessionTotal: prev.sessionTotal + 1,
      };
    });
  }, [setSolvedIds]);

  const nextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      selectedAnswer: null,
      showFeedback: false,
      isCorrect: null,
    }));
  }, []);

  const resetQuiz = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const hasMore = state.currentIndex < state.questions.length - 1;
  const needsMoreQuestions = state.currentIndex >= state.questions.length - 2;

  return {
    ...state,
    currentQuestion,
    hasMore,
    needsMoreQuestions,
    fetchQuestions,
    selectAnswer,
    nextQuestion,
    resetQuiz,
  } as const;
}
