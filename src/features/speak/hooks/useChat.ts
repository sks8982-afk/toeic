// Design Ref: §2.3.1 F-SPEAK-05 — Gemini 대화 흐름 관리
'use client';

import { useState, useCallback } from 'react';
import type { ChatMessage, GrammarIssue } from '@/types';

interface ChatState {
  readonly messages: ChatMessage[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useChat(level: number, scenarioId?: string, scenarioTitle?: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

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

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: data.text,
        timestamp: Date.now(),
        feedback: {
          pronunciation: 0,
          grammar: (data.feedback?.grammar ?? []) as GrammarIssue[],
          suggestions: data.feedback?.suggestions ?? [],
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
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
    resetChat,
  } as const;
}
