// 대량 단어 데이터 빌드 스크립트
// 입력:
//   - tmp-data/top-10000.txt      : 빈도 상위 1만 영어 단어 (david47k/top-english-wordlists)
//   - tmp-data/ko-en.tsv          : Wiktionary Korean-English TSV (Vuizur/Wiktionary-Dictionaries)
// 출력:
//   - src/data/vocabulary/bulk-top.json : 영어(빈도 1만) × 한국어 뜻(wiktionary 역매핑) 교집합
// 규칙:
//   - 한 단어당 한국어 뜻 1개만 저장 (가장 자주 등장한 한글 headword)
//   - 품사/예문 없음 (UI는 없어도 표시 가능)
//   - 관사/조사/전치사 같은 너무 기본적인 단어 일부 제외

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const topPath = path.join(rootDir, 'tmp-data', 'top-10000.txt');
const koenPath = path.join(rootDir, 'tmp-data', 'ko-en.tsv');
const outPath = path.join(rootDir, 'src', 'data', 'vocabulary', 'bulk-top.json');

console.log('Reading top 10k English...');
const topWords = fs.readFileSync(topPath, 'utf-8')
  .split(/\r?\n/)
  .map(w => w.trim().toLowerCase())
  .filter(w => w.length >= 2 && /^[a-z]+$/.test(w));
console.log(`  → ${topWords.length} candidate English words`);

const topSet = new Set(topWords);

// 영→한 매핑 구축
// Korean-English TSV 포맷: surface|roman|han|... \t <i>pos</i><br><ol><li>definition</li></ol>
console.log('Parsing Wiktionary KO-EN (~40k lines)...');
const enToKo = new Map(); // english lowercase → [korean headword, pos]
const lines = fs.readFileSync(koenPath, 'utf-8').split(/\r?\n/);

for (const line of lines) {
  if (!line) continue;
  const tabIdx = line.indexOf('\t');
  if (tabIdx < 0) continue;
  const left = line.slice(0, tabIdx);
  const right = line.slice(tabIdx + 1);

  // left: 한국어 headword 후보들이 '|' 로 구분. 첫 번째가 주 표제어.
  const koHeadword = left.split('|')[0].trim();
  if (!koHeadword) continue;
  // 한글만 (한자/영문/숫자 섞이면 제외)
  if (!/^[가-힣\s]+$/.test(koHeadword)) continue;
  // 1글자 한글 뜻은 대부분 한자어/방언 → 제외
  if (koHeadword.replace(/\s/g, '').length < 2) continue;
  // 너무 긴 구/문장은 제외
  if (koHeadword.length > 10) continue;

  // 방언/옛말/속어가 섞인 정의는 스킵
  if (/\b(dialect|archaic|obsolete|slang|humorous|neologism|north korea|military)\b/i.test(right)) continue;

  // 품사 태그
  const posMatch = right.match(/<i>([a-z\s]+)<\/i>/i);
  const posRaw = posMatch ? posMatch[1].trim().toLowerCase() : '';
  const pos = posRaw.replace(/\s+/g, '_');

  // 영어 정의 추출
  const defMatches = [...right.matchAll(/<li>([^<]+)<\/li>/g)];
  for (const m of defMatches) {
    let def = m[1].trim().toLowerCase();
    def = def.replace(/\([^)]*\)/g, '').trim();
    const firstEn = def.split(/[,;]|\bor\b/)[0].trim();
    if (!firstEn) continue;
    if (!/^[a-z][a-z-]*$/.test(firstEn)) continue;
    if (firstEn.length < 3) continue; // 2글자 영단어 제외 (대부분 불용어)
    if (!topSet.has(firstEn)) continue;

    // 매핑 결정 규칙:
    // 1) 아직 없으면 추가
    // 2) 이미 있으면 더 '일반적인' 후보 선택 — 2~5글자 한글 우선
    const existing = enToKo.get(firstEn);
    if (!existing) {
      enToKo.set(firstEn, { meaning: koHeadword, pos });
    } else {
      const score = (s) => {
        const len = s.replace(/\s/g, '').length;
        if (len >= 2 && len <= 4) return 3;
        if (len <= 6) return 2;
        return 1;
      };
      if (score(koHeadword) > score(existing.meaning)) {
        enToKo.set(firstEn, { meaning: koHeadword, pos });
      }
    }
  }
}
console.log(`  → matched ${enToKo.size} English words to Korean meanings`);

