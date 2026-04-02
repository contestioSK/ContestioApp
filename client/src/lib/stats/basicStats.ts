import type { DiaryTrip, DiaryCatch } from "@shared/schema";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { sk } from "date-fns/locale";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";
import { getMonthsForPeriod, filterCatchesByMonths, filterTripsByMonths } from "@/lib/periodComparison";

export type BasicStatsResult = {
  totalCatches: number;
  totalWeight: number;
  averageWeight: number;
  biggestCatch: number;
  totalTrips: number;
  activeTripCount: number;
  successRate: number;
};

export type MonthlyStats = {
  month: string;
  monthDate: string;
  monthStart: string;
  monthEnd: string;
  catches: number;
  totalWeight: number;
  trips: number;
};

export type FishTypeStats = {
  type: string;
  count: number;
  totalWeight: number;
  label: string;
};

export type WeightRange = {
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
};

export type BaitStats = {
  bait: string;
  count: number;
  totalWeight: number;
  averageWeight: number;
};

export type LocationStats = {
  location: string;
  count: number;
};

export function calculateBasicStats(
  catches: DiaryCatch[],
  trips: DiaryTrip[]
): BasicStatsResult {
  const totalCatches = catches.length;
  const totalWeight = catches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
  const averageWeight = totalCatches > 0 ? totalWeight / totalCatches : 0;
  const biggestCatch = totalCatches > 0 
    ? Math.max(...catches.map(c => parseFloat(c.weight))) 
    : 0;
  const totalTrips = trips.length;
  const activeTripCount = trips.filter(t => {
    const end = new Date(t.endDate);
    end.setHours(23, 59, 59, 999);
    return end >= new Date();
  }).length;
  const successRate = totalTrips > 0 ? totalCatches / totalTrips : 0;

  return {
    totalCatches,
    totalWeight,
    averageWeight,
    biggestCatch,
    totalTrips,
    activeTripCount,
    successRate
  };
}

export function calculateMonthlyStats(
  catches: DiaryCatch[],
  trips: DiaryTrip[],
  periodMonths: 3 | 6 | 12 | 24
): MonthlyStats[] {
  return getMonthsForPeriod(periodMonths).map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthCatches = filterCatchesByMonths(catches, [month]);
    const monthTrips = filterTripsByMonths(trips, [month]);

    return {
      month: format(month, "MMM yyyy", { locale: sk }),
      monthDate: month.toISOString(),
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      catches: monthCatches.length,
      totalWeight: monthCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0),
      trips: monthTrips.length
    };
  });
}

export function calculateFishTypeStats(catches: DiaryCatch[]): FishTypeStats[] {
  const fishTypeCounts = catches.reduce((acc, c) => {
    const fishType = c.fishType;
    if (!acc[fishType]) {
      acc[fishType] = { count: 0, totalWeight: 0 };
    }
    acc[fishType].count++;
    acc[fishType].totalWeight += parseFloat(c.weight);
    return acc;
  }, {} as Record<string, { count: number; totalWeight: number }>);

  return Object.entries(fishTypeCounts)
    .map(([type, stats]) => ({
      type,
      label: getFishTypeLabel(type),
      count: stats.count,
      totalWeight: stats.totalWeight
    }))
    .sort((a, b) => b.count - a.count);
}

export function calculateWeightDistribution(catches: DiaryCatch[]): WeightRange[] {
  const ranges = [
    { label: 'do 2 kg', min: 0, max: 2 },
    { label: '2-5 kg', min: 2, max: 5 },
    { label: '5-7 kg', min: 5, max: 7 },
    { label: '7-9 kg', min: 7, max: 9 },
    { label: '9-10 kg', min: 9, max: 10 },
    { label: '10-12 kg', min: 10, max: 12 },
    { label: '12-15 kg', min: 12, max: 15 },
    { label: '15-18 kg', min: 15, max: 18 },
    { label: '18-20 kg', min: 18, max: 20 },
    { label: '20-25 kg', min: 20, max: 25 },
    { label: '25+ kg', min: 25, max: Infinity }
  ];

  return ranges.map(range => {
    const count = catches.filter(c => {
      const weight = parseFloat(c.weight);
      return weight >= range.min && weight < range.max;
    }).length;
    const percentage = catches.length > 0 ? (count / catches.length) * 100 : 0;
    return { ...range, count, percentage };
  }).filter(r => r.count > 0);
}

export function calculateTopBaits(catches: DiaryCatch[]): BaitStats[] {
  const baitCounts = catches.reduce((acc, c) => {
    const bait = c.bait?.trim();
    if (!bait) return acc;
    if (!acc[bait]) {
      acc[bait] = { count: 0, totalWeight: 0 };
    }
    acc[bait].count++;
    acc[bait].totalWeight += parseFloat(c.weight);
    return acc;
  }, {} as Record<string, { count: number; totalWeight: number }>);

  return Object.entries(baitCounts)
    .map(([bait, stats]) => ({
      bait,
      count: stats.count,
      totalWeight: stats.totalWeight,
      averageWeight: stats.count > 0 ? stats.totalWeight / stats.count : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function calculateTopLocations(
  trips: DiaryTrip[],
  catches: DiaryCatch[]
): LocationStats[] {
  const locationStats = trips.reduce((acc, trip) => {
    const tripCatches = catches.filter(c => c.tripId === trip.id);
    acc[trip.location] = (acc[trip.location] || 0) + tripCatches.length;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(locationStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([location, count]) => ({ location, count }));
}
