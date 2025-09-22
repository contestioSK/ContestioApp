// Types for competition statistics dashboard

export interface TimelineData {
  time: string;
  totalWeight: number;
  totalCount: number;
  dayIndex: number;
  date: string;
}

export interface WeightCategoryData {
  category: string;
  commonCarp: number;
  mirrorCarp: number;
  total: number;
}

export interface TopFishData {
  teamName: string;
  weight: number;
  fishType: 'Common Carp' | 'Mirror Carp';
  catchTime: string;
}

export interface TeamTopAverageData {
  teamName: string;
  averageWeight: number;
  fishCount: number; // actual number of fish used for average (may be less than 3/5 for teams with fewer catches)
  maxFish: number; // 3 or 5 depending on competition type
}

export interface TeamPerformanceData {
  teamName: string;
  totalCount: number;
  totalWeight: number;
}

export interface FishTypeData {
  type: 'Common Carp' | 'Mirror Carp';
  weight: number;
  count: number;
  percentage: number;
}

export interface SectorData {
  sector: string;
  totalWeight: number;
  totalCount: number;
  averageWeight: number;
}

export interface AverageWeightData {
  teamName: string;
  top3Average: number;
  top5Average: number;
}

export interface SpecialMilestoneData {
  time: string;
  teamName: string;
  milestone: string;
  weight: number;
  hour: number;
}

export interface DailyBigFishData {
  day: string;
  teamName: string;
  weight: number;
  fishType: 'Common Carp' | 'Mirror Carp';
}

export interface RecordProgressionData {
  time: string;
  bigFishOverall: number;
  bigCommonCarp: number;
  bigMirrorCarp: number;
  hour: number;
}

export interface WeightMilestoneData {
  teamName: string;
  first15kg: string | null;
  first20kg: string | null;
  first25kg: string | null;
}

export interface SpecialCompetitionStatus {
  id: string;
  name: string;
  currentLeader: string;
  value: number;
  unit: string;
  icon: string;
}

export interface TeamEfficiencyData {
  teamName: string;
  timeSpentHours: number;
  totalCatches: number;
  totalWeight: number;
  efficiency: number;
}

export interface SectorTimelineData {
  time: string;
  totalWeight: number;
  totalCount: number;
  dayIndex: number;
  date: string;
  sector: string;
}

export interface SectorFishTypeData {
  sector: string;
  scaly: number;
  mirror: number;
  scalyWeight: number;
  mirrorWeight: number;
}

export interface CompetitionStats {
  timeline: TimelineData[];
  weightCategories: WeightCategoryData[];
  topFish: TopFishData[];
  teamPerformance: TeamPerformanceData[];
  fishTypeDistribution: FishTypeData[];
  sectorPerformance: SectorData[];
  averageWeights: AverageWeightData[];
  teamTop3Average: TeamTopAverageData[];
  teamTop5Average: TeamTopAverageData[];
  // New sector data
  sectorTimeline: Record<string, SectorTimelineData[]>;
  sectorFishTypes: SectorFishTypeData[];
  specialMilestones: SpecialMilestoneData[];
  dailyBigFish: DailyBigFishData[];
  recordProgression: RecordProgressionData[];
  weightMilestones: WeightMilestoneData[];
  specialCompetitions: SpecialCompetitionStatus[];
  teamEfficiency: TeamEfficiencyData[];
}