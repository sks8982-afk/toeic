# Plan: TOEIC & Speak 영어학습 플랫폼

> Created: 2026-04-06
> Phase: Plan
> Status: Draft

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | TOEIC & Speak 영어학습 플랫폼 |
| **시작일** | 2026-04-06 |
| **기술스택** | Next.js 16 + React 19 + Tailwind CSS 4 + Gemini API |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 영어 학습자들이 TOEIC 시험 준비와 영어 회화 연습을 위해 여러 앱을 사용해야 하며, 비용이 높고 학습 동기 유지가 어렵다 |
| **Solution** | TOEIC Part 5 문제풀이 + AI 영어회화를 하나의 플랫폼에서 게이미피케이션과 함께 제공하는 모바일 반응형 웹앱 |
| **Function UX Effect** | 한 문제씩 집중 풀이, AI 실시간 대화, 발음/문법 즉시 피드백, XP/레벨 시스템으로 학습 동기 유지 |
| **Core Value** | 접근성 높은 웹 기반 올인원 영어학습 플랫폼으로 TOEIC 점수 향상과 실전 회화 능력을 동시에 개선 |

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | TOEIC 시험 준비와 영어 회화 연습을 하나의 플랫폼에서 효율적으로 할 수 있는 학습 도구 필요 |
| **WHO** | TOEIC 준비 중인 한국 영어 학습자 (대학생, 취준생, 직장인) |
| **RISK** | STT 브라우저 호환성, Gemini API 응답 지연, 발음 평가 정확도 |
| **SUCCESS** | TOEIC 문제풀이 정상 동작, AI 대화 실시간 응답 < 3초, 발음/문법 피드백 제공 |
| **SCOPE** | 메인 선택 화면 + TOEIC(Part5 문제풀이, 단어장) + Speak(AI 대화 5레벨, STT/TTS, 피드백) + 게이미피케이션 |

---

## 1. 프로젝트 개요

### 1.1 배경
영어 학습 시장에서 Duolingo, Speak(스픽), Santa TOEIC(산타토익), ELSA Speak 등의 앱이 각각 게이미피케이션, AI 회화, TOEIC 특화, 발음 교정 등 개별 강점을 가지고 있다. 본 프로젝트는 이들의 핵심 패턴을 결합하여 **TOEIC 시험 준비 + AI 영어회화**를 하나의 웹 플랫폼에서 제공한다.

### 1.2 목표
- TOEIC Part 5 유형 문제를 Gemini AI가 생성하여 무한 연습 가능
- 자주 출제되는 영어 단어를 체계적으로 학습
- AI와 5단계 난이도별 영어 대화를 통해 실전 회화 능력 향상
- 발음/문법/표현 피드백으로 학습 효과 극대화
- 게이미피케이션 요소로 학습 동기 지속

### 1.3 기술 스택
| 분류 | 기술 | 용도 |
|------|------|------|
| Framework | Next.js 16.2.2 | App Router, SSR/CSR |
| UI | React 19 + Tailwind CSS 4 | 반응형 UI |
| Language | TypeScript 5 | 타입 안전성 |
| AI | Gemini API | 문제 생성, AI 대화, 문법/표현 피드백 |
| STT | Web Speech API | 음성 인식 (브라우저 내장) |
| TTS | Google Cloud TTS | 자연스러운 남/여 음성 선택 (WaveNet/Neural2) |
| DB | Supabase (PostgreSQL) | 단어 데이터, 학습 기록, 향후 인증 |
| Storage | LocalStorage (캐시) + Supabase | 오프라인 캐시 + 서버 동기화 |
| State | React 19 (use, context) | 클라이언트 상태 관리 |

### 1.4 참고 앱 분석 (핵심 패턴)

| 앱 | 핵심 패턴 | 본 프로젝트 적용 |
|---|---|---|
| **Duolingo** | XP, 스트릭, 리그, 하트, 데일리 퀘스트 | XP + 스트릭 + 레벨 시스템 적용 |
| **Santa TOEIC** | AI 예측 점수, 취약 영역 타겟팅, 파트별 진행도 | AI 문제 생성 + 정답률 기반 난이도 조절 |
| **Speak (스픽)** | 탭투스픽, 역할극, 프리톡, 리플레이 비교 | 탭투스픽 UI + 역할극 대화 + 피드백 |
| **ELSA Speak** | 음소별 색상 코딩, 발음 점수 | 발음 정확도 시각화 (컬러 코딩) |
| **Cake (케이크)** | 짧은 영상 클립, 듣고 따라하기 | 바이트 사이즈 학습 단위 적용 |

