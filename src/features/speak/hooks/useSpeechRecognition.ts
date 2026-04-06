// Design Ref: §2.3.1 F-SPEAK-03 — Web Speech API STT 래퍼 (탭투스픽)
'use client';

import { useState, useCallback, useRef } from 'react';

interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly isListening: boolean;
  readonly isSupported: boolean;
  readonly error: string | null;
}

export function useSpeechRecognition(): SpeechRecognitionResult & {
  startListening: () => void;
  stopListening: () => void;
} {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.');
      return;
    }

    setError(null);
    setTranscript('');

    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        setError(`음성 인식 오류: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { transcript, isListening, isSupported, error, startListening, stopListening };
}
