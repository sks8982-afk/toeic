// Design Ref: §2.3.2 — 피드백 접이식 카드 (문법 교정 + 표현 추천)
'use client';

import { useState } from 'react';
import type { ChatFeedback } from '@/types';

interface FeedbackCardProps {
  readonly feedback: ChatFeedback;
}

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasContent = feedback.grammar.length > 0 || feedback.suggestions.length > 0;

  if (!hasContent) return null;

  return (
    <div className="ml-10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
      >
        {isOpen ? '▾ 피드백 닫기' : '▸ 피드백 보기'}
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-orange-50 rounded-xl space-y-3 text-sm">
          {/* 문법 교정 */}
          {feedback.grammar.length > 0 && (
            <div>
              <p className="font-semibold text-orange-800 mb-1">문법 교정</p>
              {feedback.grammar.map((issue, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <p className="text-red-600 line-through">{issue.original}</p>
                  <p className="text-green-700 font-medium">→ {issue.corrected}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{issue.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {/* 표현 추천 */}
          {feedback.suggestions.length > 0 && (
            <div>
              <p className="font-semibold text-blue-800 mb-1">이렇게도 말할 수 있어요</p>
              {feedback.suggestions.map((s, i) => (
                <p key={i} className="text-blue-700">• {s}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
