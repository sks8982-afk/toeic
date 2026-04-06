// Design Ref: §7.2 — Google Cloud TTS 클라이언트 (서버 전용)
// Google Cloud TTS REST API를 직접 호출 (경량 방식)

import type { VoiceCharacter } from '@/types';

const GOOGLE_TTS_API = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export const VOICE_CHARACTERS: readonly VoiceCharacter[] = [
  {
    id: 'emma',
    name: 'Emma',
    gender: 'female',
    accent: 'us',
    description: '친근하고 밝은 미국 여성 음성',
    googleVoiceId: 'en-US-Neural2-F',
  },
  {
    id: 'james',
    name: 'James',
    gender: 'male',
    accent: 'us',
    description: '차분하고 명확한 미국 남성 음성',
    googleVoiceId: 'en-US-Neural2-D',
  },
  {
    id: 'sophie',
    name: 'Sophie',
    gender: 'female',
    accent: 'uk',
    description: '우아한 영국 여성 음성',
    googleVoiceId: 'en-GB-Neural2-F',
  },
  {
    id: 'oliver',
    name: 'Oliver',
    gender: 'male',
    accent: 'uk',
    description: '클래식한 영국 남성 음성',
    googleVoiceId: 'en-GB-Neural2-D',
  },
] as const;

export function getVoiceCharacter(voiceId: string): VoiceCharacter {
  const voice = VOICE_CHARACTERS.find(v => v.id === voiceId);
  if (!voice) {
    return VOICE_CHARACTERS[0]; // 기본: Emma
  }
  return voice;
}

export async function synthesizeSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
  const voice = getVoiceCharacter(voiceId);
  const languageCode = voice.googleVoiceId.split('-').slice(0, 2).join('-');

  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_TTS_API_KEY environment variable is not set');
  }

  const response = await fetch(`${GOOGLE_TTS_API}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode,
        name: voice.googleVoiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.95,
        pitch: 0,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google TTS API error: ${error}`);
  }

  const data = await response.json();
  // API returns base64-encoded audio
  const binaryStr = atob(data.audioContent);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}