---

## 2. 기능 요구사항

### 2.1 메인 화면 (홈)
| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-HOME-01 | 모드 선택 | TOEIC / Speak 두 가지 모드 카드 선택 | P0 |
| F-HOME-02 | 일일 현황 | 오늘의 XP, 스트릭, 풀이 수 표시 | P1 |
| F-HOME-03 | 퀵 스타트 | 마지막 학습 이어하기 바로가기 | P2 |

### 2.2 TOEIC 섹션

#### 2.2.1 문제풀이
| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-TOEIC-01 | AI 문제 생성 | Gemini API로 Part 5 유형 문제 실시간 생성 | P0 |
| F-TOEIC-02 | 한 문제씩 풀기 | 화면에 1문제만 표시, 4지선다 | P0 |
| F-TOEIC-03 | 즉시 피드백 | 정답/오답 즉시 표시 + 해설 슬라이드업 카드 | P0 |
| F-TOEIC-04 | 문제 유형 태깅 | Part 5 세부 유형별 태그: 품사/시제/수일치/관계사/전치사/접속사/어휘 | P0 |
| F-TOEIC-05 | 유형별 선택 풀이 | 취약 유형만 집중 연습 모드 | P1 |
| F-TOEIC-06 | 적응형 난이도 | 유형별 정답률 추적, 자동 난이도 조절 (취약 유형 출제 비중 증가) | P1 |
| F-TOEIC-07 | 오답 노트 (SRS) | 틀린 문제 자동 수집 + 간격 반복으로 재출제 (1일/3일/7일) | P0 |
| F-TOEIC-08 | 진행 바 | 세션 내 진행 상황 표시 (상단 프로그레스 바) | P0 |
| F-TOEIC-09 | 진단 테스트 | 최초 10~20문제 진단 → 예상 점수 + 취약 유형 파악 (산타토익 패턴) | P1 |
| F-TOEIC-10 | 학습 대시보드 | 유형별 정답률 히트맵, 예상 점수 변화 그래프, 일일 학습량 | P1 |
| F-TOEIC-11 | 데일리 목표 | 하루 20문제 목표 + 달성 시 XP 보너스 | P1 |

**Part 5 문제 유형 분류 체계:**
| 유형 | 세부 항목 | 출제 빈도 |
|------|-----------|-----------|
| 품사 | 명사/동사/형용사/부사 자리 구별 | 매우 높음 |
| 시제 | 현재/과거/현재완료/미래 | 높음 |
| 수일치 | 주어-동사 수일치 | 높음 |
| 관계사 | who/which/that/whose/where | 중간 |
| 전치사 | in/on/at/by/for/with 등 | 높음 |
| 접속사 | and/but/although/because/while 등 | 중간 |
| 어휘 | 같은 품사 내 의미 구별 | 높음 |

#### 2.2.2 단어 학습 (간격 반복 시스템)

> **핵심 설계: Modified Leitner Box System**
> 5단계 박스에 단어를 분류하여 망각 곡선에 맞춰 자동 복습 스케줄링.
> 매일 **복습 먼저 + 신규 단어 학습** 순서로 세션 구성.

**Leitner Box 간격:**
| Box | 복습 간격 | 의미 |
|-----|-----------|------|
| Box 1 | 매일 | 새로 학습하거나 틀린 단어 (강등 시 여기로) |
| Box 2 | 3일 | 1회 정답 |
| Box 3 | 7일 | 2회 연속 정답 |
| Box 4 | 14일 | 3회 연속 정답 |
| Box 5 | 30일 | 장기 기억 완성 → 졸업 |

**규칙:** 정답 → 다음 Box로 승격 / 오답 → Box 1로 강등

