// Design Ref: §6.2 — LocalStorage 래퍼 (오프라인 캐시)
// Hydration-safe: 서버에서는 항상 initialValue, 클라이언트 마운트 후 localStorage 로드
'use client';

import { useState, useCallback, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // 클라이언트 마운트 후 localStorage에서 값 로드
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch {
      // localStorage 접근 실패 시 initialValue 유지
    }
    setIsHydrated(true);
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue(prev => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // 저장 실패 무시
        }
        return nextValue;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 삭제 실패 무시
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue, isHydrated] as const;
}
