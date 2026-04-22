-- v4 스키마 — TOEIC 단어 마스터 DB + 사용자별 학습 추적
-- 목표: TOEIC 800~900 수준 단어/숙어를 DB에 저장하고,
--       사용자가 1~2만 단어를 다 볼 때까지 중복 없이 추천
-- 실행: Supabase Dashboard > SQL Editor

-- =========================================
-- 1. 단어 마스터 (공용 풀)
-- =========================================
CREATE TABLE IF NOT EXISTS toeic_vocabulary (
  id TEXT PRIMARY KEY,                   -- 콘텐츠 해시 기반 안정 ID (ai-vocab-xxxxx / seed-xxxxx)
  word TEXT NOT NULL,                    -- 표제어 또는 숙어
  meaning TEXT NOT NULL,                 -- 한글 뜻
  pronunciation TEXT,                    -- IPA 또는 공백
  part_of_speech TEXT NOT NULL,          -- noun / verb / adj / adv / idiom / phrasal_verb
  example_sentence TEXT NOT NULL,        -- TOEIC 문맥 예문
  category TEXT NOT NULL DEFAULT 'general',  -- business / finance / hr / marketing / daily / travel / general / idiom
  difficulty TEXT NOT NULL DEFAULT 'advanced',  -- basic / intermediate / advanced  (v4는 advanced 중심)
  target_score INT NOT NULL DEFAULT 850,      -- 지향 점수대 (700 / 800 / 850 / 900)
  is_idiom BOOLEAN NOT NULL DEFAULT false,    -- 숙어/구동사 여부
  source TEXT NOT NULL DEFAULT 'seed',        -- seed / ai / curated
  created_at TIMESTAMPTZ DEFAULT now(),
  -- 같은 단어 중복 방지 (단, 숙어는 표제어가 같아도 뜻이 다를 수 있으니 meaning 포함)
  CONSTRAINT toeic_vocabulary_word_meaning_unique UNIQUE (word, meaning)
);

CREATE INDEX IF NOT EXISTS idx_toeic_vocab_category ON toeic_vocabulary(category);
CREATE INDEX IF NOT EXISTS idx_toeic_vocab_difficulty ON toeic_vocabulary(difficulty);
CREATE INDEX IF NOT EXISTS idx_toeic_vocab_target ON toeic_vocabulary(target_score);
CREATE INDEX IF NOT EXISTS idx_toeic_vocab_is_idiom ON toeic_vocabulary(is_idiom);

-- =========================================
-- 2. 사용자별 학습 상태 (Leitner Box + 학습 이력)
-- =========================================
CREATE TABLE IF NOT EXISTS user_vocab_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  word_id TEXT NOT NULL REFERENCES toeic_vocabulary(id) ON DELETE CASCADE,
  box INT NOT NULL DEFAULT 1,            -- Leitner Box 1~5
  status TEXT NOT NULL DEFAULT 'learning',  -- learning / mastered / wrong (오답으로 재출현 가능)
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  next_review_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_user_vocab_user ON user_vocab_learned(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vocab_status ON user_vocab_learned(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_vocab_review ON user_vocab_learned(user_id, next_review_at);

-- =========================================
-- 3. RLS (기존 정책 스타일 따름 — anon 전체 허용, Auth RLS는 향후)
-- =========================================
ALTER TABLE toeic_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vocab_learned ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_toeic_vocab" ON toeic_vocabulary;
DROP POLICY IF EXISTS "anon_write_toeic_vocab" ON toeic_vocabulary;
DROP POLICY IF EXISTS "anon_all_user_vocab" ON user_vocab_learned;

CREATE POLICY "anon_read_toeic_vocab" ON toeic_vocabulary FOR SELECT USING (true);
CREATE POLICY "anon_write_toeic_vocab" ON toeic_vocabulary FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_all_user_vocab" ON user_vocab_learned FOR ALL USING (true) WITH CHECK (true);

-- =========================================
-- 4. 추천 쿼리 예시 (참고용, 실제는 API에서 사용)
-- =========================================
-- 사용자가 아직 안 본 단어 + 오답으로 표시된 단어를 우선 추출:
--
-- SELECT v.*
-- FROM toeic_vocabulary v
-- LEFT JOIN user_vocab_learned ul
--   ON ul.word_id = v.id AND ul.user_id = $1
-- WHERE ul.id IS NULL                          -- 아직 안 배운 것
--    OR ul.status = 'wrong'                     -- 또는 오답으로 재출현 예정
-- ORDER BY
--   CASE WHEN ul.status = 'wrong' THEN 0 ELSE 1 END,  -- 오답 먼저
--   random()
-- LIMIT 30;
