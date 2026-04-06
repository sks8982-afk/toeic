-- Design Ref: §3 — Supabase 데이터베이스 스키마
-- 실행: Supabase Dashboard > SQL Editor에서 실행

-- 1. 단어 마스터 데이터
CREATE TABLE IF NOT EXISTS vocabulary_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  pronunciation TEXT,
  part_of_speech TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('business','finance','hr','marketing','daily','travel')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic','intermediate','advanced')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 시나리오 마스터 데이터
CREATE TABLE IF NOT EXISTS speak_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_ko TEXT NOT NULL,
  description TEXT NOT NULL,
  min_level INT NOT NULL DEFAULT 1,
  max_level INT NOT NULL DEFAULT 5,
  missions JSONB NOT NULL DEFAULT '[]',
  key_expressions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 사용자 학습 진행
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  streak INT DEFAULT 0,
  last_study_date DATE,
  settings JSONB DEFAULT '{}',
  toeic_stats JSONB DEFAULT '{}',
  speak_stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 단어 학습 상태 (Leitner Box)
CREATE TABLE IF NOT EXISTS vocab_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  word_id UUID NOT NULL REFERENCES vocabulary_words(id),
  box INT NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  last_reviewed TIMESTAMPTZ,
  next_review_due TIMESTAMPTZ NOT NULL DEFAULT now(),
  correct_streak INT DEFAULT 0,
  total_attempts INT DEFAULT 0,
  total_correct INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, word_id)
);

-- 5. TOEIC 오답 노트
CREATE TABLE IF NOT EXISTS toeic_wrong_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  question_data JSONB NOT NULL,
  wrong_at TIMESTAMPTZ DEFAULT now(),
  review_due TIMESTAMPTZ NOT NULL,
  review_count INT DEFAULT 0,
  interval_days INT DEFAULT 1,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_vocab_progress_device ON vocab_progress(device_id);
CREATE INDEX IF NOT EXISTS idx_vocab_progress_due ON vocab_progress(next_review_due);
CREATE INDEX IF NOT EXISTS idx_wrong_answers_device ON toeic_wrong_answers(device_id);
CREATE INDEX IF NOT EXISTS idx_wrong_answers_due ON toeic_wrong_answers(review_due);
CREATE INDEX IF NOT EXISTS idx_vocabulary_category ON vocabulary_words(category);
CREATE INDEX IF NOT EXISTS idx_vocabulary_difficulty ON vocabulary_words(difficulty);

-- RLS
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE speak_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE toeic_wrong_answers ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (마스터 데이터)
CREATE POLICY "public_read_vocabulary" ON vocabulary_words FOR SELECT USING (true);
CREATE POLICY "public_read_scenarios" ON speak_scenarios FOR SELECT USING (true);

-- 사용자 데이터 정책 (anon으로 전체 허용 — v2에서 Auth 기반으로 전환)
CREATE POLICY "anon_all_user_progress" ON user_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_vocab_progress" ON vocab_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_wrong_answers" ON toeic_wrong_answers FOR ALL USING (true) WITH CHECK (true);
