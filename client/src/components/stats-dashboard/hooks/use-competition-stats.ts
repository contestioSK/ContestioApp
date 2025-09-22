import { useQuery } from '@tanstack/react-query';
import type { CompetitionStats } from '../types';
import { mockCompetitionStats } from '../mock-data';

// API hook for fetching competition statistics
export function useCompetitionStats(competitionId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['competition-stats', competitionId],
    queryFn: async (): Promise<CompetitionStats> => {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/competitions/${competitionId}/stats`);
      // if (!response.ok) throw new Error('Failed to fetch competition stats');
      // return response.json();
      
      // For now, return mock data
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockCompetitionStats), 500);
      });
    },
    enabled: enabled && !!competitionId,
    refetchInterval: enabled ? 30000 : false, // Only refresh when enabled
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}