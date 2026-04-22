# 단어 DB 확충 가이드 (1~2만 목표)

## 현재 상태 (schema-v4 기준)

- **마스터 테이블**: `toeic_vocabulary` (모든 사용자 공용)
- **사용자 진행 테이블**: `user_vocab_learned` (아이디별 학습 상태)
- **시드 데이터**: `src/data/vocabulary/*.json`
  - business/finance/hr/marketing/daily/travel : 3,012개 (기본~중급)
  - advanced.json : 50개 (토익 800~900 고난도 + 숙어)

## 우선순위 규칙 (절대 변경 금지)

**"사용자가 확인한 단어는 미확인 단어보다 우선순위가 높을 수 없다."**

구현: [src/app/api/vocabulary/recommend/route.ts](../src/app/api/vocabulary/recommend/route.ts)

```
1. user_vocab_learned 에 없는 단어 = unseen → 최우선
2. unseen 만으로 count 를 채울 수 있으면 "확인 단어는 절대 섞지 않는다"
3. unseen 이 부족할 때만 status='wrong' (오답) 단어로 부족분 채움
4. 'learning'/'mastered' 단어는 unseen 이 완전 소진될 때까지 추천되지 않음
```

## 데이터 확충 경로 (권장 순서)

### 1단계 — 즉시 반영: seed-vocabulary.mjs 실행

기존 JSON 파일들을 Supabase에 업로드:

```bash
# 1. Supabase SQL Editor에서 schema-v4-vocabulary.sql 실행
# 2. .env 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 확인
# 3. 업로드
node scripts/seed-vocabulary.mjs
```

→ 약 **3,060개** (3012 + 50) DB 저장됨

### 2단계 — 공개 CC 라이선스 데이터셋 추가 (권장)

저작권 안전한 단어 리스트:

| 데이터셋 | 규모 | 라이선스 | 비고 |
|---------|------|----------|------|
| **TSL** (TOEIC Service List) | 1,200 | CC | 토익 특화 |
| **BSL** (Business Service List) | 1,700 | CC | 비즈니스 |
| **NAWL** (New Academic Word List) | 963 | CC | 학술 |
| **NGSL** (General Service List) | 2,800 | CC | 일반 빈출 |
| **Oxford 3000/5000** | 3~5k | 학습용 공개 | CEFR 등급 |

**데이터 수급 방법**:
1. 각 리스트의 공식 사이트에서 CSV 다운로드
2. `src/data/vocabulary/` 에 JSON으로 변환 저장
3. `scripts/seed-vocabulary.mjs` 의 `VOCAB_FILES` 배열에 추가
4. 재실행

**파일 포맷**:
```json
[
  {
    "id": "tsl-001",
    "word": "allocate",
    "meaning": "할당하다",
    "pronunciation": "/ˈæləkeɪt/",
    "partOfSpeech": "verb",
    "exampleSentence": "...",
    "category": "business",
    "difficulty": "advanced",
    "targetScore": 850,
    "isIdiom": false
  }
]
```

### 3단계 — AI 생성은 폴백 용도로만

- `/api/vocabulary/generate` 는 **DB 풀이 부족할 때만 호출**됨
- 생성된 단어도 자동으로 `toeic_vocabulary` 에 누적 저장
- 프롬프트가 "advanced + 숙어 30% 이상" 으로 상향됨

### 4단계 — Wiktionary 보강 (선택)

발음(IPA) / 예문이 빠진 단어는 Wiktionary REST API 로 보충 가능:

```
https://en.wiktionary.org/api/rest_v1/page/definition/{word}
```

CC-BY-SA 라이선스이므로 출처 표기 필요.

## 수동 확장 예시

```bash
# 특정 카테고리 AI 생성 (20개)
curl -X POST http://localhost:3000/api/vocabulary/generate \
  -H "Content-Type: application/json" \
  -d '{"count": 20, "category": "finance"}'
```

## 중요 제한 사항

- AI 생성은 **hallucination 가능성**이 있으니 대규모 생성은 지양
- 공개 데이터셋의 라이선스 확인 필수 (저작권 있는 단어장 복사 금지)
- 목표 1~2만은 **단계적 누적**: 시드 3k + 공개 4~5k + 점진적 AI 1~2k = ~10k 실질 달성
