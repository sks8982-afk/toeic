// TTS API — 대화 Man/Woman 구분 + 다른 음성 톤
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  text: z.string().max(5000),
  lang: z.enum(['en', 'ko']).optional().default('en'),
});

// Google Translate TTS 호출 (음성 변화를 위해 속도 조절)
async function fetchTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
  const chunks = splitText(text, 200);
  const buffers: ArrayBuffer[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) buffers.push(await res.arrayBuffer());
    } catch { /* skip */ }
  }

  if (buffers.length === 0) return null;
  return combineBuffers(buffers);
}

// 대화를 파트별로 분리: (Man)/(Woman) 태그 기준
interface DialoguePart {
  speaker: 'a' | 'b' | 'narrator';
  text: string;
}

// 화자 태그 패턴: (Man), (Woman), (Speaker 1), A:, B:, 이름: 등
const SPEAKER_TAG = /\((?:Man|Woman|man|woman|Speaker\s*\d|Person\s*[A-Z]|[A-Z][a-z]+)\)|^(?:[A-Z][a-z]+)\s*:|^(?:Man|Woman|Speaker\s*[AB12])\s*:/gim;

function parseDialogue(text: string): DialoguePart[] {
  // 1. 명시적 화자 태그가 있는 경우
  const tagPattern = /(\((?:Man|Woman|man|woman|Speaker\s*\d|Person\s*[A-Z]|[A-Z][a-z]+)\))|((Man|Woman|Speaker\s*[AB12]|[A-Z][a-z]{1,15})\s*:)/gi;
  const hasExplicitTags = tagPattern.test(text);

  if (hasExplicitTags) {
    return parseWithTags(text);
  }

  // 2. 태그 없지만 따옴표 대화가 있는 경우 ("..." 패턴)
  const quotes = text.match(/"[^"]+"/g);
  if (quotes && quotes.length >= 2) {
    return parseWithQuotes(text);
  }

  // 3. 일반 텍스트
  return [{ speaker: 'narrator', text }];
}

// 태그 기반 파싱 (Man/Woman, 이름:, Speaker 1: 등)
function parseWithTags(text: string): DialoguePart[] {
  const parts: DialoguePart[] = [];
  // 모든 화자 태그로 분할
  const splitPattern = /(\((?:Man|Woman|man|woman|Speaker\s*\d|Person\s*[A-Z]|[A-Z][a-z]+)\))|((Man|Woman|Speaker\s*[AB12]|[A-Z][a-z]{1,15})\s*:)/gi;
  const segments = text.split(splitPattern).filter(Boolean);

  const speakerMap = new Map<string, 'a' | 'b'>();
  let nextVoice: 'a' | 'b' = 'a';

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    // 화자 태그인지 확인
    const isTag = /^\(.*\)$/.test(trimmed) || /^[A-Za-z\s]+:$/.test(trimmed);
    if (isTag) {
      const name = trimmed.replace(/[():]/g, '').trim().toLowerCase();
      if (!speakerMap.has(name)) {
        speakerMap.set(name, nextVoice);
        nextVoice = nextVoice === 'a' ? 'b' : 'a';
      }
      continue;
    }

    // 대사 텍스트
    const cleaned = trimmed.replace(/^[:\s]+/, '').trim();
    if (!cleaned) continue;

    // 마지막 태그의 화자
    const lastTag = [...speakerMap.entries()].pop();
    const speaker = lastTag ? lastTag[1] : (parts.length % 2 === 0 ? 'a' : 'b');
    parts.push({ speaker, text: cleaned });
  }

  return parts.length > 0 ? parts : [{ speaker: 'narrator', text }];
}

// 따옴표 대화 파싱 — 화자가 번갈아 바뀐다고 가정
function parseWithQuotes(text: string): DialoguePart[] {
  const parts: DialoguePart[] = [];
  const pattern = /([^"]*)"([^"]+)"/g;
  let match;
  let voiceToggle: 'a' | 'b' = 'a';
  let lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    // 따옴표 앞의 나레이션
    const narration = match[1].trim();
    if (narration) {
      parts.push({ speaker: 'narrator', text: narration });
    }
    // 따옴표 안의 대사
    parts.push({ speaker: voiceToggle, text: match[2] });
    voiceToggle = voiceToggle === 'a' ? 'b' : 'a';
    lastIndex = pattern.lastIndex;
  }

  // 남은 텍스트
  const remaining = text.slice(lastIndex).trim();
  if (remaining) parts.push({ speaker: 'narrator', text: remaining });

  return parts.length > 0 ? parts : [{ speaker: 'narrator', text }];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { text, lang } = parsed.data;
    const tl = lang === 'ko' ? 'ko' : 'en';

    // 대화 파싱
    const parts = parseDialogue(text);

    const audioBuffers: ArrayBuffer[] = [];

    for (const part of parts) {
      // 화자 A: en-US (미국), 화자 B: en-GB (영국), 나레이터: 기본
      let voiceLang = tl;
      if (part.speaker === 'a') voiceLang = 'en-US';
      else if (part.speaker === 'b') voiceLang = 'en-GB';

      const buffer = await fetchTTS(part.text, voiceLang);
      if (buffer) audioBuffers.push(buffer);

      // 화자 전환 시 짧은 무음 (구분감)
      if (parts.length > 1) {
        audioBuffers.push(createSilence(300)); // 300ms 무음
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
    }

    const combined = combineBuffers(audioBuffers);

    return new NextResponse(combined, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function combineBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return combined.buffer;
}

// 짧은 무음 생성 (MP3 프레임은 아니지만, 버퍼 사이 간격 효과)
function createSilence(ms: number): ArrayBuffer {
  // 빈 바이트로 약간의 딜레이 효과 (실제 MP3 무음은 아니지만 재생 간 간격)
  const bytes = Math.floor(ms / 10);
  return new ArrayBuffer(bytes);
}
