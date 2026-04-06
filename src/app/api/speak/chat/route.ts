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

    // 마지막 사용자 메시지 추출 (피드백 대상)
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.text ?? '';

    const systemPrompt = `You are a friendly English conversation partner for a Korean learner.
Level: ${levelDesc}${scenarioContext}

RESPONSE FORMAT:
1. First, write your conversational reply in English (1-3 sentences). Do NOT include any JSON, code blocks, or technical formatting in this part.
2. Then on a NEW LINE, write ONLY a JSON object (no markdown, no \`\`\`):

{"grammar_issues":[{"original":"user's wrong phrase","corrected":"correct version","explanation":"한국어 설명"}],"pronunciation_tips":[{"word":"word from user","tip":"한국어 발음 팁"}],"suggestions":["more natural way to say what THE USER said"]}

CRITICAL RULES:
- The feedback JSON must ONLY analyze the USER's LAST message: "${lastUserMsg}"
- Do NOT analyze or give feedback on YOUR OWN response
- grammar_issues: errors in the USER's sentence only
- pronunciation_tips: words the USER used that Korean speakers find hard to pronounce
- suggestions: better ways the USER could have expressed their message
- If the user's message has no issues, use empty arrays: {"grammar_issues":[],"pronunciation_tips":[],"suggestions":[]}
- NEVER put JSON inside your conversational reply`;

    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
      .join('\n');

    const prompt = `${systemPrompt}\n\nConversation:\n${conversationHistory}\n\nYour reply:`;

    const rawResponse = await generateContent(prompt);

    // AI 응답에서 텍스트와 피드백 JSON 분리
    let text = rawResponse;
    let feedback = {
      grammar_issues: [] as Array<{ original: string; corrected: string; explanation: string }>,
      pronunciation_tips: [] as Array<{ word: string; tip: string }>,
      suggestions: [] as string[],
    };

    // JSON 추출 시도 (여러 패턴)
    const jsonPatterns = [
      /\{[^{}]*"grammar_issues"\s*:\s*\[[\s\S]*?\]\s*,[\s\S]*?\}/,
      /\{[\s\S]*?"grammar_issues"[\s\S]*?\}(?![\s\S]*\{)/,
    ];

    for (const pattern of jsonPatterns) {
      const match = rawResponse.match(pattern);
      if (match) {
        text = rawResponse.slice(0, match.index).trim();
        try {
          feedback = JSON.parse(match[0]);
          break;
        } catch {
          // 다음 패턴 시도
        }
      }
    }

    // 텍스트에서 남은 JSON/코드블록 잔여물 제거
    text = text
      .replace(/```[\w]*[\s\S]*?```/g, '')
      .replace(/\{[\s\S]*?\}/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();

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
