// 음성 캐릭터 선택 — 대화 상단 또는 모달에서 사용
'use client';

import { useState } from 'react';
import { Modal } from '@/shared/components/ui';
import type { VoiceOption } from '../hooks/useTextToSpeech';

interface VoicePickerProps {
  readonly voices: readonly VoiceOption[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onPreview: (id: string) => void;
}

const GENDER_EMOJI = { female: '👩', male: '👨', unknown: '🗣️' } as const;

export function VoicePicker({ voices, selectedId, onSelect, onPreview }: VoicePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = voices.find(v => v.id === selectedId);

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors"
      >
        <span>{selected ? GENDER_EMOJI[selected.gender] : '🗣️'}</span>
        <span>{selected ? selected.name.split(' ')[0] : '음성 선택'}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 음성 선택 모달 */}
      <Modal open={open} onClose={() => setOpen(false)} title="AI 음성 선택">
        <div className="space-y-2 mt-3 max-h-80 overflow-y-auto">
          {voices.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">사용 가능한 음성이 없습니다</p>
          )}
          {voices.map(voice => (
            <div
              key={voice.id}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                ${voice.id === selectedId
                  ? 'bg-purple-50 border-purple-400'
                  : 'bg-white border-gray-200 hover:border-purple-300'}
              `}
            >
              {/* 선택 영역 */}
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => { onSelect(voice.id); setOpen(false); }}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && (onSelect(voice.id), setOpen(false))}
              >
                <span className="text-2xl">{GENDER_EMOJI[voice.gender]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{voice.name}</p>
                  <p className="text-xs text-gray-400">{voice.lang}</p>
                </div>
                {voice.id === selectedId && (
                  <span className="text-purple-600 shrink-0">✓</span>
                )}
              </div>
              {/* 미리듣기 버튼 */}
              <button
                onClick={() => onPreview(voice.id)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 shrink-0"
              >
                🔊 듣기
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
