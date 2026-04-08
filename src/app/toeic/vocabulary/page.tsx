// Design Ref: §2.2.2 — 단어 학습 메인 (Leitner Box SRS)
// Plan SC: SC-08 — 학습 기록 저장 및 복원
'use client';

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, ProgressBar } from '@/shared/components/ui';
import { Flashcard, QuizMode, BoxProgress, SessionHeader } from '@/features/vocabulary/components';
import { useLeitnerBox } from '@/features/vocabulary/hooks/useLeitnerBox';
import { useVocabSession } from '@/features/vocabulary/hooks/useVocabSession';
import { useXP } from '@/features/gamification/hooks/useXP';
import { useStreak } from '@/features/gamification/hooks/useStreak';
import { useAuth } from '@/shared/providers/AuthProvider';
import { logVocabStudy, updateDailySummary } from '@/shared/lib/activity-logger';
import { useWrongAnswers } from '@/features/toeic/hooks/useWrongAnswers';
import { supabase } from '@/shared/lib/supabase';
import { XP_REWARDS } from '@/features/gamification/lib/xp-table';
import { XPPopup } from '@/features/gamification/components';
import type { VocabWord } from '@/types';

import businessWords from '@/data/vocabulary/business.json';
import financeWords from '@/data/vocabulary/finance.json';
import hrWords from '@/data/vocabulary/hr.json';
import marketingWords from '@/data/vocabulary/marketing.json';
import dailyWords from '@/data/vocabulary/daily.json';
import travelWords from '@/data/vocabulary/travel.json';

const PRESET_WORDS: VocabWord[] = [
  ...businessWords, ...financeWords, ...hrWords,
  ...marketingWords, ...dailyWords, ...travelWords,
] as VocabWord[];

