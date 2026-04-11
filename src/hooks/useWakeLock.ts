/**
 * 화면 꺼짐 방지 훅 — Screen Wake Lock API + NoSleep.js 폴백
 */
import { useEffect, useRef } from 'react';
import NoSleep from 'nosleep.js';
import { useAppStore } from '@/stores/useAppStore';

export function useWakeLock() {
  const wakeLockEnabled = useAppStore((s) => s.settings.wakeLock);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const noSleepRef = useRef<NoSleep | null>(null);

  useEffect(() => {
    if (!wakeLockEnabled) {
      // 해제
      sentinelRef.current?.release();
      sentinelRef.current = null;
      noSleepRef.current?.disable();
      return;
    }

    const requestWakeLock = async () => {
      // 페이지가 보이지 않으면 요청하지 않음
      if (document.visibilityState !== 'visible') return;
      try {
        if ('wakeLock' in navigator) {
          sentinelRef.current = await navigator.wakeLock.request('screen');
          sentinelRef.current.addEventListener('release', () => {
            sentinelRef.current = null;
          });
        } else {
          // 미지원 브라우저: NoSleep.js 폴백
          if (!noSleepRef.current) noSleepRef.current = new NoSleep();
          noSleepRef.current.enable();
        }
      } catch {
        // Wake Lock 실패 시 NoSleep 폴백
        if (!noSleepRef.current) noSleepRef.current = new NoSleep();
        noSleepRef.current.enable();
      }
    };

    requestWakeLock();

    // 탭 전환 후 복귀 시 재요청
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && wakeLockEnabled) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinelRef.current?.release();
      noSleepRef.current?.disable();
    };
  }, [wakeLockEnabled]);
}
