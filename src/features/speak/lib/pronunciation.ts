// Design Ref: §5.3 — 발음 비교 유틸 (STT 결과 vs 기대 텍스트)

export interface WordAccuracy {
  readonly word: string;
  readonly status: 'correct' | 'partial' | 'wrong' | 'missing';
}

export function calculatePronunciationScore(expected: string, actual: string): number {
  const expectedWords = normalizeText(expected).split(/\s+/).filter(Boolean);
  const actualWords = normalizeText(actual).split(/\s+/).filter(Boolean);

  if (expectedWords.length === 0) return 0;

  let matchCount = 0;
  for (const word of expectedWords) {
    if (actualWords.includes(word)) matchCount++;
  }

  return Math.round((matchCount / expectedWords.length) * 100);
}

export function getWordAccuracy(expected: string, actual: string): WordAccuracy[] {
  const expectedWords = normalizeText(expected).split(/\s+/).filter(Boolean);
  const actualSet = new Set(normalizeText(actual).split(/\s+/).filter(Boolean));

  return expectedWords.map(word => {
    if (actualSet.has(word)) {
      return { word, status: 'correct' };
    }
    // 부분 일치 체크 (처음 3글자 이상 일치)
    const isPartial = Array.from(actualSet).some(
      a => a.length >= 3 && word.length >= 3 && (a.startsWith(word.slice(0, 3)) || word.startsWith(a.slice(0, 3))),
    );
    return { word, status: isPartial ? 'partial' : 'wrong' };
  });
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, '')
    .trim();
}
