// 단어 학습 카드 — 단어/뜻/예문만 표시하고 "다음 단어"로 넘김
'use client';

import type { VocabWord } from '@/types';

interface FlashcardProps {
  readonly word: VocabWord;
  readonly onNext: () => void;
}

export function Flashcard({ word, onNext }: FlashcardProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* 단어 카드 — 한 면에 단어/발음/품사/뜻/예문 모두 표시 */}
      <div className="w-full min-h-[320px] p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-sm text-center flex flex-col justify-center gap-4">
        {/* 단어 + 발음 + 품사 */}
        <div className="space-y-2">
          <p className="text-3xl font-bold text-gray-900">{word.word}</p>
          {word.pronunciation ? (
            <p className="text-sm text-gray-400">{word.pronunciation}</p>
          ) : null}
          <div className="flex flex-wrap gap-1 justify-center">
            {word.partOfSpeech.split(/[,/]/).map((pos, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full"
              >
                {pos.trim()}
              </span>
            ))}
          </div>
        </div>

        <div className="w-12 h-0.5 bg-gray-200 mx-auto" />

        {/* 뜻 */}
        <p className="text-2xl font-bold text-blue-600">{word.meaning}</p>

        {/* 예문 */}
        {word.exampleSentence ? (
          <p className="text-sm text-gray-600 leading-relaxed italic">
            {word.exampleSentence}
          </p>
        ) : null}

        {/* 카테고리 */}
        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full self-center">
          {word.category}
        </span>
      </div>

      {/* 다음 단어 버튼 */}
      <button
        onClick={onNext}
        className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-base shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all"
      >
        다음 단어 →
      </button>
    </div>
  );
}