**일일 세션 구성 (30~50 신규 단어 목표):**
```
1단계: 오늘 복습 대상 (Due Reviews) — 모두 소화 (우선순위 최상)
2단계: 신규 단어 학습 — 30~50개 (설정에서 조절 가능)
3단계: 약점 단어 추가 복습 — Box 1에 3일 이상 머문 단어 재노출
```

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-VOCAB-01 | 빈출 단어 목록 | TOEIC 빈출 단어 카테고리별 표시 (비즈니스/금융/인사/마케팅/일상) | P0 |
| F-VOCAB-02 | 일일 학습 세션 | 복습 단어 + 신규 30~50개를 한 세션으로 구성 (복습 우선) | P0 |
| F-VOCAB-03 | 플래시카드 | 단어 카드 (영단어 → 뜻 → 예문 → 발음 듣기), 스와이프 넘기기 | P0 |
| F-VOCAB-04 | 4가지 퀴즈 모드 | 영→한 / 한→영 / 빈칸채우기(예문) / 듣고맞추기 4종 랜덤 출제 | P0 |
| F-VOCAB-05 | Leitner Box SRS | 5단계 박스 기반 자동 복습 스케줄링 (1/3/7/14/30일 간격) | P0 |
| F-VOCAB-06 | 자가 평가 버튼 | "몰라요" / "애매해요" / "알아요" 3단계 → Box 이동에 반영 | P0 |
| F-VOCAB-07 | 복습 알림 배너 | "오늘 복습할 단어 N개" 배너 (홈 + 단어 화면 상단) | P1 |
| F-VOCAB-08 | Box 진행도 시각화 | 5개 박스 단어 분포를 바 차트로 표시 (학습 진행 한눈에) | P1 |
| F-VOCAB-09 | 통합 복습 모드 | 모든 Box 단어를 섞어서 랜덤 퀴즈 (실전 테스트 느낌) | P1 |
| F-VOCAB-10 | 단어 검색/북마크 | 전체 단어장 검색 + 어려운 단어 즐겨찾기 | P1 |
| F-VOCAB-11 | 학습 통계 | 총 암기 단어, Box별 분포, 일일 학습량 그래프, 연속 학습일 | P1 |
| F-VOCAB-12 | 오늘의 단어 위젯 | 홈 화면에 오늘의 추천 단어 5개 미리보기 카드 | P2 |
| F-VOCAB-13 | 일일 목표 설정 | 사용자가 신규 단어 수 조절 가능 (10/30/50개) | P1 |

### 2.3 Speak 섹션

#### 2.3.1 AI 대화
| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-SPEAK-01 | 5단계 난이도 | 입문/초급/중급/중상급/고급 레벨 선택 | P0 |
| F-SPEAK-02 | 상황별 롤플레이 | 카페 주문, 공항, 면접, 병원, 쇼핑 등 실생활 시나리오 (각 시나리오에 완료 미션 3~5개 포함, 스픽 패턴) | P0 |
| F-SPEAK-03 | 음성 입력 (STT) | 탭투스픽 — 버튼 누르고 말하기, 실시간 파형 시각화 | P0 |
| F-SPEAK-04 | AI 음성 응답 (TTS) | AI 대답을 자연스러운 음성으로 재생 (Google Cloud TTS WaveNet/Neural2) | P0 |
| F-SPEAK-04a | 음성 캐릭터 선택 | 남성/여성 등 AI 음성 캐릭터 선택 (대화 시작 전, 미리듣기 제공) | P0 |
| F-SPEAK-05 | 실시간 대화 | Gemini API 기반 자연스러운 대화 흐름 | P0 |
| F-SPEAK-06 | 대화 가이드/힌트 | 난이도별 예시 문장 제공 + "이렇게 말해보세요" 힌트 버튼 | P1 |
| F-SPEAK-07 | 대화 히스토리 | 채팅 버블 UI로 대화 내역 표시 (AI 아바타 + 텍스트 + 재생 버튼) | P0 |
| F-SPEAK-08 | 프리톡 모드 | 시나리오 없이 자유 주제 대화 (고급 사용자용) | P1 |
| F-SPEAK-09 | 따라 말하기 (쉐도잉) | AI가 말한 문장을 듣고 따라 말하기 → 발음 비교 (ELSA/Cake 패턴) | P1 |
| F-SPEAK-10 | 핵심 표현 드릴 | 시나리오별 필수 표현 5~10개를 먼저 연습 후 대화 진입 | P1 |
| F-SPEAK-11 | 진단 평가 | 최초 짧은 대화(3~5턴)로 레벨 자동 추천 | P1 |
| F-SPEAK-12 | 적응형 대화 | 사용자 실력에 따라 AI가 문장 복잡도/어휘 자동 조절 | P2 |

