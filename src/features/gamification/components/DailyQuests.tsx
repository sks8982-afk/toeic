// Design Ref: §2.4 F-GAME-04 — 데일리 퀘스트 체크리스트
'use client';

import { Card, ProgressBar } from '@/shared/components/ui';
import { useDailyQuests } from '../hooks/useDailyQuests';

export function DailyQuests() {
  const { quests, completedCount, totalCount } = useDailyQuests();

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">오늘의 퀘스트</h3>
        <span className="text-sm text-gray-500">
          {completedCount}/{totalCount}
        </span>
      </div>

      <div className="space-y-3">
        {quests.map(quest => (
          <div key={quest.id} className="flex items-center gap-3">
            <div className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
              ${quest.completed
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300'}
            `}>
              {quest.completed && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-sm ${quest.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {quest.description}
              </p>
              {!quest.completed && (
                <ProgressBar
                  value={quest.current}
                  max={quest.target}
                  color="green"
                  size="sm"
                />
              )}
            </div>

            <span className="text-xs text-yellow-600 font-semibold shrink-0">
              +{quest.xpReward}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
