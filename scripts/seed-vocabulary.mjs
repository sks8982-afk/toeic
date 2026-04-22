// TOEIC 단어 시드 데이터를 Supabase toeic_vocabulary에 일괄 업로드
// 실행: node scripts/seed-vocabulary.mjs
//
// 환경변수 필요:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  (또는 SUPABASE_SERVICE_ROLE_KEY)
//
// 특징:
//   - 같은 word+meaning 조합은 UPSERT (UNIQUE 제약 덕분에 중복 무시)
//   - 기존 프리셋 + 고난도 시드 모두 업로드
//   - 실패한 레코드는 로깅

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// .env 파일 수동 로드 (Next.js는 자동이지만 Node 스크립트는 dotenv 필요)
dotenv.config({ path: path.join(rootDir, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and *_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// 각 카테고리 JSON을 다 로드
const VOCAB_FILES = [
  { file: 'business.json', category: 'business', defaultScore: 700 },
  { file: 'finance.json', category: 'finance', defaultScore: 700 },
  { file: 'hr.json', category: 'hr', defaultScore: 700 },
  { file: 'marketing.json', category: 'marketing', defaultScore: 700 },
  { file: 'daily.json', category: 'daily', defaultScore: 600 },
  { file: 'travel.json', category: 'travel', defaultScore: 600 },
  { file: 'advanced.json', category: null, defaultScore: 850 },
];

function contentHashId(word, meaning) {
  const hash = createHash('sha256')
    .update(`${word.trim().toLowerCase()}|${meaning.trim()}`)
    .digest('hex')
    .slice(0, 12);
  return `seed-${hash}`;
}

async function seedOne(category, defaultScore, file) {
  const fullPath = path.join(rootDir, 'src', 'data', 'vocabulary', file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Skip: ${file} not found`);
    return { inserted: 0, skipped: 0, failed: 0 };
  }

  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  const rows = raw.map((w) => ({
    id: contentHashId(w.word, w.meaning),
    word: w.word,
    meaning: w.meaning,
    pronunciation: w.pronunciation ?? null,
    part_of_speech: w.partOfSpeech ?? 'noun',
    example_sentence: w.exampleSentence,
    category: w.category ?? category ?? 'general',
    difficulty: w.difficulty ?? 'intermediate',
    target_score: w.targetScore ?? defaultScore,
    is_idiom:
      w.isIdiom ??
      ['idiom', 'phrasal_verb'].includes((w.partOfSpeech ?? '').toLowerCase()),
    source: 'seed',
  }));

  // UPSERT (id 기준). UNIQUE(word, meaning) 충돌도 무시
  const { data, error } = await supabase
    .from('toeic_vocabulary')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error(`[${file}] error:`, error.message);
    return { inserted: 0, skipped: 0, failed: rows.length };
  }

  console.log(`[${file}] uploaded ${data?.length ?? 0} / ${rows.length} rows`);
  return { inserted: data?.length ?? 0, skipped: 0, failed: 0 };
}

(async () => {
  console.log('Seeding TOEIC vocabulary...');
  let total = 0;
  for (const { file, category, defaultScore } of VOCAB_FILES) {
    const { inserted } = await seedOne(category, defaultScore, file);
    total += inserted;
  }
  console.log(`\nDone. Total inserted (new rows): ${total}`);
  process.exit(0);
})();