**시나리오 구성 예시:**
| 시나리오 | 난이도 | 미션 예시 |
|----------|--------|-----------|
| 카페 주문 | 입문~초급 | 음료 주문하기, 사이즈 변경, 결제하기 |
| 공항 체크인 | 초급~중급 | 탑승권 받기, 좌석 변경 요청, 수하물 문의 |
| 취업 면접 | 중급~고급 | 자기소개, 경력 설명, 강점/약점 답변 |
| 병원 방문 | 초급~중급 | 증상 설명, 예약하기, 처방 확인 |
| 비즈니스 미팅 | 중상급~고급 | 제안 발표, 의견 반박, 합의 도출 |

#### 2.3.2 피드백 시스템
| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-FEED-01 | 발음 평가 | STT 인식 결과 vs 기대 문장 비교, 단어별 정확도 점수 (0~100) | P0 |
| F-FEED-02 | 문법 교정 | AI가 문법 오류 감지 → 원문/교정/설명 카드 표시 | P0 |
| F-FEED-03 | 표현 추천 | 더 자연스러운 영어 표현 대안 제시 ("이렇게도 말할 수 있어요") | P1 |
| F-FEED-04 | 컬러 코딩 | 단어별 정확/부분정확/부정확을 녹/황/적 색상 하이라이트 (ELSA 패턴) | P1 |
| F-FEED-05 | 실시간 미니 피드백 | 매 발화 후 간단한 점수 뱃지 표시 (Great/Good/Try Again) | P0 |
| F-FEED-06 | 대화 종합 리포트 | 대화 종료 후 발음/문법/어휘/유창성 종합 리포트 + 점수 | P1 |
| F-FEED-07 | 리플레이 비교 | 내 발음 vs AI 원어민 발음 나란히 재생 비교 (스픽 패턴) | P2 |
| F-FEED-08 | 주간 실력 추이 | 주간 발음/문법 점수 변화 그래프 | P2 |

### 2.4 게이미피케이션
| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| F-GAME-01 | XP 시스템 | 문제 정답/대화 완료 시 XP 획득 | P0 |
| F-GAME-02 | 레벨 시스템 | XP 누적으로 레벨업 (Lv.1 ~ Lv.50) | P1 |
| F-GAME-03 | 스트릭 | 연속 학습일 카운트 + 스트릭 불꽃 아이콘 | P0 |
| F-GAME-04 | 데일리 퀘스트 | "오늘 5문제 풀기", "AI 대화 1회" 등 일일 목표 | P1 |
| F-GAME-05 | 업적 배지 | 첫 대화, 100문제 등 마일스톤 배지 | P2 |

---

## 3. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| **반응형** | 모바일 우선 (375px~), 태블릿 (768px~), 데스크톱 (1024px~) |
| **성능** | 첫 로딩 < 3초, AI 응답 < 3초, STT 인식 실시간 |
| **접근성** | WCAG 2.1 AA 기본 준수 |
| **브라우저** | Chrome 90+, Safari 15+, Edge 90+ (Web Speech API 의존) |
| **데이터** | Supabase (PostgreSQL) — 단어 DB, 학습 기록, 향후 인증/소셜 기능 |
| **오프라인** | LocalStorage 캐시로 오프라인 단어 학습 가능, 온라인 복귀 시 Supabase 동기화 |
| **보안** | API 키 서버 사이드 보호 (Route Handler 경유), Supabase RLS 적용 |

---

## 4. 페이지 구조

