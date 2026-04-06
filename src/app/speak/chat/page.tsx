// Speak AI 대화 화면 — STT + Gemini Chat + TTS + 피드백
'use client';

import { useEffect, useRef, useCallback, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/shared/components/ui';
import { ChatBubble, MicButton, FeedbackCard, MiniFeedback, VoicePicker } from '@/features/speak/components';
import { useChat } from '@/features/speak/hooks/useChat';
import { useSpeechRecognition } from '@/features/speak/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/features/speak/hooks/useTextToSpeech';
import { useXP } from '@/features/gamification/hooks/useXP';
import { useStreak } from '@/features/gamification/hooks/useStreak';
import { useProgress } from '@/shared/providers/ProgressProvider';
import { XP_REWARDS } from '@/features/gamification/lib/xp-table';
import { getScenarioById, getRandomScenarioForLevel, type ScenarioWithIntro } from '@/features/speak/lib/scenarios';
import type { OverallRating, SpeakLevel, ChatMessage } from '@/types';

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const level = Number(searchParams.get('level') ?? '1') as SpeakLevel;
  const scenarioId = searchParams.get('scenario') ?? undefined;
  const isAuto = searchParams.get('auto') === 'true';

  // 시나리오 결정: 직접 선택 or AI 생성
  const presetScenario = scenarioId ? getScenarioById(scenarioId) : undefined;
  const [aiScenario, setAiScenario] = useState<ScenarioWithIntro | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(isAuto);

  const scenario = presetScenario ?? aiScenario;

  // auto 모드: Gemini로 시나리오 동적 생성
  useEffect(() => {
    if (!isAuto || presetScenario) return;

    setScenarioLoading(true);
    fetch('/api/speak/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setAiScenario({
          ...data,
          introKo: data.introKo,
        } as ScenarioWithIntro);
      })
      .catch(() => {
        // AI 실패 시 프리셋에서 폴백
        const fallback = getRandomScenarioForLevel(level);
        if (fallback) setAiScenario(fallback);
      })
      .finally(() => setScenarioLoading(false));
  }, [isAuto, level, presetScenario]);

  const { messages, isLoading, error, sendMessage } = useChat(level, scenario?.id, scenario?.titleKo);
  const { transcript, isListening, isSupported, error: sttError, autoEnded, stopListening, toggleListening, clearAutoEnded } = useSpeechRecognition();
  const { speak, stop, isSpeaking, availableVoices, selectedVoiceId, setSelectedVoiceId, previewVoice } = useTextToSpeech();
  const { addXP } = useXP();
  const { recordStudy } = useStreak();
  const { progress } = useProgress();
  const showPronunciation = progress.settings.pronunciationFeedback;

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastRating = useRef<OverallRating | null>(null);

  // 시나리오 안내 메시지 (한국어로 상황 설명)
  const introMessage = useMemo<ChatMessage | null>(() => {
    if (!scenario || !('introKo' in scenario)) return null;
    return {
      id: 'intro-guide',
      role: 'ai',
      text: (scenario as ScenarioWithIntro).introKo,
      timestamp: Date.now(),
    };
  }, [scenario]);

  // 시나리오 안내 메시지 자동 읽기 (한국어)
  useEffect(() => {
    if (introMessage && !scenarioLoading) {
      setTimeout(() => speak(introMessage.text, 'ko'), 500);
    }
  }, [introMessage, scenarioLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // 스크롤 하단 유지
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // 음성 인식이 자동 종료되면 자동 전송 (모바일 대응)
  useEffect(() => {
    if (autoEnded && transcript.trim()) {
      clearAutoEnded();
      handleSendMessage(transcript.trim());
    }
  }, [autoEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  // 마이크 전송 핸들러 (버튼으로 수동 전송)
  const handleMicSend = useCallback(() => {
    if (transcript.trim()) {
      stopListening();
      handleSendMessage(transcript.trim());
    }
  }, [transcript, stopListening]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendMessage = useCallback(async (text: string) => {
    const aiMsg = await sendMessage(text);
    recordStudy();

    if (aiMsg) {
      // TTS 재생
      speak(aiMsg.text);
      addXP(XP_REWARDS.SPEAK_CONVERSATION);

      // 피드백 기반 미니 레이팅
      if (aiMsg.feedback && aiMsg.feedback.grammar.length === 0) {
        lastRating.current = 'great';
      } else if (aiMsg.feedback && aiMsg.feedback.grammar.length <= 1) {
        lastRating.current = 'good';
      } else {
        lastRating.current = 'try_again';
      }
    }
  }, [sendMessage, speak, addXP, recordStudy]);

  const handlePlayAudio = useCallback((text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  }, [speak, stop, isSpeaking]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* 상단 바 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button
          onClick={() => router.push('/speak')}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-sm">
            {scenario?.titleKo ?? '자유 대화'}
          </h1>
          <p className="text-xs text-gray-400">Lv.{level}</p>
        </div>
        <VoicePicker
          voices={availableVoices}
          selectedId={selectedVoiceId}
          onSelect={setSelectedVoiceId}
          onPreview={previewVoice}
        />
      </div>

      {/* 시나리오 키 표현 (첫 진입 시) */}
      {scenario && messages.length === 0 && (
        <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
          <p className="text-xs font-semibold text-purple-700 mb-1">핵심 표현</p>
          <div className="flex flex-wrap gap-1.5">
            {scenario.keyExpressions.map((expr, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-white rounded-full text-purple-600 border border-purple-200">
                {expr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 대화 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 시나리오 생성 중 로딩 */}
        {scenarioLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                AI가 상황을 만들고 있어요...
              </div>
            </div>
          </div>
        )}

        {/* AI 안내 메시지 (한국어로 상황 설명) */}
        {!scenarioLoading && introMessage && (
          <div className="flex gap-2 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <div className="max-w-[85%]">
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-purple-50 border border-purple-200 text-sm leading-relaxed text-purple-900">
                <p className="font-semibold text-purple-700 mb-1">📌 {scenario?.titleKo}</p>
                {introMessage.text}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => speak(introMessage.text, 'ko')}
                  className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg active:bg-purple-200 font-medium"
                >
                  🔊 안내 듣기
                </button>
                <p className="text-xs text-gray-400 flex-1">마이크를 누르거나 영어로 입력하세요</p>
              </div>
            </div>
          </div>
        )}

        {/* 시나리오 없을 때 기본 시작 메시지 */}
        {!introMessage && messages.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-3xl mb-3">🎙️</p>
            <p>마이크 버튼을 눌러 대화를 시작하세요</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id}>
            <ChatBubble
              message={msg}
              onPlayAudio={msg.role === 'ai' ? () => handlePlayAudio(msg.text) : undefined}
              isSpeaking={isSpeaking}
            />
            {msg.role === 'ai' && msg.feedback && (
              <FeedbackCard feedback={msg.feedback} showPronunciation={showPronunciation} />
            )}
          </div>
        ))}

        {/* 로딩 */}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm shrink-0">
              🤖
            </div>
            <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        {/* 에러 */}
        {(error ?? sttError) && (
          <div className="text-center text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">
            {error ?? sttError}
          </div>
        )}
      </div>

      {/* 하단 입력 영역 — 마이크 + 텍스트 입력 */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        {/* 텍스트 입력 (마이크 불가 시 폴백 + 항상 사용 가능) */}
        <TextInput onSend={handleSendMessage} disabled={isLoading} />

        {/* 마이크 버튼 */}
        {isSupported && (
          <div className="mt-3">
            <MicButton
              isListening={isListening}
              onToggle={toggleListening}
              onSend={handleMicSend}
              disabled={isLoading}
              transcript={isListening ? transcript : undefined}
            />
          </div>
        )}
      </div>

      {/* 미니 피드백 */}
      <MiniFeedback rating={lastRating.current} />
    </div>
  );
}

function TextInput({ onSend, disabled }: { readonly onSend: (text: string) => void; readonly disabled: boolean }) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="영어로 입력하세요..."
        disabled={disabled}
        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        전송
      </button>
    </form>
  );
}

export default function SpeakChatPage() {
  return (
    <Suspense fallback={<LoadingSkeleton lines={5} />}>
      <ChatContent />
    </Suspense>
  );
}
