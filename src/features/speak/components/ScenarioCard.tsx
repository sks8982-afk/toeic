// Design Ref: §2.3.1 F-SPEAK-02 — 시나리오 선택 카드
'use client';

import { Card } from '@/shared/components/ui';
import type { Scenario } from '@/types';

interface ScenarioCardProps {
  readonly scenario: Scenario;
  readonly onSelect: (id: string) => void;
  readonly completed?: boolean;
}

const LEVEL_LABELS = ['', '입문', '초급', '중급', '중상급', '고급'];

export function ScenarioCard({ scenario, onSelect, completed }: ScenarioCardProps) {
  return (
    <Card
      variant="interactive"
      padding="md"
      onClick={() => onSelect(scenario.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900">{scenario.titleKo}</h3>
            {completed && <span className="text-green-500 text-sm">✓</span>}
          </div>
          <p className="text-sm text-gray-500 mb-2">{scenario.description}</p>
          <div className="flex gap-1.5">
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
              {LEVEL_LABELS[scenario.minLevel]}~{LEVEL_LABELS[scenario.maxLevel]}
            </span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              미션 {scenario.missions.length}개
            </span>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Card>
  );
}
