// Design Ref: §2.3.1 F-SPEAK-03 — 탭투스픽 마이크 버튼 + 파형 시각화
'use client';

interface MicButtonProps {
  readonly isListening: boolean;
  readonly onPress: () => void;
  readonly onRelease: () => void;
  readonly disabled?: boolean;
  readonly transcript?: string;
}

export function MicButton({ isListening, onPress, onRelease, disabled, transcript }: MicButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* 실시간 텍스트 미리보기 */}
      {transcript && (
        <div className="px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-600 max-w-xs text-center">
          {transcript}
        </div>
      )}

      {/* 마이크 버튼 */}
      <button
        onMouseDown={onPress}
        onMouseUp={onRelease}
        onTouchStart={onPress}
        onTouchEnd={onRelease}
        disabled={disabled}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-200 select-none
          ${isListening
            ? 'bg-red-500 scale-110 shadow-lg shadow-red-200 animate-pulse'
            : disabled
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md'}
        `}
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </button>

      {/* 안내 텍스트 */}
      <p className="text-xs text-gray-400">
        {isListening ? '말하는 중...' : '꾹 눌러서 말하기'}
      </p>

      {/* 파형 시각화 (녹음 중) */}
      {isListening && (
        <div className="flex items-center gap-1 h-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="w-1 bg-red-400 rounded-full animate-pulse"
              style={{
                height: `${12 + Math.random() * 16}px`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
