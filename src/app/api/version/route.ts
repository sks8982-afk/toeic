// 최신 버전 정보 API — APK가 이 엔드포인트를 주기적으로 확인
import { NextResponse } from 'next/server';
import { APP_VERSION, APK_DOWNLOAD_URL } from '@/shared/lib/version';

export async function GET() {
  return NextResponse.json({
    version: APP_VERSION,
    downloadUrl: APK_DOWNLOAD_URL,
    releaseNotes: '',  // 업데이트 시 변경사항 메모
  });
}
