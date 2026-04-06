// 랭킹 페이지 — Supabase에서 XP 순 랭킹 조회
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, LoadingSkeleton } from '@/shared/components/ui';
import { useAuth } from '@/shared/providers/AuthProvider';
import { fetchRankings, type RankingEntry } from '@/shared/lib/sync-progress';

const RANK_MEDALS = ['🥇', '🥈', '🥉'] as const;

const LEVEL_COLORS: Record<string, string> = {
  Starter: 'bg-gray-100 text-gray-600',
  Learner: 'bg-green-100 text-green-700',
  Explorer: 'bg-blue-100 text-blue-700',
  Achiever: 'bg-purple-100 text-purple-700',
  Expert: 'bg-orange-100 text-orange-700',
  Master: 'bg-red-100 text-red-700',
  Legend: 'bg-yellow-100 text-yellow-700',
};

function getLevelTitle(level: number): string {
  if (level <= 5) return 'Starter';
  if (level <= 10) return 'Learner';
  if (level <= 15) return 'Explorer';
  if (level <= 20) return 'Achiever';
  if (level <= 30) return 'Expert';
  if (level <= 40) return 'Master';
  return 'Legend';
}

export default function RankingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRankings(50).then(data => {
      setRankings(data);
      setIsLoading(false);
    });
  }, []);

  const myRank = rankings.find(r => r.deviceId === user?.id);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">랭킹</h1>
      </div>

      {/* 내 순위 카드 */}
      {myRank && (
        <Card variant="highlight" padding="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
              {myRank.rank}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">내 순위</p>
              <p className="text-sm text-gray-500">
                Lv.{myRank.level} · {myRank.xp.toLocaleString()} XP
                {myRank.streak > 0 && ` · 🔥 ${myRank.streak}일`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* 랭킹 리스트 */}
      {!isLoading && (
        <div className="space-y-2">
          {rankings.map(entry => {
            const isMe = entry.deviceId === user?.id;
            const title = getLevelTitle(entry.level);
            const titleColor = LEVEL_COLORS[title] ?? 'bg-gray-100 text-gray-600';

            return (
              <div
                key={entry.deviceId}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-colors
                  ${isMe ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white border border-gray-200'}
                `}
              >
                {/* 순위 */}
                <div className="w-8 text-center shrink-0">
                  {entry.rank <= 3 ? (
                    <span className="text-xl">{RANK_MEDALS[entry.rank - 1]}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">{entry.rank}</span>
                  )}
                </div>

                {/* 아바타 */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                  ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {entry.name.charAt(0).toUpperCase()}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${isMe ? 'text-blue-700' : 'text-gray-900'}`}>
                      {entry.name} {isMe && '(나)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${titleColor}`}>
                      Lv.{entry.level} {title}
                    </span>
                    {entry.streak > 0 && (
                      <span className="text-[10px] text-orange-500">🔥{entry.streak}</span>
                    )}
                  </div>
                </div>

                {/* XP */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{entry.xp.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">XP</p>
                </div>
              </div>
            );
          })}

          {rankings.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-sm">아직 랭킹 데이터가 없습니다</p>
              <p className="text-xs mt-1">학습을 시작하면 자동으로 등록됩니다</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
