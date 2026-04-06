// 학습 활동 DB 기록 — 모든 학습 내역을 Supabase에 비동기 저장
import { supabase } from './supabase';

// TOEIC 문제풀이 기록
export async function logToeicQuiz(
  userId: string,
  questionType: string,
  difficulty: string,
  questionData: unknown,
  selectedAnswer: number,
  correctAnswer: number,
  isCorrect: boolean,
) {
  await supabase.from('toeic_quiz_history').insert({
    user_id: userId,
    question_type: questionType,
    difficulty,
    question_data: questionData,
    selected_answer: selectedAnswer,
    correct_answer: correctAnswer,
    is_correct: isCorrect,
  });
}

// 리스닝 문제풀이 기록
export async function logListeningQuiz(
  userId: string,
  difficulty: string,
  questionData: unknown,
  selectedAnswer: number,
  correctAnswer: number,
  isCorrect: boolean,
) {
  await supabase.from('listening_history').insert({
    user_id: userId,
    difficulty,
    question_data: questionData,
    selected_answer: selectedAnswer,
    correct_answer: correctAnswer,
    is_correct: isCorrect,
  });
}

// 단어 학습 기록
export async function logVocabStudy(
  userId: string,
  wordId: string,
  word: string,
  action: 'know' | 'unsure' | 'unknown' | 'quiz_correct' | 'quiz_wrong',
  boxBefore: number,
  boxAfter: number,
) {
  await supabase.from('vocab_study_log').insert({
    user_id: userId,
    word_id: wordId,
    word,
    action,
    box_before: boxBefore,
    box_after: boxAfter,
  });
}

// Speak 대화 세션 저장
export async function logSpeakSession(
  userId: string,
  scenarioId: string | undefined,
  scenarioTitle: string | undefined,
  level: number,
  messages: unknown[],
) {
  await supabase.from('speak_sessions').insert({
    user_id: userId,
    scenario_id: scenarioId ?? null,
    scenario_title: scenarioTitle ?? null,
    level,
    messages,
    turn_count: messages.length,
    ended_at: new Date().toISOString(),
  });
}

// 일일 요약 업데이트 (upsert)
export async function updateDailySummary(
  userId: string,
  field: 'toeic_solved' | 'toeic_correct' | 'listening_solved' | 'listening_correct' | 'vocab_learned' | 'vocab_reviewed' | 'speak_sessions' | 'xp_earned',
  increment: number = 1,
) {
  const today = new Date().toISOString().split('T')[0];

  // 먼저 오늘 레코드 존재 확인
  const { data } = await supabase
    .from('daily_summary')
    .select(field)
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (data) {
    // 기존 레코드 업데이트
    const currentVal = (data as Record<string, number>)[field] ?? 0;
    await supabase
      .from('daily_summary')
      .update({ [field]: currentVal + increment })
      .eq('user_id', userId)
      .eq('date', today);
  } else {
    // 새 레코드 생성
    await supabase
      .from('daily_summary')
      .insert({ user_id: userId, date: today, [field]: increment });
  }
}
