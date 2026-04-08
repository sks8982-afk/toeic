// TOEIC 모의고사 API — 실제 TOEIC과 유사한 구성
import { NextResponse } from 'next/server';
import { generateContent } from '@/shared/lib/gemini';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// GET: 모의고사 목록
export async function GET() {
  const { data, error } = await supabase
    .from('mock_exams')
    .select('id, title, description, total_questions, difficulty, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exams: data });
}

// POST: 모의고사 생성 (실제 TOEIC 미니 버전)
export async function POST() {
  try {
    // Part 3/4 리스닝 생성 (긴 대화/독백)
    const listeningPrompt = `Generate 5 TOEIC Listening questions that closely mimic real TOEIC test format.

Question 1-2: Part 3 style — LONG two-person conversation
- MUST have at least 8-12 lines of dialogue alternating between (Man) and (Woman)
- Set in a realistic workplace: office, restaurant, hotel, airport, hospital, store
- Include specific details: names, dates, times, prices, locations
- The conversation must feel natural with fillers like "Actually," "Well," "By the way,"
- Example length (MINIMUM this long):
"(Woman) Hi David, I'm calling about the Henderson project. Have you finished reviewing the budget proposal?
(Man) Yes, I went through it this morning. There are a few items I think we should discuss before submitting it to the finance department.
(Woman) Oh really? What concerns did you have?
(Man) Well, the estimated cost for the marketing campaign seems quite high. They're requesting forty-five thousand dollars, but I think we could achieve similar results with a more targeted approach.
(Woman) I see. Actually, I spoke with the marketing team yesterday, and they mentioned that the costs include the new social media advertising platform they want to try.
(Man) That makes sense. In that case, maybe we should schedule a meeting with both teams to go over the details together.
(Woman) Good idea. How about Thursday afternoon? I know the conference room on the third floor is available from two to four.
(Man) Thursday works for me. I'll send out a calendar invite and ask Sarah from marketing to prepare a breakdown of the costs.
(Woman) Perfect. Also, don't forget we need to submit the final proposal to Mr. Henderson by next Monday.
(Man) Right, I'll keep that deadline in mind. Let me finalize my notes and I'll share them with you by tomorrow morning."

Question 3-4: Part 4 style — LONG monologue/announcement
- MUST be at least 8-10 sentences
- Types: company announcement, tour guide narration, news report, voicemail message, meeting presentation
- Include many specific details
- Example types: "Attention all employees..." or "Welcome to the annual..."

Question 5: Part 2 style — Short question-response (for variety)
- 1 sentence question + context

Each question must have:
- "audioText": the FULL English text (MUST be long as described above)
- "question": specific Korean question about a detail in the audio
- "options": 4 Korean options (one correct, three plausible but wrong)
- "correctIndex": 0-3
- "explanation": Korean explanation referencing specific part of the audio
- "part": "listening"

Return ONLY a valid JSON array, no markdown.`;

    // Part 5/6/7 리딩 생성
    const readingPrompt = `Generate 5 TOEIC Reading questions that closely mimic real TOEIC test format.

Question 1-2: Part 5 — Incomplete sentence (grammar/vocabulary)
- Full business English sentence with one ___ blank
- 4 options in English
- Mix: one grammar (tense/POS/preposition) and one vocabulary

Question 3: Part 6 — Text completion (paragraph with blank)
- A 4-5 sentence business paragraph (email excerpt, notice, memo)
- One ___ blank in context
- Must read the full paragraph to determine the answer

Question 4-5: Part 7 — Reading comprehension
- Provide a FULL English passage (email, advertisement, article, notice) — minimum 6-8 sentences with details
- Korean question about the passage content
- 4 Korean options

Example Part 7 passage (MINIMUM this length):
"Dear Mr. Thompson,

Thank you for your interest in our Premium Business Package. As discussed during our phone conversation on Tuesday, I am pleased to offer you a special promotional rate for the first six months of your subscription.

The Premium Business Package includes unlimited access to all online courses, monthly webinars with industry experts, and a dedicated account manager. Additionally, you will receive quarterly reports analyzing your team's progress and personalized recommendations for further training.

The regular price is $299 per month, but as part of our spring promotion, you will pay only $199 per month for the first six months. After the promotional period, the standard rate will apply unless you choose to cancel.

Please review the attached contract and return a signed copy by March 15th to secure this offer. If you have any questions, feel free to contact me directly at extension 4521.

Best regards,
Jennifer Walsh
Corporate Sales Manager"

Each question must have:
- "sentence": the English text/passage
- "question": Korean question (null for Part 5-6, Korean question for Part 7)
- "options": 4 options (English for Part 5-6, Korean for Part 7)
- "correctIndex": 0-3
- "explanation": Korean explanation
- "grammarPoint": type label
- "part": "reading"

Return ONLY a valid JSON array, no markdown.`;

    const [listeningRaw, readingRaw] = await Promise.all([
      generateContent(listeningPrompt),
      generateContent(readingPrompt),
    ]);

    const listeningMatch = listeningRaw.match(/\[[\s\S]*\]/);
    const readingMatch = readingRaw.match(/\[[\s\S]*\]/);

    const listeningQuestions = listeningMatch ? JSON.parse(listeningMatch[0]) : [];
    const readingQuestions = readingMatch ? JSON.parse(readingMatch[0]) : [];

    const total = listeningQuestions.length + readingQuestions.length;
    const examNumber = Math.floor(Math.random() * 900) + 100;
    const title = `TOEIC 미니 모의고사 #${examNumber} — ${total}문제`;

    const { data: exam, error } = await supabase
      .from('mock_exams')
      .insert({
        title,
        description: `리스닝 ${listeningQuestions.length}문제 + 리딩 ${readingQuestions.length}문제`,
        total_questions: total,
        listening_questions: listeningQuestions,
        reading_questions: readingQuestions,
        difficulty: 'standard',
        created_by: 'system',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ exam });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