// 제외 목록 (너무 기본 불용어)
const STOPWORDS = new Set(['the', 'of', 'and', 'to', 'in', 'a', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'has', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part']);

// 부적절한 한국어 meaning 블랙리스트 (한자 단음절/방언/애매한 단어)
// 필터에서 1글자는 이미 제외했지만 2글자 중에서도 문제 있는 것들
const BAD_MEANINGS = new Set([
  '놔두다', // put/leave 등 여러 단어에 모호하게 매핑됨
  '자고배', // 잘못된 조합어
  '운애', // 방언
  '샴', '뉘', '명', '계', '양', '남', '단', '류', // 한자 단음절 (안전장치)
  '나라', // country는 맞지만 다른 단어에 중복 매핑되면 문제
]);

// POS 매핑
function normalizePos(p) {
  if (!p) return 'noun';
  if (p.startsWith('noun')) return 'noun';
  if (p.startsWith('verb')) return 'verb';
  if (p.startsWith('adj')) return 'adjective';
  if (p.startsWith('adv')) return 'adverb';
  if (p.startsWith('prep')) return 'preposition';
  if (p.startsWith('conj')) return 'conjunction';
  return 'noun';
}

// 카테고리 휴리스틱 (간단)
const BUSINESS_KW = ['business', 'company', 'market', 'office', 'meet', 'manage', 'product'];
const FINANCE_KW = ['bank', 'money', 'fund', 'invest', 'cost', 'price', 'tax'];

function guessCategory(/* word */) {
  return 'general';
}

// 콘텐츠 해시 (DB id와 동일 방식)
import { createHash } from 'node:crypto';
function wordId(word, meaning) {
  const h = createHash('sha256').update(`${word.trim().toLowerCase()}|${meaning.trim()}`).digest('hex').slice(0, 12);
  return `bulk-${h}`;
}

// 의미 중복 카운트 (같은 한국어 뜻이 여러 영단어에 붙어있으면 전부 제외)
const meaningCount = new Map();
for (const [, v] of enToKo) {
  meaningCount.set(v.meaning, (meaningCount.get(v.meaning) ?? 0) + 1);
}

// 빈도 상위 2000은 일상 기본어라 Wiktionary 역매핑 품질이 낮음 — 완전 제외.
// 중~저빈도(2000 이후)는 구체적인 전문어가 많아 매핑이 대체로 정상.
const HIGH_FREQUENCY_CUTOFF = 2000;

const out = [];
for (let i = 0; i < topWords.length; i++) {
  const word = topWords[i];
  if (i < HIGH_FREQUENCY_CUTOFF) continue; // 고빈도 제외
  if (STOPWORDS.has(word)) continue;
  if (word.length < 3) continue;
  const m = enToKo.get(word);
  if (!m) continue;
  if (!m.meaning) continue;
  const cleanedMeaning = m.meaning.replace(/\s+/g, ' ').trim();
  if (cleanedMeaning.length < 2 || cleanedMeaning.length > 10) continue;
  if (BAD_MEANINGS.has(cleanedMeaning)) continue;
  if ((meaningCount.get(cleanedMeaning) ?? 0) > 1) continue;

  out.push({
    id: wordId(word, cleanedMeaning),
    word,
    meaning: cleanedMeaning,
    pronunciation: '',
    partOfSpeech: normalizePos(m.pos),
    exampleSentence: '',
    category: guessCategory(word),
    difficulty: 'intermediate',
    targetScore: 700,
    isIdiom: false,
  });
}

console.log(`  → writing ${out.length} entries to ${outPath}`);
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log('Done.');