```
/ (메인)
├── /toeic
│   ├── /toeic/quiz          → TOEIC 문제풀이
│   ├── /toeic/quiz/result   → 풀이 결과
│   └── /toeic/vocabulary    → 단어 학습
├── /speak
│   ├── /speak/levels        → 레벨 선택
│   ├── /speak/voice         → AI 음성 캐릭터 선택
│   ├── /speak/chat          → AI 대화
│   └── /speak/report        → 대화 리포트
└── /profile                 → 학습 현황 (XP, 스트릭, 통계)
```

---

## 5. 데이터 모델

### 5.1 TOEIC 문제 (AI 생성 → 클라이언트)
```typescript
type GrammarType = 'pos' | 'tense' | 'agreement' | 'relative' | 'preposition' | 'conjunction' | 'vocabulary';

interface ToeicQuestion {
  id: string;
  type: GrammarType;            // Part 5 세부 유형
  difficulty: 'easy' | 'medium' | 'hard';
  sentence: string;             // 빈칸 포함 문장 "The company ___ a new policy."
  options: string[];            // 4지선다 ["implemented", "implementing", ...]
  correctIndex: number;         // 정답 인덱스
  explanation: string;          // 해설
  grammarPoint: string;         // 문법 포인트 태그 (예: "현재완료 vs 과거")
}

// 오답 노트 (SRS 기반 재출제)
interface WrongAnswer {
  questionId: string;
  question: ToeicQuestion;
  wrongAt: string;              // 틀린 날짜 ISO
  reviewDue: string;            // 다음 복습 예정일 ISO
  reviewCount: number;          // 복습 횟수
  interval: number;             // 현재 간격 (일) — 1, 3, 7로 확장
}
```

### 5.2 단어 + Leitner SRS
```typescript
interface VocabWord {
  id: string;
  word: string;
  meaning: string;             // 한국어 뜻
  pronunciation: string;       // 발음 기호
  partOfSpeech: string;        // 품사
  exampleSentence: string;     // 예문
  category: 'business' | 'finance' | 'hr' | 'marketing' | 'daily' | 'travel';
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

// Leitner Box 기반 단어 학습 상태
interface VocabProgress {
  wordId: string;
  box: 1 | 2 | 3 | 4 | 5;     // 현재 Leitner Box (1=매일, 5=30일)
  lastReviewed: string;        // 마지막 복습 날짜 ISO
  nextReviewDue: string;       // 다음 복습 예정일 ISO
  correctStreak: number;       // 연속 정답 횟��
  totalAttempts: number;       // 총 시도 횟수
  totalCorrect: number;        // 총 정답 횟수
}

// Box별 복습 간격 상수
// BOX_INTERVALS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 } (일 단위)
```

### 5.3 AI 음성 캐릭터
```typescript
interface VoiceCharacter {
  id: string;
  name: string;                // "Emma", "James" 등 캐릭터 이름
  gender: 'female' | 'male';
  accent: 'us' | 'uk' | 'au'; // 미국/영국/호주 억양
  description: string;         // "친근한 미국 여성 음성"
  googleVoiceId: string;       // Google Cloud TTS 음성 ID (예: en-US-Neural2-F)
  previewUrl?: string;         // 미리듣기 오디오 URL
}

// 기본 제공 음성 캐릭터 예시
// - Emma (여성, 미국 억양, en-US-Neural2-F) — 친근하고 밝은 톤
// - James (남성, 미국 억양, en-US-Neural2-D) — 차분하고 명확한 톤
// - Sophie (여성, 영국 억양, en-GB-Neural2-F) — 우아한 영국식 발음
// - Oliver (남성, 영국 억양, en-GB-Neural2-D) — 클래식한 영국식 발음
```

### 5.4 대화 메시지
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;                // 대화 내용
  audioUrl?: string;           // TTS 생성 음성 URL (캐시)
  timestamp: number;
  feedback?: {
    pronunciation: number;     // 0~100 점수
    grammar: GrammarIssue[];
    suggestions: string[];     // 더 나은 표현 추천
  };
}

