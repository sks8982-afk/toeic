// Design Ref: §4.2 — POST /api/speak/chat (Gemini AI 대화)
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Beginner - Use very simple words and short sentences (5-8 words). Speak slowly.',
  2: 'Elementary - Use simple vocabulary and basic grammar. Keep sentences under 12 words.',
  3: 'Intermediate - Use everyday vocabulary and varied grammar. Natural pace.',
  4: 'Upper-Intermediate - Use diverse vocabulary, complex sentences, and idiomatic expressions.',
  5: 'Advanced - Use sophisticated vocabulary, nuanced expressions, and natural fluency.',
};

const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'ai']),
    text: z.string(),
  })),
  level: z.number().int().min(1).max(5),
  scenario: z.string().optional(),
  scenarioTitle: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { messages, level, scenario, scenarioTitle } = parsed.data;
    const levelDesc = LEVEL_DESCRIPTIONS[level] ?? LEVEL_DESCRIPTIONS[3];

    const scenarioContext = scenario
      ? `\nScenario: ${scenarioTitle ?? scenario}. Stay in character as the other person in this scenario.`
      : '\nThis is a free conversation. Talk about any topic the user brings up.';

    const systemPrompt = `You are a friendly English conversation partner for a Korean learner.
Level: ${levelDesc}${scenarioContext}

Rules:
- Respond naturally in English only (1-3 sentences max)
- Match the complexity to the user's level
- If the user makes a grammar mistake, respond naturally first
- After your response, add a JSON block with feedback:
{
  "grammar_issues": [{"original": "wrong phrase", "corrected": "correct phrase", "explanation": "한국어로 설명"}],
  "pronunciation_tips": [{"word": "difficult word", "tip": "한국어로 발음 팁. 예: '이 단어는 th 발음이 중요해요. 혀를 이 사이에 넣고 발음하세요.'"}],
  "suggestions": ["More natural expression 1", "More natural expression 2"]
}
- pronunciation_tips: If the user's sentence contains words that Korean speakers commonly mispronounce (th, r/l, v/b, f/p, z sounds), provide Korean pronunciation tips
- If no issues, return empty arrays
- IMPORTANT: Always end with the JSON block on a new line after your conversational response`;

    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
      .join('\n');

    const prompt = `${systemPrompt}\n\nConversation so far:\n${conversationHistory}\n\nRespond as AI:`;

    const rawResponse = await generateContent(prompt);

    // AI 응답에서 텍스트와 피드백 JSON 분리
    const jsonMatch = rawResponse.match(/\{[\s\S]*"grammar_issues"[\s\S]*\}/);
    let text = rawResponse;
    let feedback = {
      grammar_issues: [] as Array<{ original: string; corrected: string; explanation: string }>,
      pronunciation_tips: [] as Array<{ word: string; tip: string }>,
      suggestions: [] as string[],
    };

    if (jsonMatch) {
      text = rawResponse.slice(0, jsonMatch.index).trim();
      try {
        feedback = JSON.parse(jsonMatch[0]);
      } catch {
        // JSON 파싱 실패 시 피드백 없이 진행
      }
    }

    return NextResponse.json({
      text,
      feedback: {
        grammar: feedback.grammar_issues ?? [],
        pronunciationTips: feedback.pronunciation_tips ?? [],
        suggestions: feedback.suggestions ?? [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
