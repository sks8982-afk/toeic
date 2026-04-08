// TOEIC 모의고사 — 시험 목록 + 생성 + 응시
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, LoadingSkeleton } from '@/shared/components/ui';
import { useAuth } from '@/shared/providers/AuthProvider';
import { supabase } from '@/shared/lib/supabase';
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
  const { addXP } = useXP();

  const [phase, setPhase] = useState<ExamPhase>('list');
  const [exams, setExams] = useState<MockExam[]>([]);
  const [currentExam, setCurrentExam] = useState<MockExam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 서버 TTS (긴 텍스트 안정적 재생)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

      const res = await fetch('/api/speak/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: 'en' }),
      });
      if (!res.ok) { setIsSpeaking(false); return; }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      await audio.play();
    } catch { setIsSpeaking(false); }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
  }, []);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());

  // 모의고사 목록 + 응시 이력 로드
  useEffect(() => {
    fetch('/api/toeic/mock-exam')
      .then(res => res.json())
      .then(data => setExams(data.exams ?? []))
      .finally(() => setIsLoadingList(false));

    // 내 응시 이력
    if (user) {
      supabase
        .from('mock_exam_results')
        .select('exam_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setCompletedExamIds(new Set(data.map(r => r.exam_id)));
        });
    }
  }, [user]);

  // 타이머
  useEffect(() => {
    if (phase !== 'listening' && phase !== 'reading') return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // 점진적 파트 생성 큐
  const [generatedQuestions, setGeneratedQuestions] = useState<QuestionItem[]>([]);
  const [genProgress, setGenProgress] = useState('');
  const generatingRef = useRef(false);

  // 파트별 문제 생성 함수
  const generatePart = useCallback(async (part: string, count: number): Promise<QuestionItem[]> => {
    try {
      const res = await fetch('/api/toeic/mock-exam/part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part, count }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.questions ?? [];
    } catch { return []; }
  }, []);

  // 새 모의고사 — 점진적 생성 (Part 3부터 시작, 나머지 백그라운드)
  const handleGenerate = useCallback(async () => {
    setPhase('generating');
    setGeneratedQuestions([]);
    generatingRef.current = true;

    // 실제 TOEIC 구성: Part3(13) + Part4(10) + Part5(30) + Part6(4) + Part7(15) = 72문제
    const parts = [
      { part: 'part3', count: 5, label: 'Part 3 대화 (리스닝)' },
      { part: 'part4', count: 5, label: 'Part 4 설명문 (리스닝)' },
      { part: 'part5', count: 10, label: 'Part 5 빈칸채우기 (리딩)' },
      { part: 'part6', count: 3, label: 'Part 6 장문빈칸 (리딩)' },
      { part: 'part7', count: 5, label: 'Part 7 독해 (리딩)' },
    ];

    // 첫 파트 먼저 생성 → 바로 시작
    setGenProgress(parts[0].label + ' 생성 중...');
    const firstBatch = await generatePart(parts[0].part, parts[0].count);
    if (firstBatch.length === 0) {
      alert('문제 생성에 실패했습니다.');
      setPhase('list');
      return;
    }

    setGeneratedQuestions(firstBatch);
    setAnswers(new Array(100).fill(null)); // 넉넉하게
    setCurrentIndex(0);
    setTimer(0);
    setPhase('listening');

    // 나머지 파트 백그라운드 생성
    for (let i = 1; i < parts.length; i++) {
      if (!generatingRef.current) break;
      setGenProgress(parts[i].label + ' 생성 중...');
      const batch = await generatePart(parts[i].part, parts[i].count);
      setGeneratedQuestions(prev => [...prev, ...batch]);
    }
    setGenProgress('');
    generatingRef.current = false;
  }, [generatePart]);

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

  // 현재 문제 (점진적 생성 or DB 로드)
  const allQuestions = currentExam
    ? [...currentExam.listening_questions, ...currentExam.reading_questions]
    : generatedQuestions;
  const currentQ = allQuestions[currentIndex];
  const isListeningSection = currentQ?.part === 'listening';
  const listeningCount = allQuestions.filter(q => q.part === 'listening').length;

  // 정답 선택
  const handleSelect = (idx: number) => {
    if (showAnswer) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = idx;
    setAnswers(newAnswers);
    setShowAnswer(true);
  };

  // 다음 문제 (점진적 생성 대기 포함)
  const handleNext = () => {
    setShowAnswer(false);
    stop();

    const nextIdx = currentIndex + 1;

    // 리스닝 → 리딩 전환
    if (phase === 'listening' && nextIdx < allQuestions.length && allQuestions[nextIdx]?.part === 'reading') {
      setPhase('reading');
    }

    if (nextIdx < allQuestions.length) {
      setCurrentIndex(nextIdx);
    } else if (generatingRef.current) {
      // 아직 생성 중 → 잠시 대기
      setGenProgress('다음 문제 생성 대기 중...');
    } else {
      handleFinish();
    }
  };

  // 생성 완료 시 대기 중인 다음 문제로 자동 진행
  useEffect(() => {
    if (genProgress === '다음 문제 생성 대기 중...' && currentIndex + 1 < allQuestions.length) {
      setGenProgress('');
      setCurrentIndex(currentIndex + 1);
    }
  }, [allQuestions.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <p className="text-sm text-gray-500 mb-4">실제 TOEIC과 유사한 리스닝 5문제 + 리딩 5문제 (약 20분)</p>
          <Button onClick={() => handleGenerate()} fullWidth size="lg">
            새 모의고사 생성하기
          </Button>
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
              {/* 미응시 먼저 표시 */}
              {exams
                .sort((a, b) => {
                  const aCompleted = completedExamIds.has(a.id);
                  const bCompleted = completedExamIds.has(b.id);
                  if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
                  return 0;
                })
                .map(exam => {
                  const isCompleted = completedExamIds.has(exam.id);
                  return (
                    <Card key={exam.id} variant="interactive" padding="md" onClick={() => handleStartExam(exam.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>{exam.title}</p>
                            {isCompleted && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">응시완료</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{exam.description}</p>
                        </div>
                        <span className="text-xs text-blue-600 font-medium shrink-0">
                          {isCompleted ? '다시 풀기' : '응시하기'}
                        </span>
                      </div>
                    </Card>
                  );
                })}
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

  // === 문제 대기 중 ===
  if (!currentQ && genProgress) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-bold text-gray-900">{genProgress}</p>
        <p className="text-sm text-gray-500 mt-1">{allQuestions.length}문제 생성 완료</p>
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
          <span className="text-sm text-gray-500">
            {currentIndex + 1}/{allQuestions.length}
            {generatingRef.current && <span className="text-blue-500 ml-1 text-xs">(생성중...)</span>}
          </span>
        </div>
        <span className="text-sm font-mono font-bold text-gray-700">{formatTime(timer)}</span>
      </div>

      {/* 리스닝: 오디오 재생 */}
      {isListeningSection && currentQ.audioText && (
        <Card padding="md" className="text-center">
          <button
            onClick={() => isSpeaking ? stop() : speak(currentQ.audioText!)}
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

      {/* 리딩: 지문 + 질문 */}
      {!isListeningSection && currentQ.sentence && (
        <Card padding="md">
          {currentQ.grammarPoint && (
            <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full mb-2">
              {currentQ.grammarPoint}
            </span>
          )}
          <p className="text-base leading-relaxed text-gray-900 whitespace-pre-line">{currentQ.sentence}</p>
          {currentQ.question && (
            <p className="font-semibold text-gray-800 mt-3 pt-3 border-t border-gray-200">{currentQ.question}</p>
          )}
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