interface GrammarIssue {
  original: string;
  corrected: string;
  explanation: string;
}
```

### 5.5 사용자 진행 (LocalStorage)
```typescript
interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string;       // YYYY-MM-DD
  selectedVoiceId: string;     // 선택한 AI 음성 캐릭터 ID
  toeic: {
    totalSolved: number;
    correctRate: number;
    estimatedScore: number;            // AI 예상 TOEIC 점수
    accuracyByType: Record<GrammarType, { total: number; correct: number }>;  // 유형별 정답률
    wrongAnswers: WrongAnswer[];       // 오답 노트 (SRS 재출제 포함)
    dailyGoal: number;                 // 일일 목표 문제 수 (기본 20)
  };
  speak: {
    totalConversations: number;
    currentLevel: number;              // 1~5
    avgPronunciation: number;
    avgGrammar: number;                // 평균 문법 점수
    completedScenarios: string[];      // 완료한 시나리오 ID 목록
    weeklyScores: { date: string; pronunciation: number; grammar: number }[];
  };
  vocabulary: {
    dailyNewTarget: number;            // 일일 신규 단어 목표 (10/30/50)
    todayNewLearned: number;           // 오늘 학습한 신규 단어 수
    todayReviewed: number;             // 오늘 복습한 단어 수
    words: VocabProgress[];            // Leitner Box 기반 전체 단어 진행 상태
    bookmarks: string[];               // 즐겨찾기 단어 ID
  };
  dailyQuests: DailyQuest[];
  settings: {
    vocabDailyTarget: 10 | 30 | 50;   // 단어 일일 목표
    toeicDailyTarget: number;          // TOEIC 일일 목표
    selectedVoiceId: string;           // AI 음성 캐릭터
  };
}
```

---

## 6. API 설계

### 6.1 Next.js Route Handlers (서버 사이드)

| Method | Endpoint | 용도 |
|--------|----------|------|
| POST | `/api/toeic/generate` | Gemini로 TOEIC 문제 생성 |
| POST | `/api/speak/chat` | Gemini AI 대화 (메시지 송수신) |
| POST | `/api/speak/tts` | Google Cloud TTS 음성 합성 (텍스트 → 자연스러운 음성) |
| POST | `/api/speak/feedback` | 발음/문법/표현 피드백 분석 |
| GET | `/api/speak/voices` | 사용 가능한 AI 음성 캐릭터 목록 조회 |
| GET | `/api/vocabulary/words` | 단어 목록 조회 (카테고리/난이도 필터) |

### 6.2 Gemini API 활용 상세

#### 문제 생성 프롬프트 전략
```
System: "You are a TOEIC Part 5 question generator.
Generate a {difficulty} level {type} question.
Return JSON format with sentence, options, correctIndex, explanation."
```

#### 대화 프롬프트 전략
```
System: "You are an English conversation partner.
Level: {level} (1=beginner, 5=advanced).
Scenario: {scenario}.
Respond naturally, adjust complexity to the level.
After each response, provide brief feedback on the user's grammar and suggest better expressions."
```

#### 피드백 분석 프롬프트 전략
```
System: "Analyze the user's English sentence.
Compare with expected: '{expected}'.
User said: '{userSaid}'.
Return JSON: { pronunciation_score, grammar_issues[], expression_suggestions[] }"
```

---

## 7. UI/UX 설계 원칙

### 7.1 핵심 원칙 (앱 리서치 기반)
1. **한 화면 한 문제** — 스크롤 없이 집중 (Duolingo 패턴)
2. **즉시 피드백** — 정답/오답 즉시 + 해설 슬라이드업 카드
3. **하단 고정 버튼** — 엄지 닿는 위치에 주요 액션 버튼
4. **컬러 피드백** — 정답 초록 플래시, 오답 빨강 쉐이크
5. **프로그레스 바** — 상단에 학습 진행률 항상 표시
6. **카드 기반 레이아웃** — 넉넉한 패딩, 둥근 모서리

### 7.2 게이미피케이션 UI
- 헤더: XP 바 + 스트릭 불꽃 + 레벨 배지
- 정답 시: +XP 팝업 애니메이션 (떠오르는 숫자)
- 레벨업 시: 풀스크린 축하 모달
- 스트릭 유지: 불꽃 아이콘 + "N일 연속!" 배너

### 7.3 Speak 대화 UI
- 채팅 버블 형태 (좌: AI 아바타+이름, 우: 사용자)
- 하단: 마이크 버튼 (탭투스픽) + 파형 시각화
- AI 응답: 텍스트 + 스피커 버튼 (TTS 재생, 선택한 음성 캐릭터로)
- 피드백: 대화 버블 아래 접이식 피드백 카드

### 7.4 음성 캐릭터 선택 UI
- 대화 시작 전 캐릭터 카드 선택 화면 (아바타 + 이름 + 미리듣기 버튼)
- 기본 4명: Emma(미국 여성), James(미국 남성), Sophie(영국 여성), Oliver(영국 남성)
- 각 캐릭터 카드: 원형 아바타 + 이름 + 억양 태그 + 미리듣기(재생) 버튼
- 설정에서도 변경 가능 (대화 중에는 고정)
- 선택한 캐릭터의 아바타가 AI 채팅 버블에 표시

### 7.5 반응형 전략
| Breakpoint | 레이아웃 |
|------------|----------|
| < 768px (모바일) | 단일 컬럼, 풀 너비 카드, 하단 네비 |
| 768px~1024px (태블릿) | 약간 여백 추가, 카드 최대 너비 제한 |
| > 1024px (데스크톱) | 좌측 네비 사이드바, 중앙 콘텐츠 영역 |

---

## 8. 구현 순서 (Phase)

### Phase 1: 기초 구조 + 메인 화면
- 프로젝트 폴더 구조 세팅 (컴포넌트, 훅, 유틸, 타입)
- 메인 화면 (TOEIC / Speak 선택 카드)
- 하단 네비게이션 바 (홈/TOEIC/Speak/프로필)
- 반응형 레이아웃 기초 (모바일 우선)
- 게이미피케이션 기초 (XP, 스트릭 데이터 모델 + LocalStorage)
- 공통 UI 컴포넌트 (카드, 버튼, 프로그레스바, 모달)

### Phase 2: TOEIC 문제풀이
- Gemini API 연동 (Route Handler, 유형별 프롬프트)
- 문제 유형 태깅 시스템 (7개 문법 유형)
- 한 문제씩 풀기 UI + 4지선다 + 즉시 피드백 (해설 슬라이드업)
- 프로그레스 바 + 유형별 선택 풀이
- 오답 노트 (SRS 기반 1/3/7일 재출제)
- 유형별 정답률 추적 + 적응형 난이도
- 진단 테스트 (10~20문제 → 예상 점수)
- 학습 대시보드 (유형별 히트맵, 점수 그래프)

### Phase 3: 단어 학습 (Leitner SRS)
- TOEIC 빈출 단어 데이터 (JSON, 카테고리별 500~1000개)
- 플래시카드 UI (스와이프, 영→뜻→예문→발음)
- 4가지 퀴즈 모드 (영→한, 한→영, 빈칸, 듣고맞추기)
- Leitner Box SRS 엔진 (5단계 박스, 자동 복습 스케줄링)
- 일일 세션 구성 (복습 우선 + 신규 30~50개)
- 자가 평가 (몰라요/애매/알아요) + Box 이동 로직
- Box 진행도 시각화 + 학습 통계
- 통합 복습 모드 (전체 섞기)
- 일일 목표 설정 (10/30/50개)

### Phase 4: Speak AI 대화
- 레벨 선택 화면 (5단계 + 진단 평가)
- 시나리오별 롤플레이 (미션 기반, 5+개 시나리오)
- AI 음성 캐릭터 선택 (남/여 4종, 미리듣기)
- Web Speech API STT 연동 (탭투스픽 + 파형)
- Google Cloud TTS 연동 (캐릭터별 voiceId, 오디오 캐싱)
- Gemini API 대화 흐름 (레벨별 프롬프트 조절)
- 채팅 버블 UI (캐릭터 아바타, 재생 버튼)
- 핵심 표현 드릴 (시나리오 진입 전 필수 표현 연습)
- 프리톡 모드 (자유 대화)

### Phase 5: 피드백 시스템
- 발음 정확도 평가 (STT vs 기대 텍스트, 단어별 점수)
- 실시간 미니 피드백 (매 발화 후 Great/Good/Try Again 뱃지)
- Gemini 기반 문법 교정 + 표현 추천
- 컬러 코딩 시각화 (녹/황/적 하이라이트)
- 따라 말하기 (쉐도잉) — 내 발음 vs AI 비교 재생
- 대화 종합 리포트 (발음/문법/어휘/유창성 점수)
- 주간 실력 추이 그래프

### Phase 6: 게이미피케이션 + 통합
- XP 획득 애니메이션 (+XP 떠오르기)
- 레벨업 시스템 + 풀스크린 축하 모달
- 스트릭 시스템 + 불꽃 UI + 연속일 배너
- 데일리 퀘스트 (TOEIC 20문제, 단어 30개, 대화 1회 등)
- 업적 배지 (마일스톤: 첫 대화, 100문제, 7일 스트릭 등)
- 프로필 페이지 (종합 학습 통계, TOEIC 예상 점수, Speak 레벨)

---

## 9. 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| Web Speech API 브라우저 호환성 | 높음 | Chrome 우선 지원, 비지원 브라우저는 텍스트 입력 폴백 |
| Gemini API 응답 지연 | 중간 | 스트리밍 응답 사용, 로딩 스켈레톤 UI |
| Gemini API 비용 | 중간 | 문제 캐싱 (같은 유형 재활용), 토큰 최적화 |
| Google Cloud TTS 비용 | 중간 | TTS 결과 오디오 캐싱 (같은 텍스트 재요청 방지), WaveNet $16/100만 문자 |
| 발음 평가 정확도 한계 | 높음 | Web Speech API 인식 결과 기반 텍스트 비교 (Levenshtein), 향후 전문 API 업그레이드 |
| TOEIC 문제 품질 | 중간 | 프롬프트 엔지니어링 + few-shot 예시 활용 |
| 모바일 마이크 권한 | 중간 | 권한 요청 UI 가이드 + 거부 시 텍스트 입력 폴백 |
| Supabase 무료 티어 제한 | 낮음 | 500MB DB + 1GB Storage + 50K 월간 요청 (학습 앱에 충분), 초과 시 Pro 전환 |

---

## 10. 성공 기준

| ID | 기준 | 측정 방법 |
|----|------|-----------|
| SC-01 | TOEIC 문제 생성 및 풀이 정상 동작 | 문제 생성 → 선택 → 정답 확인 → 해설 표시 전체 흐름 |
| SC-02 | AI 대화 실시간 응답 3초 이내 | Gemini API 호출 후 첫 토큰까지 시간 측정 |
| SC-03 | 음성 인식(STT) 정상 작동 | Chrome에서 영어 음성 입력 → 텍스트 변환 확인 |
| SC-04 | 자연스러운 음성 출력(TTS) | 선택한 캐릭터(남/여) 음성으로 자연스럽게 재생 확인 |
| SC-05 | 발음/문법/표현 피드백 제공 | 대화 후 3종 피드백 카드 표시 확인 |
| SC-06 | 모바일 반응형 정상 동작 | 375px 뷰포트에서 모든 핵심 기능 사용 가능 |
| SC-07 | 게이미피케이션 XP/스트릭 동작 | 문제 정답 시 XP 증가, 매일 학습 시 스트릭 유지 |
| SC-08 | 학습 기록 로컬 저장 및 복원 | 브라우저 새로고침 후 진행도 유지 확인 |

---

## 11. 향후 확장 계획

| Phase | 기능 | 설명 |
|-------|------|------|
| v2.0 | Supabase Auth | 소셜 로그인 (Google/Kakao) + 학습 기록 클라우드 동기화 |
| v2.0 | TOEIC 확장 | Part 6 (장문 빈칸), Part 7 (독해) 추가 |
| v2.0 | 리더보드 | 주간 XP 랭킹 (Duolingo 리그 패턴, Supabase Realtime) |
| v2.0 | 단어장 커스텀 | 사용자가 직접 단어 추가/편집 가능 |
| v3.0 | 고급 발음 평가 | Google Cloud STT 또는 Azure Pronunciation Assessment |
| v3.0 | AI 학습 분석 | 취약점 자동 분석 + 맞춤 학습 경로 추천 |
| v3.0 | TOEFL 섹션 | TOEFL iBT Speaking/Writing 연습 |
