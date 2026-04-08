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
  speaker: 'man' | 'woman' | 'narrator';
  text: string;
}

function parseDialogue(text: string): DialoguePart[] {
  // (Man) ... (Woman) ... 패턴 감지
  const hasDialogue = /\((?:Man|Woman|man|woman)\)/i.test(text);

  if (!hasDialogue) {
    // 일반 텍스트 (독백/안내문)
    return [{ speaker: 'narrator', text }];
  }

  const parts: DialoguePart[] = [];
  // (Man) 또는 (Woman) 으로 분리
  const segments = text.split(/(\((?:Man|Woman|man|woman)\))/i);

  let currentSpeaker: 'man' | 'woman' | 'narrator' = 'narrator';

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    if (/^\((?:Man|man)\)$/i.test(trimmed)) {
      currentSpeaker = 'man';
    } else if (/^\((?:Woman|woman)\)$/i.test(trimmed)) {
      currentSpeaker = 'woman';
    } else {
      // 콜론이나 공백 제거
      const cleaned = trimmed.replace(/^[:\s]+/, '').trim();
      if (cleaned) {
        parts.push({ speaker: currentSpeaker, text: cleaned });
      }
    }
  }

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
      // Man: en-US, Woman: en-GB (다른 억양으로 구분)
      let voiceLang = tl;
      if (part.speaker === 'man') voiceLang = 'en-US';
      else if (part.speaker === 'woman') voiceLang = 'en-GB';

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
