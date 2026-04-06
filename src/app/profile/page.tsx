// 프로필 페이지 — 유저 정보, 수정, 비밀번호 변경, 로그아웃
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Modal } from '@/shared/components/ui';
import { useAuth } from '@/shared/providers/AuthProvider';
import { supabase } from '@/shared/lib/supabase';
import { XPBar, StreakBadge } from '@/features/gamification/components';
import { useToeicStats } from '@/features/toeic/hooks/useToeicStats';
import { useLeitnerBox } from '@/features/vocabulary/hooks/useLeitnerBox';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { totalSolved, estimatedScore, overallRate } = useToeicStats();
  const { totalLearned, graduated } = useLeitnerBox();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const userName = user?.user_metadata?.name ?? '사용자';
  const userEmail = user?.email ?? '';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">프로필</h1>
        <StreakBadge />
      </div>

      {/* 유저 정보 카드 */}
      <Card padding="lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{userName}</h2>
            <p className="text-sm text-gray-500">{userEmail}</p>
          </div>
        </div>
      </Card>

      {/* XP */}
      <XPBar />

      {/* 학습 통계 */}
      <Card padding="lg">
        <h3 className="font-bold text-gray-900 mb-4">학습 통계</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600">{estimatedScore}</p>
            <p className="text-xs text-gray-500 mt-1">TOEIC 예상 점수</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{overallRate}%</p>
            <p className="text-xs text-gray-500 mt-1">TOEIC 정답률</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <p className="text-2xl font-bold text-purple-600">{totalSolved}</p>
            <p className="text-xs text-gray-500 mt-1">풀이 수</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <p className="text-2xl font-bold text-orange-600">{totalLearned}</p>
            <p className="text-xs text-gray-500 mt-1">학습 단어 ({graduated} 졸업)</p>
          </div>
        </div>
      </Card>

      {/* 설정 메뉴 */}
      <div className="space-y-2">
        <button
          onClick={() => setShowEditModal(true)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">이름 변경</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setShowPasswordModal(true)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">비밀번호 변경</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
        >
          <span className="text-sm font-medium text-red-600">로그아웃</span>
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* 이름 변경 모달 */}
      <EditNameModal
        open={showEditModal}
        currentName={userName}
        onClose={() => setShowEditModal(false)}
      />

      {/* 비밀번호 변경 모달 */}
      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}

function EditNameModal({ open, currentName, onClose }: {
  readonly open: boolean;
  readonly currentName: string;
  readonly onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      data: { name },
    });

    setIsLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: '이름이 변경되었습니다' });
      setTimeout(onClose, 1000);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="이름 변경">
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        {message && (
          <p className={`text-sm px-3 py-2 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message.text}
          </p>
        )}
        <Button type="submit" fullWidth disabled={isLoading}>
          {isLoading ? '변경 중...' : '변경하기'}
        </Button>
      </form>
    </Modal>
  );
}

function ChangePasswordModal({ open, onClose }: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다' });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(onClose, 1000);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="비밀번호 변경">
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="6자 이상"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="비밀번호 재입력"
          />
        </div>
        {message && (
          <p className={`text-sm px-3 py-2 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {message.text}
          </p>
        )}
        <Button type="submit" fullWidth disabled={isLoading}>
          {isLoading ? '변경 중...' : '비밀번호 변경'}
        </Button>
      </form>
    </Modal>
  );
}
