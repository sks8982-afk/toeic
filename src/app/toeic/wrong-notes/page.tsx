// 오답 노트 — 틀린 문제 + 모르겠다고 체크한 문제 모아보기
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/shared/components/ui';
import { useWrongAnswers } from '@/features/toeic/hooks/useWrongAnswers';
import type { WrongAnswer } from '@/types';

type FilterTab = 'all' | 'toeic' | 'listening' | 'vocab' | 'due';

function getCategory(w: WrongAnswer): 'toeic' | 'listening' | 'vocab' {
  if (w.question.sentence.startsWith('[리스닝]')) return 'listening';
  if (w.question.sentence.startsWith('[단어]') || w.question.sentence.startsWith('[단어 퀴즈]')) return 'vocab';
  return 'toeic';
}

export default function WrongNotesPage() {
  const router = useRouter();
  const { wrongAnswers, dueReviews, markReviewed, removeResolved } = useWrongAnswers();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toeicCount = wrongAnswers.filter(w => getCategory(w) === 'toeic').length;
  const listeningCount = wrongAnswers.filter(w => getCategory(w) === 'listening').length;
  const vocabCount = wrongAnswers.filter(w => getCategory(w) === 'vocab').length;

  const filtered = filter === 'all'
    ? wrongAnswers
    : filter === 'due'
      ? dueReviews
      : wrongAnswers.filter(w => getCategory(w) === filter);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/toeic')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">오답 노트</h1>
      </div>

      {/* 종류별 통계 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-3 bg-red-50 rounded-xl">
          <p className="text-xl font-bold text-red-600">{wrongAnswers.length}</p>
          <p className="text-[10px] text-gray-500">전체</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-xl">
          <p className="text-xl font-bold text-blue-600">{toeicCount}</p>
          <p className="text-[10px] text-gray-500">TOEIC</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-xl">
          <p className="text-xl font-bold text-purple-600">{listeningCount}</p>
          <p className="text-[10px] text-gray-500">리스닝</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-xl">
          <p className="text-xl font-bold text-green-600">{vocabCount}</p>
          <p className="text-[10px] text-gray-500">단어</p>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { key: 'all', label: '전체', count: wrongAnswers.length },
          { key: 'toeic', label: 'TOEIC', count: toeicCount },
          { key: 'listening', label: '리스닝', count: listeningCount },
          { key: 'vocab', label: '단어', count: vocabCount },
          { key: 'due', label: '오늘 복습', count: dueReviews.length },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all
              ${filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* 문제 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">
            {filter === 'due' ? '🎉' : '📋'}
          </p>
          <p className="text-sm">
            {filter === 'due' ? '오늘 복습할 문제가 없습니다!' : '오답이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <WrongNoteCard
              key={item.questionId}
              item={item}
              isExpanded={expandedId === item.questionId}
              onToggle={() => setExpandedId(
                expandedId === item.questionId ? null : item.questionId
              )}
              onMarkCorrect={() => markReviewed(item.questionId, true)}
              onMarkWrong={() => markReviewed(item.questionId, false)}
              onRemove={() => removeResolved(item.questionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WrongNoteCard({
  item,
  isExpanded,
  onToggle,
  onMarkCorrect,
  onMarkWrong,
  onRemove,
}: {
  readonly item: WrongAnswer;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly onMarkCorrect: () => void;
  readonly onMarkWrong: () => void;
  readonly onRemove: () => void;
}) {
  const q = item.question;

  return (
    <Card padding="sm">
      {/* 접힌 상태: 문장 + 유형 + 복습 정보 */}
      <button onClick={onToggle} className="w-full text-left">
        <p className="text-sm text-gray-900 leading-relaxed">{q.sentence}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
            {q.grammarPoint}
          </span>
          <span className="text-xs text-gray-400">
            복습 {item.reviewCount}회 · {item.interval}일 간격
          </span>
        </div>
      </button>

      {/* 펼친 상태: 정답 + 해설 + 액션 */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {/* 선택지 */}
          <div className="space-y-1.5">
            {q.options.map((opt, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg text-sm ${
                  i === q.correctIndex
                    ? 'bg-green-50 text-green-800 font-medium'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                {String.fromCharCode(65 + i)}. {opt}
                {i === q.correctIndex && ' ✓'}
              </div>
            ))}
          </div>

          {/* 해설 */}
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-700">{q.explanation}</p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={onMarkCorrect}
              className="flex-1 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-lg active:bg-green-100"
            >
              알겠어요 ✓
            </button>
            <button
              onClick={onMarkWrong}
              className="flex-1 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-lg active:bg-red-100"
            >
              아직 모르겠어요
            </button>
            {item.reviewCount >= 3 && (
              <button
                onClick={onRemove}
                className="py-2 px-3 text-sm font-medium bg-gray-50 text-gray-500 rounded-lg active:bg-gray-100"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
