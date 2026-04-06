# Design: TOEIC & Speak 영어학습 플랫폼

> Created: 2026-04-06
> Phase: Design
> Architecture: Option C — Pragmatic Balance
> Plan Reference: docs/01-plan/features/toeic-speak.plan.md

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | TOEIC 시험 준비와 영어 회화 연습을 하나의 플랫폼에서 효율적으로 할 수 있는 학습 도구 필요 |
| **WHO** | TOEIC 준비 중인 한국 영어 학습자 (대학생, 취준생, 직장인) |
| **RISK** | STT 브라우저 호환성, Gemini API 응답 지연, 발음 평가 정확도 |
| **SUCCESS** | TOEIC 문제풀이 정상 동작, AI 대화 실시간 응답 < 3초, 발음/문법 피드백 제공 |
| **SCOPE** | 메인 선택 화면 + TOEIC(Part5 문제풀이, 단어장) + Speak(AI 대화 5레벨, STT/TTS, 피드백) + 게이미피케이션 |

---

## 1. Overview

### 1.1 선택된 아키텍처: Option C — Pragmatic Balance

기능(feature) 기반 폴더 구조로 관련 코드를 한 곳에 모으되, 공통 로직은 shared/로 분리. 개발 속도와 유지보수 사이의 균형을 추구.

### 1.2 기술 결정

| 결정 사항 | 선택 | 근거 |
|-----------|------|------|
| 폴더 구조 | Feature-based | 기능별 응집도 높음, 찾기 쉬움 |
| 상태 관리 | React Context + Custom Hooks | React 19 내장, 외부 라이브러리 불필요 |
| 데이터 접근 | Supabase Client 직접 사용 + 서비스 함수 | 단순한 쿼리는 직접, 복잡한 로직은 서비스 함수 |
| API 통신 | Next.js Route Handlers | API 키 보호, 서버 사이드 처리 |
| 스타일링 | Tailwind CSS 4 | 유틸리티 우선, 모바일 반응형 |
| SRS 엔진 | 커스텀 Leitner Box | 외부 라이브러리 불필요한 단순 로직 |

---

