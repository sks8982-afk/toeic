// TOEIC 리스닝 문제풀이 — AI 생성 + TTS + 프리페치 + 저장/이어풀기
'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, ProgressBar, LoadingSkeleton } from '@/shared/components/ui';
import { useListeningQuiz } from '@/features/toeic/hooks/useListeningQuiz';
import { useTextToSpeech } from '@/features/speak/hooks/useTextToSpeech';
import { useXP } from '@/features/gamification/hooks/useXP';
import { useStreak } from '@/features/gamification/hooks/useStreak';
import { XP_REWARDS } from '@/features/gamification/lib/xp-table';
import { XPPopup } from '@/features/gamification/components';
import type { ListeningDifficulty } from '@/types';

const DIFF_LABELS: Record<ListeningDifficulty, { label: string; color: string }> = {
  easy: { label: '하', color: 'bg-green-100 text-green-700' },
  medium: { label: '중', color: 'bg-yellow-100 text-yellow-700' },
  hard: { label: '상', color: 'bg-red-100 text-red-700' },
};

export default function ListeningPage() {
  const router = useRouter();
  const quiz = useListeningQuiz();
  const { speak, stop, isSpeaking } = useTextToSpeech();
  const { addXP, lastXPGain } = useXP();
  const { recordStudy } = useStreak();
  const [showTranscript, setShowTranscript] = useState(false);
  const [showDiffPicker, setShowDiffPicker] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<ListeningDifficulty | null>(null);

  const handleSelectDifficulty = useCallback((diff: ListeningDifficulty) => {
    quiz.startQuestion(diff);
  }, [quiz.startQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChangeDifficulty = useCallback((diff: ListeningDifficulty) => {
    if (diff === quiz.difficulty) {
      setShowDiffPicker(false);
      return;
    }
    setPendingDiff(diff);
    setShowDiffPicker(false);
    alert(`다음 문제부터 "${DIFF_LABELS[diff].label}" 난이도로 변경됩니다.`);
  }, [quiz.difficulty]);

  const handlePlayAudio = useCallback(() => {
    if (!quiz.currentQuestion) return;
    if (isSpeaking) {
      stop();
    } else {
      speak(quiz.currentQuestion.audioText, 'en');
    }
  }, [quiz.currentQuestion, isSpeaking, speak, stop]);

  const handleSelectAnswer = useCallback((index: number) => {
    quiz.selectAnswer(index);
    recordStudy();
    const isCorrect = quiz.currentQuestion?.correctIndex === index;
    if (isCorrect) {
      addXP(XP_REWARDS.TOEIC_CORRECT);
    }
  }, [quiz, recordStudy, addXP]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(() => {
    setShowTranscript(false);
    stop();
    if (pendingDiff) {
      quiz.startQuestion(pendingDiff);
      setPendingDiff(null);
    } else {
      quiz.nextQuestion();
    }
  }, [quiz.nextQuestion, quiz.startQuestion, stop, pendingDiff]); // eslint-disable-line react-hooks/exhaustive-deps

  // 난이도 선택 화면 (문제가 없을 때)
  if (!quiz.currentQuestion && !quiz.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/toeic')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">리스닝 문제풀기</h1>
        </div>

        {/* 이어풀기 */}
        {quiz.hasResumable && (
          <Card variant="highlight" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">이전 문제 이어풀기</p>
                <p className="text-sm text-blue-700">
                  풀던 문제가 있습니다 ({DIFF_LABELS[quiz.difficulty].label} 난이도)
                </p>
              </div>
              <Button size="sm" onClick={() => {}}>이어하기</Button>
            </div>
          </Card>
        )}

        {/* 통계 */}
        {quiz.totalSolved > 0 && (
          <Card padding="md">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{quiz.totalSolved}</p>
                <p className="text-xs text-gray-500">풀이 수</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {quiz.totalSolved > 0 ? Math.round((quiz.totalCorrect / quiz.totalSolved) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500">정답률</p>
              </div>
            </div>
          </Card>
        )}

        {/* 난이도 선택 */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">난이도 선택</h2>
          <div className="space-y-3">
            {(['easy', 'medium', 'hard'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => handleSelectDifficulty(diff)}
                className="w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 active:scale-[0.98] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${DIFF_LABELS[diff].color}`}>
                    {DIFF_LABELS[diff].label}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {diff === 'easy' ? '기초 듣기' : diff === 'medium' ? '대화 듣기' : '고급 듣기'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {diff === 'easy' ? '짧은 안내문, 메시지' : diff === 'medium' ? '2인 대화 (사무실, 매장)' : '긴 대화, 복잡한 상황'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 로딩
  if (quiz.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/toeic')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">문제 생성 중...</h1>
        </div>
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">AI가 리스닝 문제를 만들고 있어요</p>
        </div>
      </div>
    );
  }

  const q = quiz.currentQuestion!;

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
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">리스닝</h1>
          <p className="text-xs text-gray-400">{quiz.totalCorrect}/{quiz.totalSolved} 정답</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDiffPicker(!showDiffPicker)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${DIFF_LABELS[quiz.difficulty].color}`}
          >
            {DIFF_LABELS[quiz.difficulty].label}
            {pendingDiff && ` → ${DIFF_LABELS[pendingDiff].label}`}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDiffPicker && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {(['easy', 'medium', 'hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => handleChangeDifficulty(diff)}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
                    diff === quiz.difficulty ? 'font-bold text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${DIFF_LABELS[diff].color}`}>
                    {DIFF_LABELS[diff].label}
                  </span>
                  {diff === 'easy' ? '기초' : diff === 'medium' ? '대화' : '고급'}
                  {diff === quiz.difficulty && ' ✓'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 오디오 플레이어 */}
      <Card padding="lg" className="text-center">
        <button
          onClick={handlePlayAudio}
          className={`
            w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl
            transition-all duration-200
            ${isSpeaking
              ? 'bg-red-500 text-white scale-110 shadow-lg'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-95'}
          `}
        >
          {isSpeaking ? '⏹' : '🔊'}
        </button>
        <p className="text-sm text-gray-500 mt-3">
          {isSpeaking ? '재생 중... 탭하여 정지' : '탭하여 문제 듣기'}
        </p>
        {!quiz.showResult && (
          <button
            onClick={handlePlayAudio}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            다시 듣기
          </button>
        )}
      </Card>

      {/* 질문 */}
      <Card padding="md">
        <p className="font-semibold text-gray-900">{q.question}</p>
      </Card>

      {/* 선택지 */}
      <div className="space-y-2">
        {q.options.map((option, idx) => {
          let style = 'bg-white border-gray-200 hover:border-blue-400';
          if (quiz.showResult) {
            if (idx === q.correctIndex) {
              style = 'bg-green-50 border-green-500 text-green-800';
            } else if (idx === quiz.selectedAnswer && idx !== q.correctIndex) {
              style = 'bg-red-50 border-red-500 text-red-800';
            } else {
              style = 'bg-gray-50 border-gray-200 text-gray-400';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              disabled={quiz.showResult}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${style}`}
            >
              <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
            </button>
          );
        })}
      </div>

      {/* 결과 + 해설 */}
      {quiz.showResult && (
        <div className="space-y-3 animate-slide-up">
          <Card padding="md" className={quiz.isCorrect ? 'bg-green-50' : 'bg-red-50'}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{quiz.isCorrect ? '🎉' : '😢'}</span>
              <p className="font-bold text-lg">
                {quiz.isCorrect ? '정답!' : '오답'}
              </p>
            </div>
            <p className="text-sm text-gray-700">{q.explanation}</p>
          </Card>

          {/* 스크립트 보기 */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm text-blue-600 hover:underline"
          >
            {showTranscript ? '▾ 스크립트 닫기' : '▸ 스크립트 보기'}
          </button>
          {showTranscript && (
            <Card padding="md" className="bg-gray-50">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {q.transcript || q.audioText}
              </p>
            </Card>
          )}

          {/* 다음 문제 */}
          <Button onClick={handleNext} fullWidth size="lg">
            다음 문제
          </Button>
        </div>
      )}

      {/* 에러 */}
      {quiz.error && (
        <div className="text-center text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">
          {quiz.error}
        </div>
      )}

      {/* XP 팝업 */}
      <XPPopup amount={lastXPGain} show={quiz.showResult === true && quiz.isCorrect === true} />
    </div>
  );
}
