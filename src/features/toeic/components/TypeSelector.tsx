// Design Ref: §2.2.1 F-TOEIC-04 — Part 5 세부 유형 선택 칩 (클릭 즉시 퀴즈 진입)
'use client';

import Link from 'next/link';
import type { GrammarType } from '@/types';

interface TypeSelectorProps {
  readonly accuracyByType?: Record<GrammarType, { readonly total: number; readonly correct: number }>;
}

interface TypeDef {
  readonly key: GrammarType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
}

const TYPES: readonly TypeDef[] = [
  { key: 'pos', label: '품사', description: '명사/동사/형용사/부사', icon: '🔤' },
  { key: 'tense', label: '시제', description: '현재/과거/완료/미래', icon: '⏰' },
  { key: 'agreement', label: '수일치', description: '주어-동사 일치', icon: '🔗' },
  { key: 'relative', label: '관계사', description: 'who/which/that', icon: '🌉' },
  { key: 'preposition', label: '전치사', description: 'at/in/on/by', icon: '📍' },
  { key: 'conjunction', label: '접속사', description: 'and/but/because', icon: '🔀' },
  { key: 'vocabulary', label: '어휘', description: '문맥 파악', icon: '📖' },
];

export function TypeSelector({ accuracyByType }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {TYPES.map(({ key, label, description, icon }) => {
        const stats = accuracyByType?.[key];
        const rate = stats && stats.total > 0
          ? Math.round((stats.correct / stats.total) * 100)
          : null;

        return (
          <Link
            key={key}
            href={`/toeic/quiz?type=${key}`}
            className="group flex flex-col items-start gap-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-blue-400 hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-semibold text-gray-900">{label}</span>
              </div>
              {rate !== null && (
                <span className="text-[11px] font-medium text-blue-600">{rate}%</span>
              )}
            </div>
            <span className="text-[10px] text-gray-500">{description}</span>
          </Link>
        );
      })}
    </div>
  );
}
