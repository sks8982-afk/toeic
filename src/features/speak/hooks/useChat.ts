// 대화 흐름 관리 — localStorage 저장으로 대화 이어하기 지원
'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage, GrammarIssue } from '@/types';

const CHAT_STORAGE_KEY = 'speak-current-chat';

interface SavedChat {
  readonly level: number;
  readonly scenarioId?: string;
  readonly scenarioTitle?: string;
  readonly messages: ChatMessage[];
  readonly savedAt: number;
}

interface ChatState {
  readonly messages: ChatMessage[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

// AI 응답에서 JSON/코드 블록 제거 (대화 텍스트만 추출)
function cleanAIResponse(text: string): string {
  let cleaned = text;

  // 1. ```json ... ``` 또는 ``` ... ``` 코드 블록 제거
  cleaned = cleaned.replace(/```[\w]*[\s\S]*?```/g, '');

  // 2. { 로 시작하는 JSON 객체 제거 (한 줄 또는 여러 줄)
  cleaned = cleaned.replace(/\{[^{}]*("grammar_issues"|"pronunciation_tips"|"suggestions"|"grammar"|"original"|"corrected")[^{}]*\}/g, '');

  // 3. 남은 중괄호 JSON 블록 제거 (여러 줄)
  cleaned = cleaned.replace(/\{[\s\S]*?"grammar_issues"[\s\S]*?\}/g, '');
  cleaned = cleaned.replace(/\{[\s\S]*?"pronunciation_tips"[\s\S]*?\}/g, '');

  // 4. 빈 줄 정리
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

export function useChat(level: number, scenarioId?: string, scenarioTitle?: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  // 저장된 대화 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!saved) return;

      const parsed: SavedChat = JSON.parse(saved);

      // 같은 시나리오의 대화만 복원 (24시간 이내)
      const isExpired = Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000;
      const isSameScenario = parsed.scenarioId === scenarioId && parsed.level === level;

      if (!isExpired && isSameScenario && parsed.messages.length > 0) {
        setState(prev => ({ ...prev, messages: parsed.messages }));
      }
    } catch {
      // 복원 실패 무시
    }
  }, [level, scenarioId]);

  // 메시지 변경 시 자동 저장
  useEffect(() => {
    if (state.messages.length === 0) return;

    const data: SavedChat = {
      level,
      scenarioId,
      scenarioTitle,
      messages: state.messages,
      savedAt: Date.now(),
    };
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(data));
  }, [state.messages, level, scenarioId, scenarioTitle]);

  const sendMessage = useCallback(async (userText: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const allMessages = [...state.messages, userMessage];
      const res = await fetch('/api/speak/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, text: m.text })),
          level,
          scenario: scenarioId,
          scenarioTitle,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Chat failed');
      }

      const data = await res.json();

      // AI 응답 텍스트에서 JSON 잔여물 제거
      const cleanText = cleanAIResponse(data.text);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: cleanText,
        timestamp: Date.now(),
        feedback: {
          pronunciation: 0,
          grammar: (data.feedback?.grammar ?? []) as GrammarIssue[],
          suggestions: data.feedback?.suggestions ?? [],
          ...(data.feedback?.pronunciationTips && { pronunciationTips: data.feedback.pronunciationTips }),
        },
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        isLoading: false,
      }));

      return aiMessage;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, [state.messages, level, scenarioId, scenarioTitle]);

  const resetChat = useCallback(() => {
    setState({ messages: [], isLoading: false, error: null });
    localStorage.removeItem(CHAT_STORAGE_KEY);
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    resetChat,
  } as const;
}

// 저장된 대화가 있는지 확인 (Speak 메인에서 "이어하기" 표시용)
export function getSavedChat(): SavedChat | null {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!saved) return null;
    const parsed: SavedChat = JSON.parse(saved);
    const isExpired = Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000;
    if (isExpired || parsed.messages.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