## 2. 프로젝트 구조

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # 루트 레이아웃 (BottomNav, Providers)
│   ├── page.tsx                      # 메인 화면 (TOEIC/Speak 선택)
│   ├── toeic/
│   │   ├── layout.tsx                # TOEIC 섹션 레이아웃
│   │   ├── quiz/
│   │   │   ├── page.tsx              # 문제풀이 메인 (유형 선택)
│   │   │   └── [sessionId]/page.tsx  # 풀이 세션 (한 문제씩)
│   │   ├── vocabulary/
│   │   │   └── page.tsx              # 단어 학습 메인
│   │   └── dashboard/
│   │       └── page.tsx              # 학습 대시보드
│   ├── speak/
│   │   ├── layout.tsx                # Speak 섹션 레이아웃
│   │   ├── levels/page.tsx           # 레벨 선택
│   │   ├── voice/page.tsx            # 음성 캐릭터 선택
│   │   ├── scenarios/page.tsx        # 시나리오 목록
│   │   ├── chat/
│   │   │   └── [scenarioId]/page.tsx # AI 대화 화면
│   │   └── report/
│   │       └── [sessionId]/page.tsx  # 대화 리포트
│   ├── profile/
│   │   └── page.tsx                  # 프로필 + 학습 통계
│   └── api/
│       ├── toeic/
│       │   └── generate/route.ts     # POST: Gemini 문제 생성
│       ├── speak/
│       │   ├── chat/route.ts         # POST: Gemini AI 대화
│       │   ├── tts/route.ts          # POST: Google Cloud TTS
│       │   └── feedback/route.ts     # POST: 피드백 분석
│       └── vocabulary/
│           └── words/route.ts        # GET: 단어 목록
│
├── features/
│   ├── toeic/
│   │   ├── components/
│   │   │   ├── QuizCard.tsx          # 문제 카드 (문장 + 4지선다)
│   │   │   ├── FeedbackSheet.tsx     # 정답/오답 해설 슬라이드업
│   │   │   ├── TypeSelector.tsx      # 문법 유형 선택 칩
│   │   │   ├── WrongNoteList.tsx     # 오답 노트 목록
│   │   │   └── DashboardCharts.tsx   # 히트맵 + 그래프
│   │   ├── hooks/
│   │   │   ├── useToeicQuiz.ts       # 퀴즈 세션 관리
│   │   │   ├── useWrongAnswers.ts    # 오답 노트 SRS 관리
│   │   │   └── useToeicStats.ts      # 유형별 통계
│   │   └── lib/
│   │       ├── generate-prompt.ts    # Gemini 프롬프트 빌더
│   │       └── scoring.ts            # 점수 계산, 적응형 난이도
│   │
│   ├── speak/
│   │   ├── components/
│   │   │   ├── ChatBubble.tsx        # 채팅 버블 (AI/사용자)
│   │   │   ├── MicButton.tsx         # 탭투스픽 마이크 + 파형
│   │   │   ├── VoiceCard.tsx         # 음성 캐릭터 선택 카드
│   │   │   ├── ScenarioCard.tsx      # 시나리오 선택 카드
│   │   │   ├── FeedbackCard.tsx      # 피드백 접이식 카드
│   │   │   ├── MiniFeedback.tsx      # Great/Good/TryAgain 뱃지
│   │   │   └── ConversationReport.tsx # 종합 리포트
│   │   ├── hooks/
│   │   │   ├── useSpeechRecognition.ts # Web Speech API STT 래퍼
│   │   │   ├── useTextToSpeech.ts    # Google Cloud TTS 호출
│   │   │   ├── useChat.ts            # Gemini 대화 흐름 관리
│   │   │   └── useFeedback.ts        # 피드백 분석 관리
│   │   └── lib/
│   │       ├── scenarios.ts          # 시나리오 데이터 정의
│   │       ├── voice-characters.ts   # 음성 캐릭터 데이터
│   │       └── pronunciation.ts      # 발음 비교 유틸 (Levenshtein)
│   │
│   ├── vocabulary/
│   │   ├── components/
│   │   │   ├── Flashcard.tsx         # 플래시카드 (스와이프)
│   │   │   ├── QuizMode.tsx          # 4가지 퀴즈 모드
│   │   │   ├── SelfAssessButtons.tsx # 몰라요/애매/알아요
│   │   │   ├── BoxProgress.tsx       # Leitner Box 진행도 바 차트
│   │   │   └── SessionHeader.tsx     # "복습 N개 + 신규 N개" 헤더
│   │   ├── hooks/
│   │   │   ├── useLeitnerBox.ts      # SRS 엔진 (박스 이동, 스케줄링)
│   │   │   ├── useVocabSession.ts    # 일일 세션 구성 (복습+신규)
│   │   │   └── useVocabStats.ts      # 학습 통계
│   │   └── lib/
│   │       └── leitner-engine.ts     # Leitner Box 핵심 로직 (순수 함수)
│   │
│   └── gamification/
│       ├── components/
│       │   ├── XPBar.tsx             # XP 프로그레스 바
│       │   ├── StreakBadge.tsx        # 스트릭 불꽃 아이콘
│       │   ├── LevelUpModal.tsx      # 레벨업 축하 모달
│       │   ├── XPPopup.tsx           # +XP 떠오르기 애니메이션
│       │   └── DailyQuests.tsx       # 데일리 퀘스트 체크리스트
│       ├── hooks/
│       │   ├── useXP.ts              # XP 획득/레벨 계산
│       │   ├── useStreak.ts          # 스트릭 관리
│       │   └── useDailyQuests.ts     # 데일리 퀘스트 상태
│       └── lib/
│           ├── xp-table.ts           # 레벨별 필요 XP 테이블
│           └── quest-definitions.ts  # 퀘스트 정의
│
├── shared/
│   ├── components/ui/
│   │   ├── Button.tsx                # 공통 버튼
│   │   ├── Card.tsx                  # 공통 카드
│   │   ├── Modal.tsx                 # 공통 모달
│   │   ├── ProgressBar.tsx           # 공통 프로그레스 바
│   │   ├── BottomNav.tsx             # 하단 네비게이션
│   │   └── LoadingSkeleton.tsx       # 로딩 스켈레톤
│   ├── hooks/
│   │   ├── useLocalStorage.ts        # LocalStorage 래퍼
│   │   └── useUserProgress.ts        # 전체 학습 진행 상태 관리
│   ├── lib/
│   │   ├── supabase.ts               # Supabase 클라이언트 (브라우저/서버)
│   │   ├── gemini.ts                 # Gemini API 클라이언트 (서버 전용)
│   │   └── google-tts.ts             # Google Cloud TTS 클라이언트 (서버 전용)
│   └── providers/
│       ├── ProgressProvider.tsx       # 학습 진행 Context Provider
│       └── GamificationProvider.tsx   # XP/스트릭 Context Provider
│
├── data/
│   └── vocabulary/
│       ├── business.json             # 비즈니스 단어
│       ├── finance.json              # 금융 단어
│       ├── hr.json                   # 인사 단어
│       ├── marketing.json            # 마케팅 단어
│       ├── daily.json                # 일상 단어
│       └── travel.json               # 여행 단어
│
└── types/
    ├── toeic.ts                      # TOEIC 관련 타입
    ├── speak.ts                      # Speak 관련 타입
    ├── vocabulary.ts                 # 단어 관련 타입
    ├── gamification.ts               # 게이미피케이션 타입
    └── index.ts                      # 공통 타입 re-export
