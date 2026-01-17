import { useState, useEffect } from 'react';

export const POLLING_INTERVALS = {
  NOTIFICATIONS: 30_000,
  REFEREE_LIVE: 5_000,
  COMPETITION_LIVE: 10_000,
  ORGANIZER: 60_000,
  NONE: false,
} as const;

export const STALE_TIMES = {
  REAL_TIME: 5_000,
  LIVE: 10_000,
  NORMAL: 30_000,
  STATIC: 5 * 60 * 1000,
} as const;

export function useVisibilityAwarePolling(interval: number | false): number | false {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!interval || !isVisible || !isOnline) {
    return false;
  }

  return interval;
}
