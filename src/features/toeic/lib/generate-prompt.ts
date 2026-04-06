// Design Ref: §6.2 — Gemini 프롬프트 빌더 (TOEIC Part 5)
import type { GrammarType, Difficulty } from '@/types';

const TYPE_DESCRIPTIONS: Record<GrammarType, string> = {
  pos: 'Part of Speech (noun/verb/adjective/adverb selection) - The blank requires choosing the correct word form.',
  tense: 'Verb Tense (present/past/present perfect/future) - The blank requires the correct tense.',
  agreement: 'Subject-Verb Agreement - The blank requires matching the subject in number.',
  relative: 'Relative Pronouns (who/which/that/whose/where) - The blank requires the correct relative pronoun.',
  preposition: 'Preposition Usage (in/on/at/by/for/with) - The blank requires the correct preposition.',
  conjunction: 'Conjunctions (and/but/although/because/while) - The blank requires the correct conjunction.',
  vocabulary: 'Vocabulary Discrimination - All options are the same part of speech but different meanings.',
};

const DIFFICULTY_GUIDE: Record<Difficulty, string> = {
  easy: 'Use common vocabulary and straightforward sentence structures. Target TOEIC score 400-600.',
  medium: 'Use business vocabulary and moderate complexity. Target TOEIC score 600-800.',
  hard: 'Use advanced vocabulary and complex structures. Target TOEIC score 800+.',
};

export function buildGeneratePrompt(type: GrammarType, difficulty: Difficulty, count: number = 1): string {
  return `You are a TOEIC Part 5 question generator. Generate ${count} question(s).

Question Type: ${TYPE_DESCRIPTIONS[type]}
Difficulty: ${DIFFICULTY_GUIDE[difficulty]}

Requirements:
- Each question must have exactly 4 answer options (A, B, C, D)
- The sentence should be a realistic business/workplace context
- Include a clear blank (___) in the sentence
- Provide a concise explanation in Korean (2-3 sentences)
- Include the grammar point being tested

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "sentence": "The company ___ a new policy last month.",
    "options": ["implemented", "implementing", "implement", "implementation"],
    "correctIndex": 0,
    "explanation": "'last month'가 과거 시제를 나타내므로 과거형 'implemented'가 정답입니다.",
    "grammarPoint": "과거 시제 (Simple Past)"
  }
]`;
}
