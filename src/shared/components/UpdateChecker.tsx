// 앱 업데이트 체크 — 로컬 버전 vs 서버 최신 버전 비교
'use client';

import { useEffect, useState } from 'react';
import { APP_VERSION } from '@/shared/lib/version';
import { Button, Modal } from '@/shared/components/ui';

interface VersionInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
}

function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] ?? 0) > (l[i] ?? 0)) return true;
    if ((r[i] ?? 0) < (l[i] ?? 0)) return false;
  }
  return false;
}

export function UpdateChecker() {
  const [update, setUpdate] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 앱 시작 시 + 30분마다 버전 체크
    const check = async () => {
      try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const data: VersionInfo = await res.json();

        if (isNewerVersion(data.version, APP_VERSION)) {
          setUpdate(data);
        }
      } catch {
        // 네트워크 오류 무시
      }
    };

    check();
    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!update || dismissed) return null;

  return (
    <Modal open={true} onClose={() => setDismissed(true)} title="업데이트 안내">
      <div className="space-y-4 mt-2">
        <div className="text-center">
          <div className="text-4xl mb-2">🆕</div>
          <p className="text-lg font-bold text-gray-900">
            새 버전이 있습니다!
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {APP_VERSION} → {update.version}
          </p>
        </div>

        {update.releaseNotes && (
          <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">
            {update.releaseNotes}
          </div>
        )}

        <div className="space-y-2">
          <a href={update.downloadUrl} download>
            <Button fullWidth size="lg">
              최신 버전 다운로드
            </Button>
          </a>
          <Button
            fullWidth
            size="md"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            나중에
          </Button>
        </div>
      </div>
    </Modal>
  );
}
