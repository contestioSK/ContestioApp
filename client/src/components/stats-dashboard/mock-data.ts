import type { CompetitionStats } from './types';

export const mockCompetitionStats: CompetitionStats = {
  timeline: [
    { time: '2025-09-25T06:00:00Z', totalWeight: 0, totalCount: 0, hour: 6 },
    { time: '2025-09-25T08:00:00Z', totalWeight: 45.5, totalCount: 3, hour: 8 },
    { time: '2025-09-25T10:00:00Z', totalWeight: 128.2, totalCount: 8, hour: 10 },
    { time: '2025-09-25T12:00:00Z', totalWeight: 234.7, totalCount: 15, hour: 12 },
    { time: '2025-09-25T14:00:00Z', totalWeight: 356.3, totalCount: 22, hour: 14 },
    { time: '2025-09-25T16:00:00Z', totalWeight: 489.1, totalCount: 31, hour: 16 },
    { time: '2025-09-25T18:00:00Z', totalWeight: 612.8, totalCount: 38, hour: 18 },
    { time: '2025-09-25T20:00:00Z', totalWeight: 723.5, totalCount: 45, hour: 20 },
    { time: '2025-09-25T22:00:00Z', totalWeight: 821.2, totalCount: 52, hour: 22 },
    { time: '2025-09-26T00:00:00Z', totalWeight: 891.7, totalCount: 57, hour: 24 },
  ],

  weightCategories: [
    { category: '15-20 kg', commonCarp: 12, mirrorCarp: 8, total: 20 },
    { category: '20-25 kg', commonCarp: 15, mirrorCarp: 12, total: 27 },
    { category: '25-30 kg', commonCarp: 8, mirrorCarp: 6, total: 14 },
    { category: '30+ kg', commonCarp: 3, mirrorCarp: 4, total: 7 },
  ],

  topFish: [
    { teamName: 'Team Legends', weight: 34.2, fishType: 'Mirror Carp', catchTime: '2025-09-25T14:30:00Z' },
    { teamName: 'Carp Masters', weight: 32.8, fishType: 'Common Carp', catchTime: '2025-09-25T16:45:00Z' },
    { teamName: 'River Kings', weight: 31.5, fishType: 'Mirror Carp', catchTime: '2025-09-25T11:20:00Z' },
    { teamName: 'Fish Hunters', weight: 30.2, fishType: 'Common Carp', catchTime: '2025-09-25T19:10:00Z' },
    { teamName: 'Anglers Elite', weight: 29.7, fishType: 'Mirror Carp', catchTime: '2025-09-25T13:55:00Z' },
  ],

  teamPerformance: [
    { teamName: 'Team Legends', totalCount: 8, totalWeight: 167.3 },
    { teamName: 'Carp Masters', totalCount: 12, totalWeight: 198.7 },
    { teamName: 'River Kings', totalCount: 6, totalWeight: 143.2 },
    { teamName: 'Fish Hunters', totalCount: 10, totalWeight: 176.5 },
    { teamName: 'Anglers Elite', totalCount: 7, totalWeight: 134.8 },
    { teamName: 'Pro Fishers', totalCount: 9, totalWeight: 162.1 },
  ],

  fishTypeDistribution: [
    { type: 'Common Carp', weight: 423.6, count: 32, percentage: 58.3 },
    { type: 'Mirror Carp', weight: 302.8, count: 25, percentage: 41.7 },
  ],

  sectorPerformance: [
    { sector: 'Sektor A', totalWeight: 156.7, totalCount: 12, averageWeight: 13.1 },
    { sector: 'Sektor B', totalWeight: 189.3, totalCount: 15, averageWeight: 12.6 },
    { sector: 'Sektor C', totalWeight: 143.2, totalCount: 11, averageWeight: 13.0 },
    { sector: 'Sektor D', totalWeight: 178.5, totalCount: 13, averageWeight: 13.7 },
    { sector: 'Sektor E', totalWeight: 158.7, totalCount: 12, averageWeight: 13.2 },
  ],

  averageWeights: [
    { teamName: 'Team Legends', top3Average: 28.7, top5Average: 25.3 },
    { teamName: 'Carp Masters', top3Average: 26.2, top5Average: 23.8 },
    { teamName: 'River Kings', top3Average: 27.1, top5Average: 24.2 },
    { teamName: 'Fish Hunters', top3Average: 25.8, top5Average: 22.9 },
    { teamName: 'Anglers Elite', top3Average: 24.3, top5Average: 21.7 },
    { teamName: 'Pro Fishers', top3Average: 23.9, top5Average: 21.2 },
  ],

  specialMilestones: [
    { time: '2025-09-25T08:15:00Z', teamName: 'River Kings', milestone: 'Prvá ryba nad 15 kg', weight: 16.2, hour: 8.25 },
    { time: '2025-09-25T11:30:00Z', teamName: 'Team Legends', milestone: 'Prvá ryba nad 20 kg', weight: 22.1, hour: 11.5 },
    { time: '2025-09-25T14:45:00Z', teamName: 'Carp Masters', milestone: 'Prvá ryba nad 25 kg', weight: 27.3, hour: 14.75 },
    { time: '2025-09-25T07:20:00Z', teamName: 'Fish Hunters', milestone: 'Prvá ryba súťaže', weight: 12.5, hour: 7.33 },
  ],

  dailyBigFish: [
    { day: '2025-09-25', teamName: 'Team Legends', weight: 34.2, fishType: 'Mirror Carp' },
    { day: '2025-09-26', teamName: 'Carp Masters', weight: 31.8, fishType: 'Common Carp' },
    { day: '2025-09-27', teamName: 'River Kings', weight: 29.5, fishType: 'Mirror Carp' },
  ],

  recordProgression: [
    { time: '2025-09-25T08:15:00Z', bigFishOverall: 16.2, bigCommonCarp: 15.1, bigMirrorCarp: 16.2, hour: 8.25 },
    { time: '2025-09-25T10:30:00Z', bigFishOverall: 19.8, bigCommonCarp: 18.3, bigMirrorCarp: 19.8, hour: 10.5 },
    { time: '2025-09-25T12:45:00Z', bigFishOverall: 24.1, bigCommonCarp: 22.7, bigMirrorCarp: 24.1, hour: 12.75 },
    { time: '2025-09-25T15:20:00Z', bigFishOverall: 28.5, bigCommonCarp: 26.2, bigMirrorCarp: 28.5, hour: 15.33 },
    { time: '2025-09-25T18:10:00Z', bigFishOverall: 32.8, bigCommonCarp: 32.8, bigMirrorCarp: 31.4, hour: 18.17 },
    { time: '2025-09-25T20:45:00Z', bigFishOverall: 34.2, bigCommonCarp: 32.8, bigMirrorCarp: 34.2, hour: 20.75 },
  ],

  weightMilestones: [
    { teamName: 'Team Legends', first15kg: '2025-09-25T08:30:00Z', first20kg: '2025-09-25T11:45:00Z', first25kg: '2025-09-25T15:20:00Z' },
    { teamName: 'Carp Masters', first15kg: '2025-09-25T09:15:00Z', first20kg: '2025-09-25T12:30:00Z', first25kg: '2025-09-25T16:10:00Z' },
    { teamName: 'River Kings', first15kg: '2025-09-25T08:15:00Z', first20kg: '2025-09-25T13:20:00Z', first25kg: null },
    { teamName: 'Fish Hunters', first15kg: '2025-09-25T10:45:00Z', first20kg: '2025-09-25T14:15:00Z', first25kg: null },
    { teamName: 'Anglers Elite', first15kg: '2025-09-25T11:30:00Z', first20kg: null, first25kg: null },
    { teamName: 'Pro Fishers', first15kg: '2025-09-25T12:15:00Z', first20kg: null, first25kg: null },
  ],

  specialCompetitions: [
    { id: 'big-fish-overall', name: 'Najväčší úlovok', currentLeader: 'Team Legends', value: 34.2, unit: 'kg', icon: '🏆' },
    { id: 'big-common-carp', name: 'Najväčší šupináč', currentLeader: 'Carp Masters', value: 32.8, unit: 'kg', icon: '🐟' },
    { id: 'big-mirror-carp', name: 'Najväčší lysec', currentLeader: 'Team Legends', value: 34.2, unit: 'kg', icon: '🐠' },
    { id: 'most-fish-caught', name: 'Najviac rýb', currentLeader: 'Carp Masters', value: 12, unit: 'ks', icon: '🎣' },
    { id: 'best-5-fish', name: 'Top 5 priemer', currentLeader: 'Team Legends', value: 25.3, unit: 'kg', icon: '📊' },
    { id: 'best-3-fish', name: 'Top 3 priemer', currentLeader: 'Team Legends', value: 28.7, unit: 'kg', icon: '🥇' },
  ],

  teamEfficiency: [
    { teamName: 'Team Legends', timeSpentHours: 18, totalCatches: 8, totalWeight: 167.3, efficiency: 9.3 },
    { teamName: 'Carp Masters', timeSpentHours: 20, totalCatches: 12, totalWeight: 198.7, efficiency: 9.9 },
    { teamName: 'River Kings', timeSpentHours: 16, totalCatches: 6, totalWeight: 143.2, efficiency: 8.9 },
    { teamName: 'Fish Hunters', timeSpentHours: 19, totalCatches: 10, totalWeight: 176.5, efficiency: 9.3 },
    { teamName: 'Anglers Elite', timeSpentHours: 15, totalCatches: 7, totalWeight: 134.8, efficiency: 9.0 },
    { teamName: 'Pro Fishers', timeSpentHours: 17, totalCatches: 9, totalWeight: 162.1, efficiency: 9.5 },
  ],
};