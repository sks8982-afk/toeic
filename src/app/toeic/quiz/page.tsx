// Design Ref: §2.2.1 — TOEIC 문제풀이 화면 (한 문제씩 풀기)
// Plan SC: SC-01 — 문제 생성 → 선택 → 정답 확인 → 해설 표시 전체 흐름
'use client';

import { useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProgressBar, LoadingSkeleton } from '@/shared/components/ui';
import { QuizCard, FeedbackSheet } from '@/features/toeic/components';
import { useToeicQuiz } from '@/features/toeic/hooks/useToeicQuiz';
import { useWrongAnswers } from '@/features/toeic/hooks/useWrongAnswers';
import { useToeicStats } from '@/features/toeic/hooks/useToeicStats';
import { useXP } from '@/features/gamification/hooks/useXP';
import { useStreak } from '@/features/gamification/hooks/useStreak';
import { XPPopup } from '@/features/gamification/components';
import { LevelUpModal } from '@/features/gamification/components';
import { XP_REWARDS } from '@/features/gamification/lib/xp-table';
import type { GrammarType } from '@/types';

const GRAMMAR_TYPES: GrammarType[] = ['pos', 'tense', 'agreement', 'relative', 'preposition', 'conjunction', 'vocabulary'];

function QuizContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = searchParams.get('type') as GrammarType | null;

  const quiz = useToeicQuiz();
  const { addWrongAnswer } = useWrongAnswers();
  const { recordAnswer } = useToeicStats();
  const { addXP, lastXPGain, showLevelUp, level, dismissLevelUp } = useXP();
  const { recordStudy } = useStreak();

  // 문제 로드
  useEffect(() => {
    if (quiz.questions.length === 0 && !quiz.isLoading) {
      const type = typeParam ?? GRAMMAR_TYPES[Math.floor(Math.random() * GRAMMAR_TYPES.length)];
      quiz.fetchQuestions(type, 'medium', 3);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 추가 문제 프리페치
  useEffect(() => {
    if (quiz.needsMoreQuestions && !quiz.isLoading) {
      const type = typeParam ?? GRAMMAR_TYPES[Math.floor(Math.random() * GRAMMAR_TYPES.length)];
      quiz.fetchQuestions(type, 'medium', 3);
    }
  }, [quiz.needsMoreQuestions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((index: number) => {
    quiz.selectAnswer(index);
  }, [quiz.selectAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswerResult = useCallback(() => {
    if (!quiz.currentQuestion || quiz.isCorrect === null) return;

    // 통계 기록
    recordAnswer(quiz.currentQuestion.type, quiz.isCorrect);
    recordStudy();

    // XP 지급
    if (quiz.isCorrect) {
      addXP(XP_REWARDS.TOEIC_CORRECT);
    } else {
      addWrongAnswer(quiz.currentQuestion);
    }
  }, [quiz.currentQuestion, quiz.isCorrect, recordAnswer, recordStudy, addXP, addWrongAnswer]);

  // 정답/오답 처리
  useEffect(() => {
    if (quiz.showFeedback) {
      handleAnswerResult();
    }
  }, [quiz.showFeedback]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    if (quiz.hasMore) {
      quiz.nextQuestion();
    } else {
      router.push('/toeic');
    }
  }, [quiz.hasMore, quiz.nextQuestion, router]);

  // 로딩 상태
  if (quiz.isLoading && quiz.questions.length === 0) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton lines={2} />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (quiz.error) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-4">😵</p>
        <p className="text-red-600 mb-4">{quiz.error}</p>
        <button
          onClick={() => {
            const type = typeParam ?? 'pos';
            quiz.fetchQuestions(type, 'medium', 3);
          }}
          className="text-blue-600 underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!quiz.currentQuestion) {
    return <LoadingSkeleton lines={3} />;
  }

  return (
    <div className="space-y-4">
      {/* 상단 프로그레스 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/toeic')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <ProgressBar
          value={quiz.sessionTotal}
          max={Math.max(quiz.questions.length, quiz.sessionTotal + 1)}
          color="green"
        />
        <span className="text-sm text-gray-500 shrink-0">
          {quiz.sessionCorrect}/{quiz.sessionTotal}
        </span>
      </div>

      {/* 문제 카드 */}
      <QuizCard
        question={quiz.currentQuestion}
        selectedAnswer={quiz.selectedAnswer}
        showFeedback={quiz.showFeedback}
        onSelect={handleSelect}
      />

      {/* 피드백 시트 */}
      {quiz.showFeedback && quiz.isCorrect !== null && (
        <FeedbackSheet
          question={quiz.currentQuestion}
          isCorrect={quiz.isCorrect}
          xpGained={quiz.isCorrect ? XP_REWARDS.TOEIC_CORRECT : 0}
          onNext={handleNext}
          hasMore={quiz.hasMore}
        />
      )}

      {/* XP 팝업 */}
      <XPPopup
        amount={lastXPGain}
        show={quiz.showFeedback && quiz.isCorrect === true}
      />

      {/* 레벨업 모달 */}
      <LevelUpModal
        open={showLevelUp}
        level={level}
        onClose={dismissLevelUp}
      />
    </div>
  );
}

export default function ToeicQuizPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={5} />}>
      <QuizContent />
    </Suspense>
  );
}