```

---

## 3. Supabase 데이터베이스 설계

### 3.1 테이블 구조

```sql
-- 단어 마스터 데이터 (Read-only, 관리자가 관리)
CREATE TABLE vocabulary_words (
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

-- 시나리오 마스터 데이터
CREATE TABLE speak_scenarios (
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

-- 사용자 학습 진행 (향후 Auth 연동 시 user_id 추가)
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,           -- 로그인 전 기기 식별
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

-- 단어 학습 상태 (Leitner Box)
CREATE TABLE vocab_progress (
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

-- TOEIC 오답 노트
CREATE TABLE toeic_wrong_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  question_data JSONB NOT NULL,             -- ToeicQuestion 전체 저장
  wrong_at TIMESTAMPTZ DEFAULT now(),
  review_due TIMESTAMPTZ NOT NULL,
  review_count INT DEFAULT 0,
  interval_days INT DEFAULT 1,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_vocab_progress_device ON vocab_progress(device_id);
CREATE INDEX idx_vocab_progress_due ON vocab_progress(next_review_due);
CREATE INDEX idx_wrong_answers_device ON toeic_wrong_answers(device_id);
CREATE INDEX idx_wrong_answers_due ON toeic_wrong_answers(review_due);
```

### 3.2 RLS (Row Level Security)
```sql
-- 현재는 device_id 기반 (향후 Auth 전환 시 auth.uid() 사용)
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE toeic_wrong_answers ENABLE ROW LEVEL SECURITY;

-- v1: anon key로 접근 허용 (device_id 필터는 클라이언트에서)
-- v2: Auth 추가 시 user_id 기반 RLS 정책으로 전환
CREATE POLICY "public_read_vocabulary" ON vocabulary_words FOR SELECT USING (true);
CREATE POLICY "public_read_scenarios" ON speak_scenarios FOR SELECT USING (true);
```

---

## 4. API 상세 설계

### 4.1 POST `/api/toeic/generate`
```typescript
// Request
{ type: GrammarType, difficulty: 'easy'|'medium'|'hard', count?: number }

// Response
{ questions: ToeicQuestion[] }

// 내부: Gemini API 호출 → JSON 파싱 → 유효성 검증 → 반환
```

### 4.2 POST `/api/speak/chat`
```typescript
// Request
{
  messages: { role: 'user'|'ai', text: string }[],
  level: 1|2|3|4|5,
  scenarioId?: string,
  voiceId?: string
}

// Response (Streaming)
{ text: string, feedback?: { grammar: GrammarIssue[], suggestions: string[] } }
```

### 4.3 POST `/api/speak/tts`
```typescript
// Request
{ text: string, voiceId: string }

// Response
ArrayBuffer (audio/mp3)

// 캐싱: 같은 text+voiceId 조합은 메모리/파일 캐시
```

### 4.4 POST `/api/speak/feedback`
```typescript
// Request
{ expected: string, userSaid: string, level: number }

// Response
{
  pronunciationScore: number,      // 0~100
  grammarIssues: GrammarIssue[],
  suggestions: string[],
  overallRating: 'great'|'good'|'try_again'
}
```

---

## 5. 핵심 로직 설계

### 5.1 Leitner Box SRS 엔진 (`features/vocabulary/lib/leitner-engine.ts`)

```typescript
const BOX_INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 } as const;

function promoteWord(progress: VocabProgress): VocabProgress {
  const nextBox = Math.min(progress.box + 1, 5) as 1|2|3|4|5;
  return {
    ...progress,
    box: nextBox,
    correctStreak: progress.correctStreak + 1,
    nextReviewDue: addDays(new Date(), BOX_INTERVALS[nextBox]),
    lastReviewed: new Date().toISOString(),
  };
}

function demoteWord(progress: VocabProgress): VocabProgress {
  return {
    ...progress,
    box: 1,
    correctStreak: 0,
    nextReviewDue: addDays(new Date(), 1),
    lastReviewed: new Date().toISOString(),
  };
}

function getDueWords(words: VocabProgress[], today: Date): VocabProgress[] {
  return words.filter(w => new Date(w.nextReviewDue) <= today);
}

function buildDailySession(allWords: VocabProgress[], newWords: VocabWord[], target: number) {
  const today = new Date();
  const dueReviews = getDueWords(allWords, today);
  const newSlice = newWords.slice(0, target);
  return { reviews: dueReviews, newWords: newSlice };
}
```

### 5.2 TOEIC 적응형 난이도 (`features/toeic/lib/scoring.ts`)

```typescript
function getNextDifficulty(accuracyByType: Record<GrammarType, Stats>): {
  type: GrammarType;
  difficulty: 'easy' | 'medium' | 'hard';
} {
  // 가장 정답률 낮은 유형 우선
  const weakest = Object.entries(accuracyByType)
    .sort(([,a], [,b]) => (a.correct/a.total) - (b.correct/b.total))[0];

  const rate = weakest[1].correct / weakest[1].total;
  const difficulty = rate < 0.4 ? 'easy' : rate < 0.7 ? 'medium' : 'hard';

  return { type: weakest[0] as GrammarType, difficulty };
}
```

### 5.3 발음 비교 (`features/speak/lib/pronunciation.ts`)

```typescript
function calculatePronunciationScore(expected: string, actual: string): number {
  const expectedWords = expected.toLowerCase().split(/\s+/);
  const actualWords = actual.toLowerCase().split(/\s+/);

  let matchCount = 0;
  for (const word of expectedWords) {
    if (actualWords.includes(word)) matchCount++;
  }

  return Math.round((matchCount / expectedWords.length) * 100);
}

function getWordAccuracy(expected: string, actual: string): WordAccuracy[] {
  // 단어별 정확/부분정확/부정확 판정 → 컬러 코딩용
}
```

---

## 6. 상태 관리 설계

### 6.1 Context 구조

```
App
├── ProgressProvider          # 전체 학습 진행 (XP, 스트릭, 설정)
│   ├── useUserProgress()     # 읽기/쓰기
│   └── Supabase 동기화       # 주기적 동기화
├── GamificationProvider      # XP 이벤트, 레벨업, 퀘스트
│   ├── useXP()
│   ├── useStreak()
│   └── useDailyQuests()
└── 각 페이지의 로컬 상태
    ├── useToeicQuiz()        # 퀴즈 세션 (useState)
    ├── useChat()             # 대화 세션 (useState)
    └── useVocabSession()     # 단어 세션 (useState)
```

### 6.2 데이터 흐름

```
[사용자 액션] → [Custom Hook] → [상태 업데이트]
                     │                  │
                     ├→ LocalStorage    │ (즉시 캐시)
                     └→ Supabase       │ (비동기 동기화)
                                       ↓
                              [UI 리렌더링]
```

---

## 7. 외부 서비스 연동

### 7.1 Gemini API (`shared/lib/gemini.ts`)
```typescript
// 서버 전용 — Route Handler에서만 사용
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export async function generateToeicQuestion(type: GrammarType, difficulty: string) { ... }
export async function chat(messages: Message[], systemPrompt: string) { ... }
export async function analyzeFeedback(expected: string, userSaid: string) { ... }
```

### 7.2 Google Cloud TTS (`shared/lib/google-tts.ts`)
```typescript
// 서버 전용 — /api/speak/tts에서 사용
// 설치: npm install @google-cloud/text-to-speech
// 또는 REST API 직접 호출

export async function synthesizeSpeech(text: string, voiceId: string): Promise<Buffer> {
  // Google Cloud TTS API 호출
  // voiceId → languageCode + name 매핑
  // 예: 'emma' → { languageCode: 'en-US', name: 'en-US-Neural2-F' }
}
```

### 7.3 Supabase (`shared/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';

// 브라우저용 (anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 서버용 (service role key) — Route Handler에서만
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

---

## 8. 테스트 계획

| 레벨 | 대상 | 도구 |
|------|------|------|
| Unit | Leitner SRS 엔진, 점수 계산, 발음 비교 | Vitest |
| Integration | API Route Handlers (Gemini mock) | Vitest + MSW |
| E2E | 문제풀이 흐름, 대화 흐름, 단어 학습 흐름 | Playwright |

**핵심 테스트 시나리오:**
1. TOEIC: 문제 생성 → 풀기 → 정답 확인 → 오답 노트 추가
2. 단어: 신규 학습 → 퀴즈 → 정답 시 Box 승급 → 복습 스케줄 확인
3. Speak: 레벨 선택 → 캐릭터 선택 → 대화 → 피드백 확인
4. 게이미피케이션: XP 획득 → 레벨업 → 스트릭 유지

---

## 9. 성능 최적화

| 전략 | 적용 대상 |
|------|-----------|
| **Streaming** | Gemini AI 대화 응답 (SSE) |
| **오디오 캐싱** | TTS 결과를 메모리/파일에 캐시 (같은 text+voice 재사용) |
| **문제 프리페치** | 현재 문제 풀 때 다음 문제 백그라운드 생성 |
| **이미지 최적화** | next/image로 아바타/아이콘 최적화 |
| **코드 스플리팅** | Speak 관련 코드 dynamic import (STT/TTS 무거움) |
| **LocalStorage 캐시** | Supabase 데이터 로컬 캐시 → 오프라인 지원 |

---

## 10. 보안 고려사항

| 항목 | 대응 |
|------|------|
| API 키 노출 | GEMINI_API_KEY, Google Cloud 키는 서버 사이드만 (Route Handler) |
| Supabase 키 | ANON_KEY만 클라이언트, SERVICE_ROLE_KEY는 서버 전용 |
| 입력 검증 | API 요청 파라미터 Zod 스키마 검증 |
| Rate Limiting | Gemini/TTS API 호출 횟수 제한 (서버에서 카운터) |
| XSS | AI 응답 텍스트 렌더링 시 dangerouslySetInnerHTML 금지 |

---

## 11. 구현 가이드

### 11.1 구현 순서

| 순서 | 모듈 | 파일 수 | 의존성 |
|------|------|---------|--------|
| 1 | shared/ (공통 UI, lib) | ~12 | 없음 |
| 2 | types/ + data/ | ~8 | 없음 |
| 3 | Supabase 스키마 + 연동 | ~3 | 1 |
| 4 | features/gamification/ | ~8 | 1 |
| 5 | features/toeic/ + API | ~10 | 1, 2, 3, 4 |
| 6 | features/vocabulary/ + API | ~8 | 1, 2, 3, 4 |
| 7 | features/speak/ + API | ~12 | 1, 2, 3, 4 |
| 8 | app/ (라우트 페이지) | ~10 | 전체 |

### 11.2 의존성 설치

```bash
# Supabase
npm install @supabase/supabase-js

# Gemini AI
npm install @google/generative-ai

# Google Cloud TTS (서버 전용)
npm install @google-cloud/text-to-speech

# 유틸
npm install date-fns          # 날짜 계산 (Leitner 간격)
npm install zod               # API 요청 검증

# 개발
npm install -D vitest @testing-library/react playwright
```

### 11.3 Session Guide

**Module Map:**
| Module | 범위 | 예상 규모 |
|--------|------|-----------|
| module-1 | shared/ + types/ + data/ + Supabase 스키마 | ~20 파일 |
| module-2 | features/gamification/ + ProgressProvider | ~10 파일 |
| module-3 | features/toeic/ + API + app/toeic/ 페이지 | ~15 파일 |
| module-4 | features/vocabulary/ + API + app/toeic/vocabulary/ | ~12 파일 |
| module-5 | features/speak/ + API + app/speak/ 페이지 | ~18 파일 |
| module-6 | app/ 나머지 페이지 + 통합 + 게이미피케이션 연결 | ~10 파일 |

**Recommended Session Plan:**
```
Session 1: /pdca do toeic-speak --scope module-1
  → 공통 UI, Supabase 연동, 타입, 단어 데이터

Session 2: /pdca do toeic-speak --scope module-2
  → XP, 스트릭, 데일리퀘스트, Context Provider

Session 3: /pdca do toeic-speak --scope module-3
  → TOEIC 문제풀이 전체 (Gemini 연동, 퀴즈 UI, 오답노트, 대시보드)

Session 4: /pdca do toeic-speak --scope module-4
  → 단어 학습 전체 (Leitner SRS, 플래시카드, 퀴즈, 통계)

Session 5: /pdca do toeic-speak --scope module-5
  → Speak 전체 (STT, TTS, AI 대화, 피드백, 캐릭터)

Session 6: /pdca do toeic-speak --scope module-6
  → 메인 화면, 프로필, 전체 통합, 반응형 마무리
```

---

## 12. 환경 변수

```env
# Gemini AI
GEMINI_API_KEY=                        # 이미 설정됨

# Supabase
NEXT_PUBLIC_SUPABASE_URL=              # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=             # 서버 전용

# Google Cloud TTS
GOOGLE_CLOUD_TTS_API_KEY=             # Google Cloud TTS API 키
# 또는 서비스 계정 JSON
# GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```
