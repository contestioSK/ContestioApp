import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type TripLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

type CatchLimits = {
  canCreate: boolean;
  currentCount: number;
  limit: number;
};

type AuthInitResponse = {
  user: User;
  isPremium: boolean;
  tripLimits: TripLimits;
  catchLimits: CatchLimits;
};

export function useAuthInit() {
  const { data, isLoading, error } = useQuery<AuthInitResponse | null>({
    queryKey: ["/api/auth/init"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user: data?.user ?? null,
    isPremium: data?.isPremium ?? false,
    tripLimits: data?.tripLimits ?? null,
    catchLimits: data?.catchLimits ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
  };
}
