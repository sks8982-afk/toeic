// Supabase에 유저 진행 데이터 동기화 (랭킹용)
import { supabase } from './supabase';

export async function syncProgressToSupabase(userId: string, xp: number, level: number, streak: number, name: string) {
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      device_id: userId,
      xp,
      level,
      streak,
      settings: { name },
      last_study_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'device_id' });

  return { error };
}

// Supabase에서 유저 진행 데이터 로드 (로그인 시)
export async function loadProgressFromSupabase(userId: string): Promise<{
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string;
} | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('xp, level, streak, last_study_date')
    .eq('device_id', userId)
    .single();

  if (error || !data) return null;

  return {
    xp: data.xp ?? 0,
    level: data.level ?? 1,
    streak: data.streak ?? 0,
    lastStudyDate: data.last_study_date ?? '',
  };
}

export interface RankingEntry {
  readonly rank: number;
  readonly deviceId: string;
  readonly name: string;
  readonly xp: number;
  readonly level: number;
  readonly streak: number;
}

export async function fetchRankings(limit: number = 50): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('device_id, xp, level, streak, settings')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row, idx) => ({
    rank: idx + 1,
    deviceId: row.device_id,
    name: (row.settings as Record<string, string>)?.name ?? '사용자',
    xp: row.xp,
    level: row.level,
    streak: row.streak,
  }));
}
