// Design Ref: §2.2.1 F-TOEIC-07 — 오답 노트 목록
'use client';

import { Card } from '@/shared/components/ui';
import type { WrongAnswer } from '@/types';

interface WrongNoteListProps {
  readonly wrongAnswers: readonly WrongAnswer[];
  readonly onReview?: (questionId: string) => void;
}

export function WrongNoteList({ wrongAnswers, onReview }: WrongNoteListProps) {
  if (wrongAnswers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">🎯</p>
        <p className="text-sm">오답 노트가 비어있습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {wrongAnswers.map(item => (
        <Card
          key={item.questionId}
          variant="interactive"
          padding="sm"
          onClick={() => onReview?.(item.questionId)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 line-clamp-2">
                {item.question.sentence}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {item.question.grammarPoint}
                </span>
                <span className="text-xs text-gray-400">
                  복습: {item.reviewDue}
                </span>
              </div>
            </div>
            <span className="text-xs text-orange-600 font-medium shrink-0">
              {item.interval}일 후
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
