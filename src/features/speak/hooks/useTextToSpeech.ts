// TTS — 브라우저 speechSynthesis 우선, 실패 시 서버 API 폴백
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
  if (name.includes('female') || name.includes('samantha') || name.includes('zira') || name.includes('hazel')) return 'female';
  if (name.includes('male') || name.includes('daniel') || name.includes('david') || name.includes('mark')) return 'male';
  return 'unknown';
}

// 브라우저 speechSynthesis가 실제 작동하는지 테스트
function testBrowserTTS(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    window.speechSynthesis.speak(utterance);
    // 1초 안에 응답 없으면 미지원
    setTimeout(() => resolve(false), 1000);
  });
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadVoices = () => {
      if (!window.speechSynthesis) {
        setUseFallback(true);
        return;
      }

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

      if (!selectedVoiceId && english.length > 0) {
        const defaultFemale = english.find(v => v.gender === 'female');
        setSelectedVoiceId(defaultFemale?.id ?? english[0].id);
      }

      // 음성이 하나도 없으면 폴백
      if (voices.length === 0) {
        setUseFallback(true);
      }
    };

    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    setTimeout(loadVoices, 500);

    // 브라우저 TTS 실제 작동 테스트
    testBrowserTTS().then(works => {
      if (!works) setUseFallback(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 서버 API로 TTS 재생 (모바일 폴백)
  const speakViaServer = useCallback(async (text: string, lang: 'en' | 'ko' = 'en') => {
    try {
      setIsSpeaking(true);

      const res = await fetch('/api/speak/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });

      if (!res.ok) {
        setIsSpeaking(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  // 브라우저 speechSynthesis로 재생
  const speakViaBrowser = useCallback((text: string, lang: 'en' | 'ko' = 'en') => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const isKorean = lang === 'ko' || /[가-힣]/.test(text);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = isKorean ? 'ko-KR' : 'en-US';
    utterance.rate = isKorean ? 1.0 : 0.9;
    utterance.pitch = 1;

    if (isKorean) {
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.startsWith('ko'));
      if (koVoice) utterance.voice = koVoice;
    } else {
      const selected = availableVoices.find(v => v.id === selectedVoiceId);
      if (selected) utterance.voice = selected.native;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [availableVoices, selectedVoiceId]);

  // 메인 speak 함수 — 브라우저 우선, 실패 시 서버 폴백
  const speak = useCallback((text: string, lang?: 'en' | 'ko') => {
    if (!text.trim()) return;

    const detectedLang = lang ?? (/[가-힣]/.test(text) ? 'ko' : 'en');

    if (useFallback) {
      speakViaServer(text, detectedLang);
    } else {
      speakViaBrowser(text, detectedLang);
    }
  }, [useFallback, speakViaServer, speakViaBrowser]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const previewVoice = useCallback((voiceId: string) => {
    const voice = availableVoices.find(v => v.id === voiceId);
    if (!voice) return;

    if (useFallback) {
      speakViaServer('Hello! Nice to meet you.', 'en');
      return;
    }

    window.speechSynthesis?.cancel();
    const utterance = new SpeechSynthesisUtterance('Hello! Nice to meet you.');
    utterance.voice = voice.native;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    window.speechSynthesis?.speak(utterance);
  }, [availableVoices, useFallback, speakViaServer]);

  return {
    speak,
    stop,
    isSpeaking,
    availableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    previewVoice,
    useFallback,
  };
}
