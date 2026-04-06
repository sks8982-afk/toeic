// Design Ref: §2.3.1 F-SPEAK-04 — TTS (Web Speech API, 음성 캐릭터 선택)
'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

export interface VoiceOption {
  readonly id: string;
  readonly name: string;
  readonly lang: string;
  readonly gender: 'female' | 'male' | 'unknown';
  readonly native: SpeechSynthesisVoice;
}

function detectGender(voice: SpeechSynthesisVoice): 'female' | 'male' | 'unknown' {
  const name = voice.name.toLowerCase();
  if (name.includes('female') || name.includes('samantha') || name.includes('zira') || name.includes('hazel') || name.includes('susan') || name.includes('google us english') && !name.includes('male')) return 'female';
  if (name.includes('male') || name.includes('daniel') || name.includes('david') || name.includes('mark') || name.includes('google uk english male')) return 'male';
  return 'unknown';
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 사용 가능한 영어 음성 로드
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const english = voices
        .filter(v => v.lang.startsWith('en'))
        .map((v, i) => ({
          id: `voice-${i}`,
          name: v.name.replace(/^(Microsoft |Google )/, ''),
          lang: v.lang,
          gender: detectGender(v),
          native: v,
        }));

      setAvailableVoices(english);

      // 기본 선택: 첫 번째 여성 음성, 없으면 첫 번째
      if (!selectedVoiceId && english.length > 0) {
        const defaultFemale = english.find(v => v.gender === 'female');
        setSelectedVoiceId(defaultFemale?.id ?? english[0].id);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = useCallback((text: string, lang?: 'en' | 'ko') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // 한국어 감지: lang 명시 또는 텍스트에 한글 포함 시
    const isKorean = lang === 'ko' || (!lang && /[가-힣]/.test(text));

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isKorean ? 'ko-KR' : 'en-US';
    utterance.rate = isKorean ? 1.0 : 0.9;
    utterance.pitch = 1;

    if (isKorean) {
      // 한국어 음성 선택
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.startsWith('ko'));
      if (koVoice) utterance.voice = koVoice;
    } else {
      // 선택된 영어 음성 적용
      const selected = availableVoices.find(v => v.id === selectedVoiceId);
      if (selected) utterance.voice = selected.native;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [availableVoices, selectedVoiceId]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const previewVoice = useCallback((voiceId: string) => {
    const voice = availableVoices.find(v => v.id === voiceId);
    if (!voice || typeof window === 'undefined') return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Hello! Nice to meet you.');
    utterance.voice = voice.native;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [availableVoices]);

  return {
    speak,
    stop,
    isSpeaking,
    availableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    previewVoice,
  };
}
