// bulk-top.json 의 각 단어를 Gemini로 "이 한국어 뜻이 맞는지 + 예문 + 표준 뜻" 검증/보정
// - 통과한 항목만 src/data/vocabulary/verified.json 에 저장
// - DB 업로드는 별도 scripts/seed-vocabulary.mjs 가 처리
//
// 정확성 우선 방침:
//  1. Gemini가 "NO" 또는 "UNSURE" 판정하면 버림
//  2. Gemini가 표준 뜻을 제안하면 그 뜻으로 교체 (단, 형태가 너무 다르면 버림)
//  3. 예문은 생성 요청해서 TOEIC 문맥에 맞게 보강
//  4. 품사 확인/수정

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const inputPath = path.join(rootDir, 'src', 'data', 'vocabulary', 'bulk-top.json');
const outputPath = path.join(rootDir, 'src', 'data', 'vocabulary', 'verified.json');
const progressPath = path.join(rootDir, 'tmp-data', 'verify-progress.json');

const entries = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
console.log(`Input: ${entries.length} entries`);

// 중간 저장: 이미 처리한 index 스킵
let verified = [];
let startIdx = 0;
if (fs.existsSync(outputPath)) {
  verified = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
}
if (fs.existsSync(progressPath)) {
  const p = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
  startIdx = p.nextIndex ?? 0;
  console.log(`Resuming from index ${startIdx}`);
}

const BATCH_SIZE = 10;  // 한 번의 Gemini 호출로 10개 검증
const SLEEP_MS = 1500;  // 호출 간 쿨다운 (free tier rate limit 대응)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function buildPrompt(batch) {
  const listed = batch.map((e, i) => `${i + 1}. ${e.word} → "${e.meaning}"`).join('\n');
  return `You are a TOEIC vocabulary editor for Korean learners. Verify each English word's Korean meaning.

For each item, respond with a STRICT JSON object per line:
{"i": <index>, "verdict": "ok" | "fix" | "reject", "correctedMeaning": "<최대 5글자 표준 한국어 뜻, 대체 시에만>", "pos": "noun|verb|adjective|adverb", "example": "<TOEIC 스타일 영어 예문 1개>"}

Rules:
- "ok": the given Korean meaning is accurate and natural for TOEIC context
- "fix": meaning is wrong/outdated/archaic → provide a STANDARD natural Korean meaning in "correctedMeaning"
- "reject": the word should not be taught (archaic, slang, proper noun, overly technical)
- Always include "pos" (part of speech) and "example" (a natural English sentence showing the word in business/office context, 8-20 words)
- Korean meaning: 2-5 characters preferred, no dialect/hanja/archaic forms
- Return ONLY JSON lines, one per item. No markdown, no prose, no trailing comma.

Items:
${listed}`;
}

function parseResponse(text, batch) {
  const results = [];
  // JSON lines 파싱
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const raw of lines) {
    // { 로 시작하는 라인만
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) continue;
    try {
      const obj = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      if (typeof obj.i !== 'number') continue;
      const src = batch[obj.i - 1];
      if (!src) continue;
      results.push({ src, verdict: obj.verdict, correctedMeaning: obj.correctedMeaning, pos: obj.pos, example: obj.example });
    } catch {
      // skip malformed
    }
  }
  return results;
}

let passCount = verified.length;
let rejectCount = 0;
let fixCount = 0;

try {
  for (let i = startIdx; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const prompt = buildPrompt(batch);

    let responseText = '';
    try {
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } catch (err) {
      console.error(`Batch ${i}: Gemini error ${err.message}. Sleeping 30s and skipping.`);
      await sleep(30000);
      continue;
    }

    const parsed = parseResponse(responseText, batch);
    for (const r of parsed) {
      if (r.verdict === 'reject') {
        rejectCount++;
        continue;
      }
      const meaning = (r.verdict === 'fix' && r.correctedMeaning) ? r.correctedMeaning : r.src.meaning;
      if (!meaning || meaning.length > 8) {
        rejectCount++;
        continue;
      }
      if (r.verdict === 'fix') fixCount++;
      verified.push({
        ...r.src,
        meaning,
        partOfSpeech: r.pos || r.src.partOfSpeech,
        exampleSentence: r.example || '',
      });
      passCount++;
    }

    // 진행 저장
    fs.writeFileSync(outputPath, JSON.stringify(verified, null, 1));
    fs.writeFileSync(progressPath, JSON.stringify({ nextIndex: i + BATCH_SIZE, passCount, rejectCount, fixCount }));

    console.log(`  [${i}/${entries.length}] batch done → pass ${passCount}, fix ${fixCount}, reject ${rejectCount}`);
    await sleep(SLEEP_MS);
  }
} finally {
  fs.writeFileSync(outputPath, JSON.stringify(verified, null, 1));
  console.log(`\nCompleted. Verified: ${verified.length}, Fixed: ${fixCount}, Rejected: ${rejectCount}`);
  console.log(`Output: ${outputPath}`);
}
