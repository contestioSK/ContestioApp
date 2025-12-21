import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

type ClosingTimeResult = {
  closingTime: string | null;
  closingHour: number | null;
  closingMinute: number;
  isNonStop: boolean;
};

function getClosingTime(): ClosingTimeResult {
  const month = new Date().getMonth();
  
  // January (0), February (1), November (10), December (11) -> 21:00
  if ([0, 1, 10, 11].includes(month)) {
    return { closingTime: '21:00', closingHour: 21, closingMinute: 0, isNonStop: false };
  }
  
  // March (2), April (3), September (8), October (9) -> 00:00 (midnight)
  if ([2, 3, 8, 9].includes(month)) {
    return { closingTime: '00:00', closingHour: 24, closingMinute: 0, isNonStop: false };
  }
  
  // May (4), June (5), July (6), August (7) -> Non-stop
  return { closingTime: null, closingHour: null, closingMinute: 0, isNonStop: true };
}

function isWithin30MinutesOfClosing(closingHour: number): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const closingTotalMinutes = closingHour * 60;
  const alertTotalMinutes = closingTotalMinutes - 30;
  
  // Check if current time is exactly at or within the 30-minute window
  // Alert window: from (closingTime - 30min) to closingTime
  return currentTotalMinutes >= alertTotalMinutes && currentTotalMinutes < closingTotalMinutes;
}

export function useFishingTimeGuard() {
  const { toast } = useToast();
  const hasNotifiedRef = useRef(false);
  const lastNotificationDateRef = useRef<string | null>(null);

  useEffect(() => {
    function checkFishingTime() {
      const { closingTime, closingHour, isNonStop } = getClosingTime();
      
      // No alert needed for non-stop fishing months
      if (isNonStop || closingHour === null || closingTime === null) {
        return;
      }

      // Check if we should show notification
      const today = new Date().toDateString();
      const shouldNotify = isWithin30MinutesOfClosing(closingHour);
      
      // Reset notification flag if it's a new day
      if (lastNotificationDateRef.current !== today) {
        hasNotifiedRef.current = false;
        lastNotificationDateRef.current = today;
      }

      // Show notification only once per day
      if (shouldNotify && !hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        
        toast({
          title: "🎣 Pozor na čas lovu!",
          description: `Je to škoda, ale o ${closingTime} končí doba lovu. Nezabudni vytiahnuť udice!`,
          variant: "default",
          duration: 20000,
          className: "bg-amber-100 dark:bg-amber-900/80 border-l-4 border-amber-500 text-amber-800 dark:text-amber-100",
        });
      }
    }

    // Run immediately on mount
    checkFishingTime();

    // Then check every minute
    const interval = setInterval(checkFishingTime, 60000);

    return () => clearInterval(interval);
  }, [toast]);

  // Return current closing time info for potential UI display
  return getClosingTime();
}
