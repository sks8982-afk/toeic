// 단어 테스트 — 학습한 단어 중 N개를 뜻 블러 처리하고 하나씩 확인
// 정답/오답 버튼 → /api/vocabulary/record 로 기록
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useWrongAnswers } from '@/features/toeic/hooks/useWrongAnswers';
import { Button, Card } from '@/shared/components/ui';
import type { VocabWord } from '@/types';

type Phase = 'select' | 'loading' | 'testing' | 'done' | 'empty';

const SET_SIZES = [10, 20, 30, 50] as const;

export default function VocabularyTestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addWrongAnswer } = useWrongAnswers();

  const [phase, setPhase] = useState<Phase>('select');
  const [size, setSize] = useState<number>(20);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correctCnt, setCorrectCnt] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [totalLearned, setTotalLearned] = useState(0);

  const startTest = useCallback(async () => {
    if (!user) return;
    setPhase('loading');
    try {
      const res = await fetch('/api/vocabulary/test-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, count: size, onlyWrong }),
      });
      const data = (await res.json()) as {
        readonly words?: readonly VocabWord[];
        readonly total?: number;
      };
      setTotalLearned(data.total ?? 0);
      if (!data.words || data.words.length === 0) {
        setPhase('empty');
        return;
      }
      setWords(data.words as VocabWord[]);
      setIdx(0);
      setRevealed(false);
      setCorrectCnt(0);
      setWrongIds([]);
      setPhase('testing');
    } catch {
      setPhase('empty');
    }
  }, [user, size, onlyWrong]);

  const record = useCallback(
    async (wordId: string, action: 'know' | 'unknown') => {
      if (!user) return;
      try {
        await fetch('/api/vocabulary/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, wordId, action }),
        });
      } catch {
        /* ignore */
      }
    },
    [user],
  );

  const onJudge = useCallback(
    (correct: boolean) => {
      const current = words[idx];
      if (!current) return;
      if (correct) {
        setCorrectCnt(c => c + 1);
      } else {
        setWrongIds(ids => [...ids, current.id]);
        // 오답노트(단어)에 추가 — 기존 오답노트 UI에서 복습 가능하도록
        addWrongAnswer({
          id: `vocab-test-${current.id}`,
          type: 'vocabulary' as const,
          difficulty: (current.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard',
          sentence: `[단어] ${current.word} — ${current.meaning}`,
          options: [current.meaning, '다른 뜻1', '다른 뜻2', '다른 뜻3'],
          correctIndex: 0,
          explanation: `${current.word} (${current.partOfSpeech}): ${current.meaning}${
            current.exampleSentence ? `\n예문: ${current.exampleSentence}` : ''
          }`,
          grammarPoint: `단어 (${current.category ?? 'general'})`,
        });
      }

      record(current.id, correct ? 'know' : 'unknown');

      const next = idx + 1;
      if (next >= words.length) {
        setPhase('done');
        return;
      }
      setIdx(next);
      setRevealed(false);
    },
    [idx, words, record, addWrongAnswer],
  );

  // 키보드 지원 (스페이스=공개, 1=정답, 2=오답)
  useEffect(() => {
    if (phase !== 'testing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!revealed) setRevealed(true);
      } else if (revealed && (e.key === '1' || e.key === 'ArrowLeft')) {
        onJudge(true);
      } else if (revealed && (e.key === '2' || e.key === 'ArrowRight')) {
        onJudge(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, revealed, onJudge]);

  const current = words[idx];
  const accuracy = words.length > 0 ? Math.round((correctCnt / words.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/toeic/vocabulary')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
          aria-label="뒤로"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">단어 테스트</h1>
      </div>

      {/* 세트 크기 선택 */}
      {phase === 'select' && (
        <div className="space-y-4">
          <Card padding="md">
            <p className="text-sm text-gray-600 mb-3">
              학습한 단어 중에서 랜덤으로 뽑아 테스트합니다.<br />
              뜻은 가려져 있고, 탭하면 공개되며 정답/오답을 기록할 수 있어요.
            </p>
          </Card>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">테스트 개수</p>
            <div className="grid grid-cols-4 gap-2">
              {SET_SIZES.map(n => (
                <button
                  key={n}
                  onClick={() => setSize(n)}
                  className={`py-3 rounded-xl border-2 font-semibold text-base transition-all ${
                    size === n
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {n}개
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={onlyWrong}
              onChange={e => setOnlyWrong(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">오답으로 표시한 단어만</span>
          </label>

          <Button onClick={startTest} fullWidth size="lg" className="border-2 border-blue-700 shadow-md">
            테스트 시작
          </Button>
        </div>
      )}

      {/* 로딩 */}
      {phase === 'loading' && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">불러오는 중...</p>
        </div>
      )}

      {/* 학습한 단어 없음 */}
      {phase === 'empty' && (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl">📭</p>
          <p className="text-sm text-gray-500">
            {onlyWrong ? '오답으로 표시된 단어가 없습니다.' : '아직 학습한 단어가 없습니다.'}
          </p>
          <Button onClick={() => router.push('/toeic/vocabulary')} variant="secondary">
            단어 학습하러 가기
          </Button>
        </div>
      )}

      {/* 테스트 중 — 모바일 우선 레이아웃: 카드 전체 탭 가능 + 하단 고정 액션 바 */}
      {phase === 'testing' && current && (
        <div className="space-y-4 pb-32">
          {/* 진행률 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {idx + 1} / {words.length}
            </span>
            <span>정답 {correctCnt} · 오답 {wrongIds.length}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${idx / words.length * 100}%` }}
            />
          </div>

          {/* 카드 — 전체가 탭 영역 (모바일 탭 타깃 충분히 크게) */}
          <button
            type="button"
            onClick={() => !revealed && setRevealed(true)}
            disabled={revealed}
            className={`w-full min-h-[360px] p-6 bg-white rounded-2xl border-2 shadow-sm flex flex-col justify-center gap-4 text-center transition-all ${
              revealed
                ? 'border-blue-300 cursor-default'
                : 'border-gray-200 active:scale-[0.99] active:bg-gray-50'
            }`}
            aria-label={revealed ? '뜻 공개됨' : '탭하여 뜻 공개'}
          >
            {/* 단어 */}
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900 break-words">{current.word}</p>
              {current.pronunciation ? (
                <p className="text-sm text-gray-400">{current.pronunciation}</p>
              ) : null}
              <div className="flex flex-wrap gap-1 justify-center">
                {current.partOfSpeech.split(/[,/]/).map((pos, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full"
                  >
                    {pos.trim()}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-12 h-0.5 bg-gray-200 mx-auto" />

            {/* 뜻 (블러) */}
            <div className="relative min-h-[60px] flex items-center justify-center">
              <p
                className={`text-2xl font-bold text-blue-600 transition-all ${
                  revealed ? '' : 'blur-md select-none'
                }`}
              >
                {current.meaning}
              </p>
              {!revealed && (
                <span className="absolute text-xs text-gray-400 bg-white/80 px-3 py-1.5 rounded-full pointer-events-none">
                  👆 탭하여 뜻 공개
                </span>
              )}
            </div>

            {/* 예문 */}
            {current.exampleSentence ? (
              <p
                className={`text-sm text-gray-600 leading-relaxed italic transition-all ${
                  revealed ? '' : 'blur-sm select-none'
                }`}
              >
                {current.exampleSentence}
              </p>
            ) : null}
          </button>

          {/* 하단 고정 액션 바 — 모바일 엄지 존 최적화 */}
          <div className="fixed bottom-16 left-0 right-0 z-30 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-3 px-4">
            <div className="max-w-2xl mx-auto">
              {revealed ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onJudge(false)}
                    className="min-h-[56px] py-4 rounded-2xl bg-red-50 text-red-700 border-2 border-red-300 font-bold text-base shadow-md active:scale-[0.97] active:bg-red-100 transition-all touch-manipulation"
                  >
                    ❌ 틀렸어요
                  </button>
                  <button
                    onClick={() => onJudge(true)}
                    className="min-h-[56px] py-4 rounded-2xl bg-green-50 text-green-700 border-2 border-green-300 font-bold text-base shadow-md active:scale-[0.97] active:bg-green-100 transition-all touch-manipulation"
                  >
                    ✅ 맞췄어요
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full min-h-[56px] py-4 rounded-2xl bg-blue-600 text-white font-bold text-base shadow-lg border-2 border-blue-700 active:scale-[0.97] active:bg-blue-700 transition-all touch-manipulation"
                >
                  뜻 보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 결과 */}
      {phase === 'done' && (
        <div className="space-y-4 text-center py-6">
          <p className="text-5xl">🎯</p>
          <h2 className="text-2xl font-bold text-gray-900">테스트 완료</h2>
          <Card padding="md">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-blue-600">{accuracy}%</p>
                <p className="text-xs text-gray-500 mt-1">정답률</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{correctCnt}</p>
                <p className="text-xs text-gray-500 mt-1">정답</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{wrongIds.length}</p>
                <p className="text-xs text-gray-500 mt-1">오답</p>
              </div>
            </div>
            {totalLearned > 0 ? (
              <p className="text-[11px] text-gray-400 mt-3">
                총 학습 단어 {totalLearned}개 중 {words.length}개 테스트
              </p>
            ) : null}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push('/toeic/vocabulary')}
              size="lg"
              fullWidth
            >
              학습으로
            </Button>
            <Button onClick={() => setPhase('select')} size="lg" fullWidth>
              다시 테스트
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
