// TTS API — 남/여 음성 분리 (다중 TTS 소스)
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  text: z.string().max(5000),
  lang: z.enum(['en', 'ko']).optional().default('en'),
});

// --- TTS 소스 1: Google Translate (기본) ---
async function googleTranslateTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
  const chunks = splitText(text, 200);
  const buffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${lang}&client=tw-ob`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) buffers.push(await res.arrayBuffer());
    } catch { /* skip */ }
  }
  return buffers.length > 0 ? combineBuffers(buffers) : null;
}

// --- 화자 파싱 ---
interface DialoguePart {
  speaker: 'a' | 'b' | 'narrator';
  gender: 'male' | 'female' | 'neutral';
  text: string;
}

function guessGender(name: string): 'male' | 'female' | 'neutral' {
  const lower = name.toLowerCase().trim();
  const male = ['man', 'male', 'david', 'mark', 'john', 'james', 'tom', 'mike', 'robert', 'chris', 'kevin', 'brian', 'steve', 'paul', 'alex', 'mr'];
  const female = ['woman', 'female', 'sarah', 'emma', 'jennifer', 'lisa', 'susan', 'mary', 'anna', 'amanda', 'michelle', 'emily', 'rachel', 'nicole', 'angela', 'catherine', 'diana', 'ms', 'mrs'];
  if (male.some(n => lower.includes(n))) return 'male';
  if (female.some(n => lower.includes(n))) return 'female';
  return 'neutral';
}

function parseDialogue(text: string): DialoguePart[] {
  const tagPattern = /(\([A-Z][a-zA-Z\s]*\))|([A-Z][a-zA-Z]{0,15}\s*:)/g;
  if (tagPattern.test(text)) return parseWithTags(text);
  const quotes = text.match(/"[^"]+"/g);
  if (quotes && quotes.length >= 2) return parseWithQuotes(text);
  return [{ speaker: 'narrator', gender: 'neutral', text }];
}

function parseWithTags(text: string): DialoguePart[] {
  const parts: DialoguePart[] = [];
  const splitPattern = /(\([A-Z][a-zA-Z\s]*\))|([A-Z][a-zA-Z]{0,15}\s*:)/g;
  const segments = text.split(splitPattern).filter(Boolean);
  const speakerMap = new Map<string, { voice: 'a' | 'b'; gender: 'male' | 'female' | 'neutral' }>();
  let nextVoice: 'a' | 'b' = 'a';
  let lastSpeaker = '';

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    const isTag = /^\(.*\)$/.test(trimmed) || /^[A-Za-z\s]+:$/.test(trimmed);
    if (isTag) {
      const name = trimmed.replace(/[():]/g, '').trim();
      lastSpeaker = name.toLowerCase();
      if (!speakerMap.has(lastSpeaker)) {
        speakerMap.set(lastSpeaker, { voice: nextVoice, gender: guessGender(name) });
        nextVoice = nextVoice === 'a' ? 'b' : 'a';
      }
      continue;
    }
    const cleaned = trimmed.replace(/^[:\s]+/, '').trim();
    if (!cleaned) continue;
    const info = speakerMap.get(lastSpeaker) ?? { voice: (parts.length % 2 === 0 ? 'a' : 'b') as 'a' | 'b', gender: 'neutral' as const };
    parts.push({ speaker: info.voice, gender: info.gender, text: cleaned });
  }

  // 두 화자 성별 보완
  const speakers = [...speakerMap.values()];
  if (speakers.length === 2) {
    if (speakers[0].gender === 'neutral' && speakers[1].gender === 'neutral') {
      speakers[0].gender = 'male'; speakers[1].gender = 'female';
    } else if (speakers[0].gender !== 'neutral' && speakers[1].gender === 'neutral') {
      speakers[1].gender = speakers[0].gender === 'male' ? 'female' : 'male';
    } else if (speakers[1].gender !== 'neutral' && speakers[0].gender === 'neutral') {
      speakers[0].gender = speakers[1].gender === 'male' ? 'female' : 'male';
    }
    for (const part of parts) {
      const entry = [...speakerMap.entries()].find(([, v]) => v.voice === part.speaker);
      if (entry) part.gender = entry[1].gender;
    }
  }

  return parts.length > 0 ? parts : [{ speaker: 'narrator', gender: 'neutral', text }];
}

function parseWithQuotes(text: string): DialoguePart[] {
  const parts: DialoguePart[] = [];
  const pattern = /([^"]*)"([^"]+)"/g;
  let match; let toggle = false;
  while ((match = pattern.exec(text)) !== null) {
    const narration = match[1].trim();
    if (narration) parts.push({ speaker: 'narrator', gender: 'neutral', text: narration });
    parts.push({ speaker: toggle ? 'b' : 'a', gender: toggle ? 'female' : 'male', text: match[2] });
    toggle = !toggle;
  }
  return parts.length > 0 ? parts : [{ speaker: 'narrator', gender: 'neutral', text }];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { text, lang } = parsed.data;

    if (lang === 'ko') {
      // 한국어는 단일 음성
      const buffer = await googleTranslateTTS(text, 'ko');
      if (!buffer) return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
      return new NextResponse(buffer, { headers: { 'Content-Type': 'audio/mpeg' } });
    }

    // 영어: 대화 파싱 → 화자별 다른 언어(억양)로 구분
    const parts = parseDialogue(text);
    const audioBuffers: ArrayBuffer[] = [];

    for (const part of parts) {
      // 남성: en-AU (호주 — 낮고 굵은 느낌), 여성: en-US (미국 — 높은 느낌)
      // 나레이터: en-GB (영국)
      const voiceLang = part.gender === 'male' ? 'en-AU'
        : part.gender === 'female' ? 'en-US'
        : 'en-GB';

      const buffer = await googleTranslateTTS(part.text, voiceLang);
      if (buffer) audioBuffers.push(buffer);

      // 화자 전환 간격
      if (parts.length > 1 && part.speaker !== 'narrator') {
        audioBuffers.push(createSilence(250));
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
    }

    return new NextResponse(combineBuffers(audioBuffers), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
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
  for (const s of sentences) {
    if ((current + s).length > maxLen && current) { chunks.push(current.trim()); current = s; }
    else current += s;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function combineBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((s, b) => s + b.byteLength, 0);
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) { combined.set(new Uint8Array(buf), offset); offset += buf.byteLength; }
  return combined.buffer;
}

function createSilence(ms: number): ArrayBuffer {
  return new ArrayBuffer(Math.floor(ms / 10));
}
