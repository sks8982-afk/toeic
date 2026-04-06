// Speak 메인 — 레벨 선택 + 시나리오 목록
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button } from '@/shared/components/ui';
import { ScenarioCard } from '@/features/speak/components';
import { SCENARIOS, getScenariosForLevel } from '@/features/speak/lib/scenarios';
import { getSavedChat } from '@/features/speak/hooks/useChat';
import { StreakBadge, XPBar } from '@/features/gamification/components';
import type { SpeakLevel } from '@/types';

const LEVEL_INFO = [
  { level: 1, label: '입문', desc: '기초 표현, 짧은 문장', color: 'bg-green-100 text-green-700 border-green-300' },
  { level: 2, label: '초급', desc: '일상 대화, 간단한 질문', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { level: 3, label: '중급', desc: '자연스러운 대화, 다양한 문법', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { level: 4, label: '중상급', desc: '복잡한 표현, 관용어', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { level: 5, label: '고급', desc: '세련된 표현, 토론 수준', color: 'bg-red-100 text-red-700 border-red-300' },
] as const;

export default function SpeakPage() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<SpeakLevel>(1);
  const [savedChat, setSavedChat] = useState<ReturnType<typeof getSavedChat>>(null);

  useEffect(() => {
    setSavedChat(getSavedChat());
  }, []);

  const filteredScenarios = getScenariosForLevel(selectedLevel);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Speak</h1>
        </div>
        <StreakBadge />
      </div>

      <XPBar />

      {/* 이전 대화 이어하기 */}
      {savedChat && (
        <Link href={`/speak/chat?level=${savedChat.level}${savedChat.scenarioId ? `&scenario=${savedChat.scenarioId}` : ''}`}>
          <Card variant="highlight" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">이전 대화 이어하기</p>
                <p className="text-sm text-blue-700">
                  {savedChat.scenarioTitle ?? '자유 대화'} · {savedChat.messages.length}턴
                </p>
              </div>
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>
        </Link>
      )}

      {/* 레벨 선택 */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">난이도 선택</h2>
        <div className="grid grid-cols-5 gap-2">
          {LEVEL_INFO.map(info => (
            <button
              key={info.level}
              onClick={() => setSelectedLevel(info.level as SpeakLevel)}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-xl transition-all
                ${selectedLevel === info.level
                  ? info.color + ' border-2 shadow-md scale-105'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}
              `}
            >
              <span className="text-lg font-bold">{info.level}</span>
              <span className="text-[10px] font-medium">{info.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {LEVEL_INFO[selectedLevel - 1].desc}
        </p>
      </div>

      {/* 자동 시작 버튼 */}
      <Link href={`/speak/chat?level=${selectedLevel}&auto=true`}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 p-5 text-white shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
              🎲
            </div>
            <div>
              <h3 className="text-lg font-bold">AI 추천으로 시작하기</h3>
              <p className="text-sm text-purple-100 mt-0.5">
                Lv.{selectedLevel}에 맞는 상황을 AI가 골라줍니다
              </p>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
        </div>
      </Link>

      {/* 시나리오 목록 */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">시나리오 직접 선택 ({filteredScenarios.length}개)</h2>
        <div className="space-y-3">
          {filteredScenarios.map(scenario => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onSelect={(id) => router.push(`/speak/chat?scenario=${id}&level=${selectedLevel}`)}
            />
          ))}
        </div>
      </div>

      {/* 프리톡 버튼 */}
      <Link href={`/speak/chat?level=${selectedLevel}`}>
        <Button fullWidth size="lg" variant="secondary">
          💬 자유 대화 (프리톡)
        </Button>
      </Link>
    </div>
  );
}