export default function VocabularyPage() {
  const router = useRouter();
  const [allWords, setAllWords] = useState<VocabWord[]>(PRESET_WORDS);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const leitner = useLeitnerBox();
  const { addXP, lastXPGain } = useXP();
  const { recordStudy } = useStreak();
  const { addWrongAnswer } = useWrongAnswers();
  const dailyTarget = 30;

  const session = useVocabSession(leitner.allProgress, allWords, dailyTarget);

  // 전체 단어 스펠링 셋 (중복 방지용)
  const allWordSpellings = useMemo(() =>
    new Set(allWords.map(w => w.word.toLowerCase())),
    [allWords],
  );

  // 프리셋 단어를 다 학습했으면 AI로 새 단어 생성
  useEffect(() => {
    if (isGenerating) return;
    const learnedIds = new Set(leitner.allProgress.map(p => p.wordId));
    const remaining = allWords.filter(w => !learnedIds.has(w.id));
    if (remaining.length < 10 && allWords.length > 0) {
      setIsGenerating(true);
      // 전체 단어 목록을 exclude (이미 본 것 + 프리셋 전체)
      const allExclude = Array.from(allWordSpellings).slice(0, 200);
      fetch('/api/vocabulary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 20, excludeWords: allExclude }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.words?.length > 0) {
            // 스펠링 기준 중복 제거 후 추가
            const newWords = data.words.filter(
              (w: VocabWord) => !allWordSpellings.has(w.word.toLowerCase()),
            );
            if (newWords.length > 0) {
              setAllWords(prev => [...prev, ...newWords]);
            }
          }
        })
        .finally(() => setIsGenerating(false));
    }
  }, [leitner.allProgress.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 세션 내 정답/오답 카운터
  const sessionStats = useRef({ correct: 0, wrong: 0, total: 0 });

  // 페이지 이탈 시 세션 요약 DB 저장
  useEffect(() => {
    return () => {
      const s = sessionStats.current;
      if (user && s.total > 0) {
        supabase.from('vocab_study_log').insert({
          user_id: user.id,
          word_id: 'SESSION_SUMMARY',
          word: `세션 요약: ${s.total}개 학습 (${s.correct}정답, ${s.wrong}오답)`,
          action: 'session_end',
          box_before: s.correct,
          box_after: s.wrong,
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 플래시카드 자가 평가 처리
  const handleAssess = useCallback(
    (result: 'know' | 'unsure' | 'unknown') => {
      if (!session.currentWord) return;

      // Leitner Box에 등록 (신규 단어면 init)
      leitner.initWord(session.currentWord.id);

      const boxBefore = leitner.getProgress(session.currentWord.id)?.box ?? 1;

      if (result === 'know') {
        leitner.promote(session.currentWord.id);
        addXP(XP_REWARDS.VOCAB_CORRECT);
      } else if (result === 'unknown') {
        leitner.demote(session.currentWord.id);
        // 오답노트에 추가
        addWrongAnswer({
          id: `vocab-${session.currentWord.id}`,
          type: 'vocabulary' as const,
          difficulty: session.currentWord.difficulty as 'easy' | 'medium' | 'hard',
          sentence: `[단어] ${session.currentWord.word} — ${session.currentWord.meaning}`,
          options: [session.currentWord.meaning, '다른 뜻1', '다른 뜻2', '다른 뜻3'],
          correctIndex: 0,
          explanation: `${session.currentWord.word} (${session.currentWord.partOfSpeech}): ${session.currentWord.meaning}\n예문: ${session.currentWord.exampleSentence}`,
          grammarPoint: `단어 (${session.currentWord.category})`,
        });
      } else {
        leitner.keep(session.currentWord.id);
      }

      const boxAfter = result === 'know' ? Math.min(boxBefore + 1, 5) : result === 'unknown' ? 1 : boxBefore;

      // 세션 카운터
      sessionStats.current.total++;
      if (result === 'know') sessionStats.current.correct++;
      else if (result === 'unknown') sessionStats.current.wrong++;

      // DB에 기록
      if (user) {
        logVocabStudy(user.id, session.currentWord.id, session.currentWord.word, result, boxBefore, boxAfter);
        updateDailySummary(user.id, session.phase === 'review' ? 'vocab_reviewed' : 'vocab_learned');
      }

      recordStudy();
      session.nextWord();
    },
    [session, leitner, addXP, recordStudy, user, addWrongAnswer],
  );

  // 퀴즈 정답 처리
  const handleQuizAnswer = useCallback(
    (correct: boolean) => {
      if (!session.currentWord) return;

      leitner.initWord(session.currentWord.id);

      const boxBefore = leitner.getProgress(session.currentWord.id)?.box ?? 1;

      if (correct) {
        leitner.promote(session.currentWord.id);
        addXP(XP_REWARDS.VOCAB_CORRECT);
      } else {
        leitner.demote(session.currentWord.id);
        addWrongAnswer({
          id: `vocab-quiz-${session.currentWord.id}`,
          type: 'vocabulary' as const,
          difficulty: session.currentWord.difficulty as 'easy' | 'medium' | 'hard',
          sentence: `[단어 퀴즈] ${session.currentWord.word} — ${session.currentWord.meaning}`,
          options: [session.currentWord.meaning, '다른 뜻1', '다른 뜻2', '다른 뜻3'],
          correctIndex: 0,
          explanation: `${session.currentWord.word} (${session.currentWord.partOfSpeech}): ${session.currentWord.meaning}\n예문: ${session.currentWord.exampleSentence}`,
          grammarPoint: `단어 (${session.currentWord.category})`,
        });
      }

      sessionStats.current.total++;
      if (correct) sessionStats.current.correct++;
      else sessionStats.current.wrong++;

      if (user) {
        logVocabStudy(user.id, session.currentWord.id, session.currentWord.word, correct ? 'quiz_correct' : 'quiz_wrong', boxBefore, correct ? Math.min(boxBefore + 1, 5) : 1);
      }

      recordStudy();
      session.nextWord();
    },
    [session, leitner, addXP, recordStudy, user],
  );

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
        <h1 className="text-xl font-bold text-gray-900">단어 학습</h1>
      </div>

      {/* 세션 헤더 */}
      <SessionHeader
        phase={session.phase}
        reviewCount={session.reviewCount}
        newCount={session.newCount}
        currentIndex={session.currentIndex}
        totalInPhase={session.totalInPhase}
      />

      {/* 완료 화면 */}
      {session.phase === 'complete' && (
        <div className="text-center py-8 space-y-6">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">오늘 학습 완료!</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card padding="md">
              <p className="text-2xl font-bold text-orange-600">{session.reviewedCount}</p>
              <p className="text-xs text-gray-500">복습 완료</p>
            </Card>
            <Card padding="md">
              <p className="text-2xl font-bold text-blue-600">{session.newLearnedCount}</p>
              <p className="text-xs text-gray-500">신규 학습</p>
            </Card>
          </div>

          {/* Box 진행도 */}
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-3">학습 진행도</h3>
            <BoxProgress
              distribution={leitner.boxDistribution}
              total={leitner.totalLearned}
            />
          </Card>

          <Button onClick={() => router.push('/toeic')} fullWidth size="lg">
            돌아가기
          </Button>
        </div>
      )}

      {/* 학습 중 */}
      {session.phase !== 'complete' && session.currentWord && (
        <>
          {session.quizType === 'flashcard' ? (
            <Flashcard word={session.currentWord} onAssess={handleAssess} />
          ) : (
            <QuizMode
              word={session.currentWord}
              allWords={allWords}
              mode={session.quizType === 'fill-blank' ? 'fill-blank' : session.quizType === 'kr-to-en' ? 'kr-to-en' : 'en-to-kr'}
              onAnswer={handleQuizAnswer}
            />
          )}
        </>
      )}

      {/* 단어가 없을 때 */}
      {session.phase !== 'complete' && !session.currentWord && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📚</p>
          <p className="text-sm">학습할 단어가 없습니다</p>
          <p className="text-xs mt-1">더 많은 단어를 추가해주세요</p>
        </div>
      )}

      {/* XP 팝업 */}
      <XPPopup amount={lastXPGain} show={lastXPGain > 0} />
    </div>
  );
}
