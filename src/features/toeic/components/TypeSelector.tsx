// Design Ref: §2.2.1 F-TOEIC-04 — Part 5 세부 유형 선택 칩
'use client';

import type { GrammarType } from '@/types';

interface TypeSelectorProps {
  readonly selected: GrammarType | null;
  readonly onSelect: (type: GrammarType) => void;
  readonly accuracyByType?: Record<GrammarType, { total: number; correct: number }>;
}

const TYPE_LABELS: Record<GrammarType, string> = {
  pos: '품사',
  tense: '시제',
  agreement: '수일치',
  relative: '관계사',
  preposition: '전치사',
  conjunction: '접속사',
  vocabulary: '어휘',
};

export function TypeSelector({ selected, onSelect, accuracyByType }: TypeSelectorProps) {
  const types = Object.entries(TYPE_LABELS) as [GrammarType, string][];

  return (
    <div className="flex flex-wrap gap-2">
      {types.map(([type, label]) => {
        const isActive = selected === type;
        const stats = accuracyByType?.[type];
        const rate = stats && stats.total > 0
          ? Math.round((stats.correct / stats.total) * 100)
          : null;

        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all
              ${isActive
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'}
            `}
          >
            {label}
            {rate !== null && (
              <span className={`ml-1.5 text-xs ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                {rate}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
