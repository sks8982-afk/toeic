// AI 시나리오 동적 생성 — Gemini가 레벨에 맞는 대화 상황을 생성
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateContent } from '@/shared/lib/gemini';

const LEVEL_DESC: Record<number, string> = {
  1: 'absolute beginner - very simple daily situations (ordering food, greeting, asking for things)',
  2: 'elementary - basic travel and shopping situations (hotel, restaurant, store, transportation)',
  3: 'intermediate - workplace and social situations (meetings, complaints, presentations, phone calls)',
  4: 'upper-intermediate - professional and opinion situations (negotiations, debates, interviews)',
  5: 'advanced - complex leadership and public speaking (crisis management, TED talks, diplomacy)',
};

const requestSchema = z.object({
  level: z.number().int().min(1).max(5),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { level } = parsed.data;
    const levelDesc = LEVEL_DESC[level] ?? LEVEL_DESC[3];

    const prompt = `Generate a unique, creative English conversation scenario for a Korean learner.

Level: ${level}/5 (${levelDesc})

Requirements:
- Create a specific, vivid situation (not generic)
- The situation should be different from common ones like "cafe", "airport", "hotel"
- Be creative: think of situations like "returning a wrong pizza delivery", "asking a neighbor to turn down music", "explaining a car problem to a mechanic", "ordering at a food truck festival", etc.

Return ONLY valid JSON (no markdown):
{
  "title": "Short English title",
  "titleKo": "한국어 제목 (2-4자)",
  "introKo": "한국어로 상황을 생생하게 설명하고, 사용자가 어떻게 시작하면 좋을지 예시 문장을 포함. 3-4문장으로.",
  "keyExpressions": ["useful expression 1", "useful expression 2", "useful expression 3", "useful expression 4"],
  "missions": ["mission 1", "mission 2", "mission 3"]
}`;

    const text = await generateContent(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to generate scenario' }, { status: 500 });
    }

    const scenario = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      id: `ai-${Date.now()}`,
      ...scenario,
      minLevel: level,
      maxLevel: level,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
