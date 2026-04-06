// Design Ref: §2.2.2 F-VOCAB-03 — 플래시카드 (단어 → 뜻 → 예문)
'use client';

import { useState } from 'react';
import type { VocabWord } from '@/types';

interface FlashcardProps {
  readonly word: VocabWord;
  readonly onAssess: (result: 'know' | 'unsure' | 'unknown') => void;
}

export function Flashcard({ word, onAssess }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 카드 */}
      <button
        onClick={() => setFlipped(!flipped)}
        className="w-full min-h-[280px] p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all text-center"
      >
        {!flipped ? (
          // 앞면: 영단어
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-3xl font-bold text-gray-900">{word.word}</p>
            <p className="text-sm text-gray-400">{word.pronunciation}</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {word.partOfSpeech.split(/[,/]/).map((pos, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">
                  {pos.trim()}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">탭하여 뜻 보기</p>
          </div>
        ) : (
          // 뒷면: 뜻 + 예문
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-2xl font-bold text-blue-600">{word.meaning}</p>
            <div className="w-12 h-0.5 bg-gray-200" />
            <p className="text-sm text-gray-600 leading-relaxed">
              {word.exampleSentence}
            </p>
            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
              {word.category}
            </span>
          </div>
        )}
      </button>

      {/* 자가 평가 버튼 (뒷면에서만) */}
      {flipped && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setFlipped(false); onAssess('unknown'); }}
            className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
          >
            몰라요
          </button>
          <button
            onClick={() => { setFlipped(false); onAssess('unsure'); }}
            className="flex-1 py-3 rounded-xl bg-yellow-50 text-yellow-600 font-semibold text-sm hover:bg-yellow-100 transition-colors"
          >
            애매해요
          </button>
          <button
            onClick={() => { setFlipped(false); onAssess('know'); }}
            className="flex-1 py-3 rounded-xl bg-green-50 text-green-600 font-semibold text-sm hover:bg-green-100 transition-colors"
          >
            알아요
          </button>
        </div>
      )}
    </div>
  );
}
