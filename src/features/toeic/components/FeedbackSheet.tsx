// Design Ref: §7.1 — 정답/오답 즉시 + 해설 슬라이드업 카드
'use client';

import { Button } from '@/shared/components/ui';
import type { ToeicQuestion } from '@/types';

interface FeedbackSheetProps {
  readonly question: ToeicQuestion;
  readonly isCorrect: boolean;
  readonly xpGained: number;
  readonly onNext: () => void;
  readonly hasMore: boolean;
}

export function FeedbackSheet({ question, isCorrect, xpGained, onNext, hasMore }: FeedbackSheetProps) {
  return (
    <div className={`
      fixed bottom-0 left-0 right-0 z-30
      rounded-t-3xl shadow-2xl p-6 pb-20 lg:pb-6
      animate-slide-up
      ${isCorrect ? 'bg-green-50' : 'bg-red-50'}
    `}>
      <div className="max-w-lg mx-auto">
        {/* 결과 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{isCorrect ? '🎉' : '😢'}</span>
          <div>
            <h3 className={`text-lg font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
              {isCorrect ? '정답!' : '오답'}
            </h3>
            {isCorrect && xpGained > 0 && (
              <span className="text-sm text-yellow-600 font-semibold">+{xpGained} XP</span>
            )}
          </div>
        </div>

        {/* 정답 표시 */}
        {!isCorrect && (
          <div className="mb-3 p-3 bg-white rounded-xl">
            <span className="text-sm text-gray-500">정답: </span>
            <span className="font-semibold text-green-700">
              {question.options[question.correctIndex]}
            </span>
          </div>
        )}

        {/* 해설 */}
        <div className="mb-6 p-4 bg-white rounded-xl">
          <p className="text-sm text-gray-700 leading-relaxed">
            {question.explanation}
          </p>
        </div>

        {/* 다음 버튼 */}
        <Button
          onClick={onNext}
          fullWidth
          size="lg"
          variant={isCorrect ? 'primary' : 'secondary'}
        >
          {hasMore ? '다음 문제' : '결과 보기'}
        </Button>
      </div>
    </div>
  );
}
