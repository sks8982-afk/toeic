-- v3 스키마 — TOEIC 모의고사 시험모드
-- 실행: Supabase Dashboard > SQL Editor

-- 1. 모의고사 세트 (AI 생성, 공유)
CREATE TABLE IF NOT EXISTS mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                    -- "AI 모의고사 #1"
  description TEXT,
  total_questions INT NOT NULL DEFAULT 0,
  listening_questions JSONB NOT NULL DEFAULT '[]',   -- Part 1~4
  reading_questions JSONB NOT NULL DEFAULT '[]',     -- Part 5~7
  time_limit_listening INT DEFAULT 2700,  -- 45분 (초)
  time_limit_reading INT DEFAULT 4500,    -- 75분 (초)
  difficulty TEXT DEFAULT 'medium',
  created_by TEXT,                         -- 생성자 user_id (AI면 'system')
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 사용자 시험 결과
CREATE TABLE IF NOT EXISTS mock_exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  exam_id UUID REFERENCES mock_exams(id),
  listening_score INT DEFAULT 0,          -- 리스닝 맞은 수
  listening_total INT DEFAULT 0,
  reading_score INT DEFAULT 0,            -- 리딩 맞은 수
  reading_total INT DEFAULT 0,
  estimated_score INT DEFAULT 0,          -- 예상 TOEIC 점수
  answers JSONB NOT NULL DEFAULT '[]',    -- 사용자 답안 전체
  time_spent_listening INT DEFAULT 0,     -- 소요 시간 (초)
  time_spent_reading INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_mock_exams_created ON mock_exams(created_at);
CREATE INDEX IF NOT EXISTS idx_mock_results_user ON mock_exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_results_exam ON mock_exam_results(exam_id);

-- RLS
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_mock_exams" ON mock_exams FOR SELECT USING (true);
CREATE POLICY "anon_insert_mock_exams" ON mock_exams FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_all_mock_results" ON mock_exam_results FOR ALL USING (true) WITH CHECK (true);
