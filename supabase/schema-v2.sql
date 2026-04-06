-- v2 스키마 — 모든 학습 내역 DB 저장
-- 실행: Supabase Dashboard > SQL Editor

-- 1. TOEIC 문제풀이 내역
CREATE TABLE IF NOT EXISTS toeic_quiz_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  question_type TEXT NOT NULL,          -- pos, tense, agreement, etc.
  difficulty TEXT NOT NULL,             -- easy, medium, hard
  question_data JSONB NOT NULL,         -- 전체 문제 데이터
  selected_answer INT NOT NULL,
  correct_answer INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 리스닝 문제풀이 내역
CREATE TABLE IF NOT EXISTS listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question_data JSONB NOT NULL,
  selected_answer INT NOT NULL,
  correct_answer INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 단어 학습 내역 (개별 학습 로그)
CREATE TABLE IF NOT EXISTS vocab_study_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  word_id TEXT NOT NULL,
  word TEXT NOT NULL,
  action TEXT NOT NULL,                 -- 'know', 'unsure', 'unknown', 'quiz_correct', 'quiz_wrong'
  box_before INT,
  box_after INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Speak 대화 세션 내역
CREATE TABLE IF NOT EXISTS speak_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  scenario_id TEXT,
  scenario_title TEXT,
  level INT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  turn_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- 5. 일일 학습 요약 (대시보드/분석용)
CREATE TABLE IF NOT EXISTS daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  toeic_solved INT DEFAULT 0,
  toeic_correct INT DEFAULT 0,
  listening_solved INT DEFAULT 0,
  listening_correct INT DEFAULT 0,
  vocab_learned INT DEFAULT 0,
  vocab_reviewed INT DEFAULT 0,
  speak_sessions INT DEFAULT 0,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_toeic_history_user ON toeic_quiz_history(user_id);
CREATE INDEX IF NOT EXISTS idx_toeic_history_date ON toeic_quiz_history(created_at);
CREATE INDEX IF NOT EXISTS idx_listening_history_user ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_log_user ON vocab_study_log(user_id);
CREATE INDEX IF NOT EXISTS idx_speak_sessions_user ON speak_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_summary_user ON daily_summary(user_id, date);

-- RLS
ALTER TABLE toeic_quiz_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_study_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE speak_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;

-- anon 전체 허용 (v2에서 Auth RLS로 전환)
CREATE POLICY "anon_all_toeic_history" ON toeic_quiz_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_listening_history" ON listening_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_vocab_log" ON vocab_study_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_speak_sessions" ON speak_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_daily_summary" ON daily_summary FOR ALL USING (true) WITH CHECK (true);
