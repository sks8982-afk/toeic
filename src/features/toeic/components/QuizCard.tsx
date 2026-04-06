// Design Ref: §7.1 — 한 화면 한 문제, 4지선다, 즉시 피드백
'use client';

import type { ToeicQuestion } from '@/types';

interface QuizCardProps {
  readonly question: ToeicQuestion;
  readonly selectedAnswer: number | null;
  readonly showFeedback: boolean;
  readonly onSelect: (index: number) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export function QuizCard({ question, selectedAnswer, showFeedback, onSelect }: QuizCardProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* 문법 포인트 태그 */}
      <div className="mb-3">
        <span className="inline-block px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
          {question.grammarPoint}
        </span>
      </div>

      {/* 문장 */}
      <div className="p-5 mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <p className="text-lg leading-relaxed text-gray-900">
          {question.sentence}
        </p>
      </div>

      {/* 4지선다 */}
      <div className="space-y-3">
        {question.options.map((option, idx) => {
          let style = 'bg-white border-gray-200 hover:border-blue-400 active:bg-blue-50';

          if (showFeedback) {
            if (idx === question.correctIndex) {
              style = 'bg-green-50 border-green-500 text-green-800';
            } else if (idx === selectedAnswer && idx !== question.correctIndex) {
              style = 'bg-red-50 border-red-500 text-red-800 animate-shake';
            } else {
              style = 'bg-gray-50 border-gray-200 text-gray-400';
            }
          } else if (idx === selectedAnswer) {
            style = 'bg-blue-50 border-blue-500';
          }

          return (
            <button
              key={idx}
              onClick={() => onSelect(idx)}
              disabled={showFeedback}
              className={`
                w-full flex items-center gap-3 p-4 rounded-xl border-2
                transition-all duration-150 text-left
                disabled:cursor-default
                ${style}
              `}
            >
              <span className={`
                w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0
                ${showFeedback && idx === question.correctIndex
                  ? 'bg-green-500 text-white'
                  : showFeedback && idx === selectedAnswer
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600'}
              `}>
                {OPTION_LABELS[idx]}
              </span>
              <span className="text-base">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
