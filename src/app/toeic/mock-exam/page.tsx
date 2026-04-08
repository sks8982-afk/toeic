// TOEIC 모의고사 — 시험 목록 + 생성 + 응시
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, LoadingSkeleton } from '@/shared/components/ui';
import { useAuth } from '@/shared/providers/AuthProvider';
import { supabase } from '@/shared/lib/supabase';
import { useTextToSpeech } from '@/features/speak/hooks/useTextToSpeech';
import { useXP } from '@/features/gamification/hooks/useXP';
import { XP_REWARDS } from '@/features/gamification/lib/xp-table';

interface MockExam {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  difficulty: string;
  listening_questions: QuestionItem[];
  reading_questions: QuestionItem[];
  created_at: string;
}

interface QuestionItem {
  audioText?: string;
  sentence?: string;
  question?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  grammarPoint?: string;
  part: 'listening' | 'reading';
}

type ExamPhase = 'list' | 'generating' | 'listening' | 'reading' | 'result';

export default function MockExamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { speak, stop, isSpeaking } = useTextToSpeech();
  const { addXP } = useXP();

  const [phase, setPhase] = useState<ExamPhase>('list');
  const [exams, setExams] = useState<MockExam[]>([]);
  const [currentExam, setCurrentExam] = useState<MockExam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(true);

  // 모의고사 목록 로드
  useEffect(() => {
    fetch('/api/toeic/mock-exam')
      .then(res => res.json())
      .then(data => setExams(data.exams ?? []))
      .finally(() => setIsLoadingList(false));
  }, []);

  // 타이머
  useEffect(() => {
    if (phase !== 'listening' && phase !== 'reading') return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // 새 모의고사 생성
  const handleGenerate = useCallback(async (difficulty: string) => {
    setPhase('generating');
    try {
      const res = await fetch('/api/toeic/mock-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty, listeningCount: 10, readingCount: 10 }),
      });
      const data = await res.json();
      if (data.exam) {
        setCurrentExam(data.exam);
        setAnswers(new Array(data.exam.total_questions).fill(null));
        setCurrentIndex(0);
        setTimer(0);
        setPhase('listening');
      } else {
        alert('모의고사 생성에 실패했습니다.');
        setPhase('list');
      }
    } catch {
      alert('오류가 발생했습니다.');
      setPhase('list');
    }
  }, []);

  // 기존 모의고사 시작
  const handleStartExam = useCallback(async (examId: string) => {
    const { data } = await supabase.from('mock_exams').select('*').eq('id', examId).single();
    if (data) {
      setCurrentExam(data as MockExam);
      setAnswers(new Array(data.total_questions).fill(null));
      setCurrentIndex(0);
      setTimer(0);
      setPhase('listening');
    }
  }, []);

  // 현재 문제
  const allQuestions = currentExam
    ? [...currentExam.listening_questions, ...currentExam.reading_questions]
    : [];
  const currentQ = allQuestions[currentIndex];
  const isListeningSection = currentQ?.part === 'listening';
  const listeningCount = currentExam?.listening_questions.length ?? 0;

  // 정답 선택
  const handleSelect = (idx: number) => {
    if (showAnswer) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = idx;
    setAnswers(newAnswers);
    setShowAnswer(true);
  };

  // 다음 문제
  const handleNext = () => {
    setShowAnswer(false);
    stop();

    // 리스닝 → 리딩 전환
    if (currentIndex === listeningCount - 1 && phase === 'listening') {
      setPhase('reading');
    }

    if (currentIndex < allQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 시험 종료 → 결과
      handleFinish();
    }
  };

  // 시험 완료
  const handleFinish = async () => {
    setPhase('result');
    stop();

    if (!currentExam || !user) return;

    let listeningCorrect = 0;
    let readingCorrect = 0;

    allQuestions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) {
        if (i < listeningCount) listeningCorrect++;
        else readingCorrect++;
      }
    });

    const totalCorrect = listeningCorrect + readingCorrect;
    const estimated = Math.round(100 + (totalCorrect / allQuestions.length) * 395) * 2;
    addXP(totalCorrect * XP_REWARDS.TOEIC_CORRECT);

    // DB에 결과 저장
    await supabase.from('mock_exam_results').insert({
      user_id: user.id,
      exam_id: currentExam.id,
      listening_score: listeningCorrect,
      listening_total: listeningCount,
      reading_score: readingCorrect,
      reading_total: currentExam.reading_questions.length,
      estimated_score: Math.min(990, estimated),
      answers,
      time_spent_listening: timer,
      started_at: new Date(Date.now() - timer * 1000).toISOString(),
      completed_at: new Date().toISOString(),
    });
  };

  // === 목록 화면 ===
  if (phase === 'list') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/toeic')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">TOEIC 모의고사</h1>
        </div>

        {/* 새 모의고사 생성 */}
        <Card padding="lg">
          <h2 className="font-bold text-gray-900 mb-3">AI 모의고사 생성</h2>
          <p className="text-sm text-gray-500 mb-4">AI가 리스닝 10문제 + 리딩 10문제를 만들어줍니다</p>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => handleGenerate('easy')} variant="secondary" fullWidth>기초</Button>
            <Button onClick={() => handleGenerate('medium')} fullWidth>중급</Button>
            <Button onClick={() => handleGenerate('hard')} variant="secondary" fullWidth>고급</Button>
          </div>
        </Card>

        {/* 기존 모의고사 목록 */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">모의고사 목록</h2>
          {isLoadingList ? (
            <LoadingSkeleton lines={3} />
          ) : exams.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">아직 모의고사가 없습니다. 위에서 생성해보세요!</p>
          ) : (
            <div className="space-y-2">
              {exams.map(exam => (
                <Card key={exam.id} variant="interactive" padding="md" onClick={() => handleStartExam(exam.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{exam.title}</p>
                      <p className="text-xs text-gray-500">{exam.description}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === 생성 중 ===
  if (phase === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-lg font-bold text-gray-900">모의고사를 만들고 있어요</p>
        <p className="text-sm text-gray-500 mt-1">리스닝 + 리딩 문제 생성 중...</p>
      </div>
    );
  }

  // === 결과 화면 ===
  if (phase === 'result' && currentExam) {
    let listeningCorrect = 0;
    let readingCorrect = 0;
    allQuestions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) {
        if (i < listeningCount) listeningCorrect++;
        else readingCorrect++;
      }
    });
    const totalCorrect = listeningCorrect + readingCorrect;
    const estimated = Math.min(990, Math.round(100 + (totalCorrect / allQuestions.length) * 395) * 2);

    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">시험 결과</h1>

        <Card padding="lg" className="text-center">
          <p className="text-5xl font-bold text-blue-600">{estimated}</p>
          <p className="text-sm text-gray-500 mt-1">예상 TOEIC 점수</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card padding="md" className="text-center">
            <p className="text-2xl font-bold text-purple-600">{listeningCorrect}/{listeningCount}</p>
            <p className="text-xs text-gray-500">리스닝</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-2xl font-bold text-green-600">{readingCorrect}/{currentExam.reading_questions.length}</p>
            <p className="text-xs text-gray-500">리딩</p>
          </Card>
        </div>

        <Card padding="md" className="text-center">
          <p className="text-lg font-bold text-gray-900">{formatTime(timer)}</p>
          <p className="text-xs text-gray-500">소요 시간</p>
        </Card>

        <div className="space-y-3">
          <Button onClick={() => { setPhase('list'); setCurrentExam(null); }} fullWidth size="lg">
            목록으로
          </Button>
          <Button onClick={() => router.push('/toeic')} fullWidth size="lg" variant="secondary">
            TOEIC 홈
          </Button>
        </div>
      </div>
    );
  }

  // === 문제 풀기 화면 ===
  if (!currentQ) return <LoadingSkeleton lines={5} />;

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* 헤더: 타이머 + 진행 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            isListeningSection ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
          }`}>
            {isListeningSection ? '리스닝' : '리딩'}
          </span>
          <span className="text-sm text-gray-500">{currentIndex + 1}/{allQuestions.length}</span>
        </div>
        <span className="text-sm font-mono font-bold text-gray-700">{formatTime(timer)}</span>
      </div>

      {/* 리스닝: 오디오 재생 */}
      {isListeningSection && currentQ.audioText && (
        <Card padding="md" className="text-center">
          <button
            onClick={() => isSpeaking ? stop() : speak(currentQ.audioText!, 'en')}
            className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl transition-all ${
              isSpeaking ? 'bg-red-500 text-white scale-110' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
          >
            {isSpeaking ? '⏹' : '🔊'}
          </button>
          <p className="text-xs text-gray-400 mt-2">탭하여 문제 듣기</p>
        </Card>
      )}

      {/* 리스닝 질문 */}
      {isListeningSection && currentQ.question && (
        <Card padding="md">
          <p className="font-semibold text-gray-900">{currentQ.question}</p>
        </Card>
      )}

      {/* 리딩: 문장 */}
      {!isListeningSection && currentQ.sentence && (
        <Card padding="md">
          {currentQ.grammarPoint && (
            <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full mb-2">
              {currentQ.grammarPoint}
            </span>
          )}
          <p className="text-base leading-relaxed text-gray-900">{currentQ.sentence}</p>
        </Card>
      )}

      {/* 선택지 */}
      <div className="space-y-2">
        {currentQ.options.map((opt, idx) => {
          let style = 'bg-white border-gray-200 hover:border-blue-400';
          if (showAnswer) {
            if (idx === currentQ.correctIndex) style = 'bg-green-50 border-green-500 text-green-800';
            else if (idx === answers[currentIndex] && idx !== currentQ.correctIndex) style = 'bg-red-50 border-red-500 text-red-800';
            else style = 'bg-gray-50 border-gray-200 text-gray-400';
          }
          return (
            <button key={idx} onClick={() => handleSelect(idx)} disabled={showAnswer}
              className={`w-full p-3.5 rounded-xl border-2 text-left transition-all text-sm ${style}`}>
              <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {opt}
            </button>
          );
        })}
      </div>

      {/* 해설 + 다음 */}
      {showAnswer && (
        <div className="space-y-3 animate-slide-up">
          <Card padding="md" className={answers[currentIndex] === currentQ.correctIndex ? 'bg-green-50' : 'bg-red-50'}>
            <p className="text-sm text-gray-700">{currentQ.explanation}</p>
          </Card>
          <Button onClick={handleNext} fullWidth size="lg">
            {currentIndex < allQuestions.length - 1 ? '다음 문제' : '결과 보기'}
          </Button>
        </div>
      )}
    </div>
  );
}
