// Design Ref: §7.3 — 채팅 버블 (좌: AI 아바타, 우: 사용자)
'use client';

import type { ChatMessage } from '@/types';

interface ChatBubbleProps {
  readonly message: ChatMessage;
  readonly voiceName?: string;
  readonly onPlayAudio?: () => void;
  readonly isSpeaking?: boolean;
}

export function ChatBubble({ message, voiceName, onPlayAudio, isSpeaking }: ChatBubbleProps) {
  const isAI = message.role === 'ai';

  return (
    <div className={`flex gap-2 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {/* AI 아바타 */}
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm shrink-0">
          {voiceName?.charAt(0) ?? '🤖'}
        </div>
      )}

      <div className={`max-w-[75%] ${isAI ? '' : ''}`}>
        {/* 버블 */}
        <div className={`
          px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isAI
            ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
            : 'bg-blue-600 text-white rounded-tr-sm'}
        `}>
          {message.text}
        </div>

        {/* AI 버블 하단: 재생 버튼 + 피드백 */}
        {isAI && (
          <div className="flex items-center gap-2 mt-1 px-1">
            {onPlayAudio && (
              <button
                onClick={onPlayAudio}
                className="text-xs text-gray-400 hover:text-purple-600 transition-colors"
              >
                {isSpeaking ? '⏹ 정지' : '🔊 듣기'}
              </button>
            )}
            {message.feedback && message.feedback.grammar.length > 0 && (
              <span className="text-xs text-orange-500">
                💡 피드백 {message.feedback.grammar.length}개
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
