// 시나리오 데이터 — 레벨별 충분한 시나리오 + 자동 시작 한국어 안내
import type { Scenario } from '@/types';

export interface ScenarioWithIntro extends Scenario {
  readonly introKo: string; // AI가 처음에 한국어로 안내하는 문장
}

export const SCENARIOS: readonly ScenarioWithIntro[] = [
  // ─── 입문 (Lv.1) ───
  {
    id: 'cafe-order',
    title: 'Ordering at a Cafe',
    titleKo: '카페 주문',
    description: 'Order your favorite drink at a coffee shop',
    minLevel: 1, maxLevel: 2,
    missions: ['Order a drink', 'Ask to change the size', 'Pay for the order'],
    keyExpressions: ["Can I get a ...?", "I'd like to order ...", "Could you make that a large?", "Can I pay with card?"],
    introKo: '당신은 지금 카페에 있습니다. 바리스타에게 영어로 음료를 주문해보세요! 예를 들어 "Can I get a latte?" 라고 말해보세요.',
  },
  {
    id: 'greeting-intro',
    title: 'Meeting Someone New',
    titleKo: '첫 만남 인사',
    description: 'Introduce yourself to a new person',
    minLevel: 1, maxLevel: 1,
    missions: ['Say hello', 'Tell your name', 'Ask their name'],
    keyExpressions: ["Hi, my name is ...", "Nice to meet you.", "What's your name?", "Where are you from?"],
    introKo: '새로운 사람을 만났습니다! 영어로 자기소개를 해보세요. "Hi, my name is..." 으로 시작해보세요.',
  },
  {
    id: 'fast-food',
    title: 'Fast Food Restaurant',
    titleKo: '패스트푸드 주문',
    description: 'Order a meal at a fast food restaurant',
    minLevel: 1, maxLevel: 1,
    missions: ['Order a meal', 'Choose a side', 'Ask for the total'],
    keyExpressions: ["I'll have the ...", "Can I get fries with that?", "For here or to go?", "How much is that?"],
    introKo: '패스트푸드 매장에 왔습니다! 세트 메뉴를 주문해보세요. "I\'ll have the number one combo" 같이 말해보세요.',
  },
  {
    id: 'ask-directions',
    title: 'Asking for Directions',
    titleKo: '길 묻기',
    description: 'Ask someone for directions on the street',
    minLevel: 1, maxLevel: 2,
    missions: ['Get attention politely', 'Ask where a place is', 'Thank them'],
    keyExpressions: ["Excuse me, could you tell me how to get to ...?", "Is it far from here?", "Turn left/right", "Thank you so much!"],
    introKo: '낯선 거리에서 길을 잃었습니다! 지나가는 사람에게 영어로 길을 물어보세요. "Excuse me, how do I get to...?" 로 시작해보세요.',
  },

  // ─── 초급 (Lv.2) ───
  {
    id: 'hotel-checkin',
    title: 'Hotel Check-in',
    titleKo: '호텔 체크인',
    description: 'Check into your hotel and ask about facilities',
    minLevel: 2, maxLevel: 2,
    missions: ['Check in', 'Ask about Wi-Fi', 'Ask about breakfast time'],
    keyExpressions: ["I have a reservation under ...", "What's the Wi-Fi password?", "What time is breakfast?", "Could I get a wake-up call?"],
    introKo: '호텔에 도착했습니다! 프론트 데스크에서 체크인을 해보세요. "I have a reservation under..." 으로 시작하세요.',
  },
  {
    id: 'shopping-clothes',
    title: 'Shopping for Clothes',
    titleKo: '옷 쇼핑',
    description: 'Shop for clothes and ask about sizes',
    minLevel: 2, maxLevel: 2,
    missions: ['Ask about a size', 'Try something on', 'Ask for a discount'],
    keyExpressions: ["Do you have this in a medium?", "Can I try this on?", "Where is the fitting room?", "Is this on sale?"],
    introKo: '옷 가게에 왔습니다! 마음에 드는 옷을 발견했어요. 사이즈를 물어보세요. "Do you have this in...?" 로 말해보세요.',
  },
  {
    id: 'restaurant-order',
    title: 'Restaurant Dining',
    titleKo: '레스토랑 식사',
    description: 'Have a meal at a sit-down restaurant',
    minLevel: 2, maxLevel: 3,
    missions: ['Ask for a table', 'Order food', 'Ask for the bill'],
    keyExpressions: ["A table for two, please.", "I'd like the ...", "Could I see the menu?", "Can I have the check, please?"],
    introKo: '레스토랑에 왔습니다! 자리를 잡고 음식을 주문해보세요. "A table for two, please" 로 시작하면 됩니다.',
  },
  {
    id: 'airport-checkin',
    title: 'Airport Check-in',
    titleKo: '공항 체크인',
    description: 'Check in for your flight at the airport counter',
    minLevel: 2, maxLevel: 3,
    missions: ['Get your boarding pass', 'Request a window seat', 'Ask about baggage'],
    keyExpressions: ["I'd like to check in for my flight.", "Could I get a window seat?", "What's the baggage allowance?", "Where is the departure gate?"],
    introKo: '공항 체크인 카운터에 있습니다! 여권을 보여주고 탑승권을 받아보세요. "I\'d like to check in for..." 으로 시작하세요.',
  },
  {
    id: 'hospital-visit',
    title: 'Visiting a Doctor',
    titleKo: '병원 방문',
    description: 'Explain your symptoms and understand the doctor',
    minLevel: 2, maxLevel: 3,
    missions: ['Describe your symptoms', 'Make an appointment', 'Ask about prescription'],
    keyExpressions: ["I've been having ...", "It started about ... ago.", "How often should I take this?", "Do I need a follow-up visit?"],
    introKo: '몸이 좋지 않아 병원에 왔습니다. 의사에게 증상을 설명해보세요. "I\'ve been having a headache..." 처럼 말해보세요.',
  },

  // ─── 중급 (Lv.3) ───
  {
    id: 'job-interview',
    title: 'Job Interview',
    titleKo: '취업 면접',
    description: 'Answer common job interview questions',
    minLevel: 3, maxLevel: 4,
    missions: ['Introduce yourself', 'Describe your experience', 'Answer strength/weakness'],
    keyExpressions: ["I have experience in ...", "My greatest strength is ...", "I'm looking for an opportunity to ...", "I can contribute by ..."],
    introKo: '면접관 앞에 앉아 있습니다! "Tell me about yourself"라는 질문을 받았다고 생각하고 자기소개를 해보세요.',
  },
  {
    id: 'phone-complaint',
    title: 'Making a Complaint',
    titleKo: '전화 컴플레인',
    description: 'Call customer service to make a complaint',
    minLevel: 3, maxLevel: 3,
    missions: ['Explain the problem', 'Request a solution', 'Confirm the resolution'],
    keyExpressions: ["I'm calling about ...", "This is unacceptable because ...", "I'd like a refund/replacement.", "When can I expect this to be resolved?"],
    introKo: '구매한 제품에 문제가 있어서 고객센터에 전화했습니다! 문제를 설명하고 해결을 요청해보세요. "I\'m calling about a problem with..." 로 시작하세요.',
  },
  {
    id: 'giving-presentation',
    title: 'Giving a Presentation',
    titleKo: '발표하기',
    description: 'Give a short presentation at work',
    minLevel: 3, maxLevel: 4,
    missions: ['Open the presentation', 'Explain the main point', 'Conclude and take questions'],
    keyExpressions: ["Today I'd like to talk about ...", "Let me walk you through ...", "In conclusion, ...", "Are there any questions?"],
    introKo: '회의실에서 동료들 앞에 서 있습니다! 짧은 발표를 시작해보세요. "Good morning everyone, today I\'d like to talk about..." 로 시작하세요.',
  },
  {
    id: 'travel-problem',
    title: 'Travel Problem Solving',
    titleKo: '여행 중 문제 해결',
    description: 'Handle an unexpected problem while traveling',
    minLevel: 3, maxLevel: 3,
    missions: ['Explain the situation', 'Ask for help', 'Negotiate a solution'],
    keyExpressions: ["I seem to have lost my ...", "Could you help me with ...?", "What are my options?", "Is there anything you can do?"],
    introKo: '여행 중에 여권을 잃어버렸습니다! 호텔 직원에게 도움을 요청해보세요. "Excuse me, I have a problem..." 으로 시작하세요.',
  },

  // ─── 중상급 (Lv.4) ───
  {
    id: 'business-meeting',
    title: 'Business Meeting',
    titleKo: '비즈니스 미팅',
    description: 'Participate in a professional business meeting',
    minLevel: 4, maxLevel: 5,
    missions: ['Present a proposal', 'Respond to objections', 'Reach an agreement'],
    keyExpressions: ["I'd like to propose that ...", "I see your point, however ...", "Let's find a compromise.", "Shall we move forward?"],
    introKo: '중요한 비즈니스 미팅에 참석했습니다! 새로운 프로젝트를 제안해보세요. "I\'d like to propose..." 로 시작하세요.',
  },
  {
    id: 'salary-negotiation',
    title: 'Salary Negotiation',
    titleKo: '연봉 협상',
    description: 'Negotiate your salary with your manager',
    minLevel: 4, maxLevel: 5,
    missions: ['State your value', 'Present your request', 'Handle pushback'],
    keyExpressions: ["Based on my contributions, ...", "I believe a fair salary would be ...", "I'm open to discussing ...", "Could we find a middle ground?"],
    introKo: '연봉 협상 미팅입니다! 당신의 성과를 어필하고 원하는 연봉을 제시해보세요. "I appreciate this opportunity to discuss..." 로 시작하세요.',
  },
  {
    id: 'debate-topic',
    title: 'Debating a Topic',
    titleKo: '주제 토론',
    description: 'Discuss and debate a social topic',
    minLevel: 4, maxLevel: 5,
    missions: ['State your opinion', 'Support with reasons', 'Respond to counter-arguments'],
    keyExpressions: ["In my opinion, ...", "The reason I believe this is ...", "I understand your perspective, but ...", "On the other hand, ..."],
    introKo: '"재택근무 vs 사무실 출근" 어느 쪽이 더 좋을까요? 당신의 의견을 영어로 말해보세요. "I think..." 으로 시작하세요.',
  },

  // ─── 고급 (Lv.5) ───
  {
    id: 'crisis-management',
    title: 'Crisis Management',
    titleKo: '위기 대응',
    description: 'Lead a team through a crisis situation',
    minLevel: 5, maxLevel: 5,
    missions: ['Assess the situation', 'Assign responsibilities', 'Communicate the plan'],
    keyExpressions: ["We need to address this immediately.", "I suggest we prioritize ...", "Let's delegate tasks as follows ...", "I'll take responsibility for ..."],
    introKo: '회사에 긴급 상황이 발생했습니다! 팀장으로서 팀원들에게 상황을 설명하고 대응 계획을 세워보세요. "Everyone, we have an urgent situation..." 로 시작하세요.',
  },
  {
    id: 'ted-talk',
    title: 'TED-style Talk',
    titleKo: 'TED 스타일 발표',
    description: 'Give an inspiring short talk on a topic you care about',
    minLevel: 5, maxLevel: 5,
    missions: ['Hook the audience', 'Share your insight', 'End with a call to action'],
    keyExpressions: ["What if I told you that ...?", "The truth is, ...", "Here's what I've learned ...", "I challenge each of you to ..."],
    introKo: 'TED 무대에 서 있다고 상상해보세요! 당신이 열정을 가진 주제에 대해 영감을 주는 발표를 해보세요. 청중의 관심을 끄는 질문으로 시작하세요.',
  },
];

export function getScenarioById(id: string): ScenarioWithIntro | undefined {
  return SCENARIOS.find(s => s.id === id);
}

export function getScenariosForLevel(level: number): ScenarioWithIntro[] {
  return SCENARIOS.filter(s => level >= s.minLevel && level <= s.maxLevel);
}

export function getRandomScenarioForLevel(level: number): ScenarioWithIntro | undefined {
  const available = getScenariosForLevel(level);
  if (available.length === 0) return undefined;
  return available[Math.floor(Math.random() * available.length)];
}
