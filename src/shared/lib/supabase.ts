// Design Ref: §7.3 — Supabase 클라이언트 설정
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 브라우저용 싱글턴 클라이언트
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
