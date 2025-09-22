import { useQuery } from '@tanstack/react-query';
import type { CompetitionStats } from '../types';

// API hook for fetching competition statistics
export function useCompetitionStats(competitionId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['competition-stats', competitionId],
    queryFn: async (): Promise<CompetitionStats> => {
      const response = await fetch(`/api/competitions/${competitionId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch competition stats');
      const data = await response.json();
      
      // Runtime validation and normalization
      const timeline = data.timeline?.map((item: any) => ({
        ...item,
        dayIndex: item.dayIndex ?? Math.floor((item.hour ?? 0) / 24),
        date: item.date ?? item.time?.split('T')[0] ?? new Date().toISOString().split('T')[0]
      })) ?? [];
      
      // Ensure fish type distribution has valid types
      const fishTypeDistribution = data.fishTypeDistribution?.filter((item: any) => 
        item.type === 'Common Carp' || item.type === 'Mirror Carp'
      ) ?? [];
      
      if (data.timeline && data.timeline.length !== timeline.length) {
        console.warn('Timeline data was filtered/normalized', { original: data.timeline.length, normalized: timeline.length });
      }
      
      return {
        ...data,
        timeline,
        fishTypeDistribution
      };
    },
    enabled: enabled && !!competitionId,
    refetchInterval: enabled ? 30000 : false, // Only refresh when enabled
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}