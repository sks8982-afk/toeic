// 음성 인식 — 토글 + 자동 전송 (모바일 WebView 호환)
'use client';

import { useState, useCallback, useRef } from 'react';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoEnded, setAutoEnded] = useState(false); // 자동 종료 감지
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef(''); // onend에서 최신 transcript 접근용

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    setError(null);
    setTranscript('');
    setAutoEnded(false);
    transcriptRef.current = '';

    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false; // 모바일에서는 continuous가 불안정 → false로 변경
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setAutoEnded(false);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
      transcriptRef.current = finalTranscript;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(`음성 인식 오류: ${event.error}`);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    // 말 끝나면 자동 종료 → autoEnded=true로 표시 (자동 전송 트리거)
    recognition.onend = () => {
      setIsListening(false);
      if (transcriptRef.current.trim()) {
        setAutoEnded(true);
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearAutoEnded = useCallback(() => {
    setAutoEnded(false);
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    error,
    autoEnded,       // true면 말 끝나서 자동 종료됨 → 부모에서 자동 전송
    startListening,
    stopListening,
    toggleListening,
    clearAutoEnded,
  };
}
