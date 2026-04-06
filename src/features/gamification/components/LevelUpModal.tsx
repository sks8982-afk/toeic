// Design Ref: §7.2 — 레벨업 시 풀스크린 축하 모달
'use client';

import { Modal, Button } from '@/shared/components/ui';

interface LevelUpModalProps {
  readonly open: boolean;
  readonly level: number;
  readonly onClose: () => void;
}

export function LevelUpModal({ open, level, onClose }: LevelUpModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center py-4">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">레벨 업!</h2>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold mb-4">
          {level}
        </div>
        <p className="text-gray-600 mb-6">
          축하합니다! <strong>Level {level}</strong>에 도달했습니다!
        </p>
        <Button onClick={onClose} fullWidth size="lg">
          계속 학습하기
        </Button>
      </div>
    </Modal>
  );
}
