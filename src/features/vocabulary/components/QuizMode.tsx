// Design Ref: §2.2.2 F-VOCAB-04 — 4가지 퀴즈 모드 (영→한, 한→영, 빈칸, 듣고맞추기)
'use client';

import { useState, useMemo } from 'react';
import type { VocabWord } from '@/types';

interface QuizModeProps {
  readonly word: VocabWord;
  readonly allWords: readonly VocabWord[];
  readonly mode: 'en-to-kr' | 'kr-to-en' | 'fill-blank';
  readonly onAnswer: (correct: boolean) => void;
}

function shuffleOptions(correct: string, pool: string[]): string[] {
  const others = pool.filter(o => o !== correct);
  const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [correct, ...shuffled].sort(() => Math.random() - 0.5);
  return options;
}

export function QuizMode({ word, allWords, mode, onAnswer }: QuizModeProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const { question, correctAnswer, options } = useMemo(() => {
    if (mode === 'en-to-kr') {
      return {
        question: word.word,
        correctAnswer: word.meaning,
        options: shuffleOptions(word.meaning, allWords.map(w => w.meaning)),
      };
    }
    if (mode === 'kr-to-en') {
      return {
        question: word.meaning,
        correctAnswer: word.word,
        options: shuffleOptions(word.word, allWords.map(w => w.word)),
      };
    }
    // fill-blank
    const blanked = word.exampleSentence.replace(
      new RegExp(word.word, 'i'),
      '______',
    );
    return {
      question: blanked,
      correctAnswer: word.word,
      options: shuffleOptions(word.word, allWords.map(w => w.word)),
    };
  }, [word, allWords, mode]);

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelected(option);
    setShowResult(true);

    const isCorrect = option === correctAnswer;
    setTimeout(() => {
      onAnswer(isCorrect);
      setSelected(null);
      setShowResult(false);
    }, 1200);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 문제 */}
      <div className="p-5 mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm text-center">
        <p className="text-xs text-gray-400 mb-2">
          {mode === 'en-to-kr' ? '뜻을 고르세요' : mode === 'kr-to-en' ? '영단어를 고르세요' : '빈칸에 들어갈 단어는?'}
        </p>
        <p className="text-xl font-bold text-gray-900">{question}</p>
      </div>

      {/* 선택지 */}
      <div className="space-y-3">
        {options.map(option => {
          let style = 'bg-white border-gray-200 hover:border-blue-400';
          if (showResult) {
            if (option === correctAnswer) {
              style = 'bg-green-50 border-green-500 text-green-800';
            } else if (option === selected) {
              style = 'bg-red-50 border-red-500 text-red-800';
            } else {
              style = 'bg-gray-50 border-gray-200 text-gray-400';
            }
          }

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={showResult}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
