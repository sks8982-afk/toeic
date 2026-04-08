// TTS API — Google Cloud TTS로 남/여 음성 분리
import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  text: z.string().max(5000),
  lang: z.enum(['en', 'ko']).optional().default('en'),
});

// Google Cloud TTS 호출 (API key 기반)
async function googleCloudTTS(text: string, voiceName: string, languageCode: string): Promise<ArrayBuffer | null> {
  const apiKey = process.env.GEMINI_API_KEY; // Google API key
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.audioContent) return null;

    // base64 → ArrayBuffer
    const binary = atob(data.audioContent);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  } catch {
    return null;
  }
}

// Google Translate TTS 폴백
async function translateTTS(text: string, lang: string): Promise<ArrayBuffer | null> {
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

// 음성 설정: 화자별 남/여 구분
const VOICES = {
  male: { name: 'en-US-Neural2-D', lang: 'en-US' },     // 남성
  female: { name: 'en-US-Neural2-F', lang: 'en-US' },    // 여성
  narrator: { name: 'en-US-Neural2-J', lang: 'en-US' },  // 나레이터 (남성)
  korean: { name: 'ko-KR-Neural2-A', lang: 'ko-KR' },    // 한국어
} as const;

interface DialoguePart {
  speaker: 'a' | 'b' | 'narrator';
  gender: 'male' | 'female' | 'neutral';
  text: string;
}

// 화자 이름에서 성별 추정
function guessGender(name: string): 'male' | 'female' | 'neutral' {
  const lower = name.toLowerCase().trim();
  const maleNames = ['man', 'male', 'he', 'him', 'david', 'mark', 'john', 'james', 'tom', 'mike', 'robert', 'chris', 'speaker 1', 'person a', 'mr'];
  const femaleNames = ['woman', 'female', 'she', 'her', 'sarah', 'emma', 'jennifer', 'lisa', 'susan', 'mary', 'anna', 'speaker 2', 'person b', 'ms', 'mrs'];

  if (maleNames.some(n => lower.includes(n))) return 'male';
  if (femaleNames.some(n => lower.includes(n))) return 'female';
  return 'neutral';
}

function parseDialogue(text: string): DialoguePart[] {
  // 태그 패턴: (Man), (Woman), David:, Speaker 1: 등
  const tagPattern = /(\((?:[A-Z][a-zA-Z\s]*)\))|([A-Z][a-zA-Z]{0,15}\s*:)/g;
  const hasExplicitTags = tagPattern.test(text);

  if (hasExplicitTags) {
    return parseWithTags(text);
  }

  // 따옴표 대화
  const quotes = text.match(/"[^"]+"/g);
  if (quotes && quotes.length >= 2) {
    return parseWithQuotes(text);
  }

  return [{ speaker: 'narrator', gender: 'neutral', text }];
}

function parseWithTags(text: string): DialoguePart[] {
  const parts: DialoguePart[] = [];
  const splitPattern = /(\([A-Z][a-zA-Z\s]*\))|([A-Z][a-zA-Z]{0,15}\s*:)/g;
  const segments = text.split(splitPattern).filter(Boolean);

  const speakerInfo = new Map<string, { voice: 'a' | 'b'; gender: 'male' | 'female' | 'neutral' }>();
  let nextVoice: 'a' | 'b' = 'a';
  let lastSpeaker = '';

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    const isTag = /^\(.*\)$/.test(trimmed) || /^[A-Za-z\s]+:$/.test(trimmed);
    if (isTag) {
      const name = trimmed.replace(/[():]/g, '').trim();
      lastSpeaker = name.toLowerCase();
      if (!speakerInfo.has(lastSpeaker)) {
        const gender = guessGender(name);
        speakerInfo.set(lastSpeaker, { voice: nextVoice, gender });
        nextVoice = nextVoice === 'a' ? 'b' : 'a';
      }
      continue;
    }

    const cleaned = trimmed.replace(/^[:\s]+/, '').trim();
    if (!cleaned) continue;

    const info = speakerInfo.get(lastSpeaker) ?? { voice: parts.length % 2 === 0 ? 'a' as const : 'b' as const, gender: 'neutral' as const };
    parts.push({ speaker: info.voice, gender: info.gender, text: cleaned });
  }

  // 성별 자동 보완: 두 화자 중 하나가 neutral이면 반대 성별로
  const speakers = [...speakerInfo.values()];
  if (speakers.length === 2) {
    if (speakers[0].gender !== 'neutral' && speakers[1].gender === 'neutral') {
      speakers[1].gender = speakers[0].gender === 'male' ? 'female' : 'male';
    } else if (speakers[1].gender !== 'neutral' && speakers[0].gender === 'neutral') {
      speakers[0].gender = speakers[1].gender === 'male' ? 'female' : 'male';
    } else if (speakers[0].gender === 'neutral' && speakers[1].gender === 'neutral') {
      speakers[0].gender = 'male';
      speakers[1].gender = 'female';
    }
    // parts에 반영
    for (const part of parts) {
      const info = [...speakerInfo.entries()].find(([, v]) => v.voice === part.speaker);
      if (info) part.gender = info[1].gender;
    }
  }

  return parts.length > 0 ? parts : [{ speaker: 'narrator', gender: 'neutral', text }];
}

function parseWithQuotes(text: string): DialoguePart[] {
  const parts: DialoguePart[] = [];
  const pattern = /([^"]*)"([^"]+)"/g;
  let match;
  let toggle = false;

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
    const parts = parseDialogue(text);
    const audioBuffers: ArrayBuffer[] = [];

    for (const part of parts) {
      let buffer: ArrayBuffer | null = null;

      if (lang === 'ko') {
        // 한국어
        buffer = await googleCloudTTS(part.text, VOICES.korean.name, VOICES.korean.lang);
        if (!buffer) buffer = await translateTTS(part.text, 'ko');
      } else {
        // 영어: 성별에 따라 음성 선택
        const voice = part.gender === 'female' ? VOICES.female
          : part.gender === 'male' ? VOICES.male
          : VOICES.narrator;

        buffer = await googleCloudTTS(part.text, voice.name, voice.lang);

        // Google Cloud TTS 실패 시 Translate TTS 폴백
        if (!buffer) {
          const fallbackLang = part.speaker === 'b' ? 'en-GB' : 'en-US';
          buffer = await translateTTS(part.text, fallbackLang);
        }
      }

      if (buffer) audioBuffers.push(buffer);

      // 화자 전환 시 간격
      if (parts.length > 1 && part.speaker !== 'narrator') {
        audioBuffers.push(createSilence(200));
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
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
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current) { chunks.push(current.trim()); current = sentence; }
    else current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function combineBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) { combined.set(new Uint8Array(buf), offset); offset += buf.byteLength; }
  return combined.buffer;
}

function createSilence(ms: number): ArrayBuffer {
  return new ArrayBuffer(Math.floor(ms / 10));
}
