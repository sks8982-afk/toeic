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

You must ALWAYS respond in exactly this format:

[Your English reply here, 1-3 sentences]
---FEEDBACK---
{"grammar_issues":[{"original":"what user said wrong","corrected":"correct version","explanation":"한국어로 설명"}],"pronunciation_tips":[{"word":"hard word user said","tip":"한국어 발음 팁"}],"suggestions":["better way user could say it"]}

Rules:
- Analyze ONLY the user's last message: "${lastUserMsg}"
- Do NOT give feedback on your own reply
- Always include the ---FEEDBACK--- separator and JSON, even if empty arrays
- grammar_issues: find grammar mistakes in user's sentence
- pronunciation_tips: words Korean speakers struggle with (th, r/l, v/b, f/p)
- suggestions: more natural expressions for what the user tried to say
- Example empty: {"grammar_issues":[],"pronunciation_tips":[],"suggestions":[]}`;

    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`)
      .join('\n');

    const prompt = `${systemPrompt}\n\nConversation:\n${conversationHistory}\n\nYour reply:`;

    const rawResponse = await generateContent(prompt);

    // ---FEEDBACK--- 구분자로 텍스트와 JSON 분리
    let text = rawResponse;
    let feedback = {
      grammar_issues: [] as Array<{ original: string; corrected: string; explanation: string }>,
      pronunciation_tips: [] as Array<{ word: string; tip: string }>,
      suggestions: [] as string[],
    };

    // 방법 1: ---FEEDBACK--- 구분자
    if (rawResponse.includes('---FEEDBACK---')) {
      const parts = rawResponse.split('---FEEDBACK---');
      text = parts[0].trim();
      try {
        const jsonStr = parts[1].match(/\{[\s\S]*\}/)?.[0];
        if (jsonStr) feedback = JSON.parse(jsonStr);
      } catch {}
    } else {
      // 방법 2: JSON 직접 추출 (구분자 없을 때 폴백)
      const jsonMatch = rawResponse.match(/\{[\s\S]*"grammar_issues"[\s\S]*\}/);
      if (jsonMatch) {
        text = rawResponse.slice(0, jsonMatch.index).trim();
        try { feedback = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    // 텍스트에서 남은 잔여물 제거
    text = text
      .replace(/```[\w]*[\s\S]*?```/g, '')
      .replace(/\{[\s\S]*?\}/g, '')
      .replace(/---FEEDBACK---/g, '')
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
