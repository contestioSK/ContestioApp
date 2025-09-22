import { startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { DiaryCatch, DiaryTrip } from "@shared/schema";

export interface PeriodData {
  catches: number;
  trips: number;
  weight: number;
  successRate: number;
}

export interface PeriodComparison {
  current: PeriodData;
  previous: PeriodData;
  changes: {
    catches: { absolute: number; percentage: number; isPositive: boolean };
    trips: { absolute: number; percentage: number; isPositive: boolean };
    weight: { absolute: number; percentage: number; isPositive: boolean };
    successRate: { absolute: number; percentage: number; isPositive: boolean };
  };
}

/**
 * Generate months for the specified period
 */
export function getMonthsForPeriod(months: 3 | 6 | 12 | 24): Date[] {
  const endDate = new Date();
  const startDate = subMonths(endDate, months - 1);
  return eachMonthOfInterval({ start: startDate, end: endDate });
}

/**
 * Filter catches by month boundaries
 */
export function filterCatchesByMonths(catches: DiaryCatch[], months: Date[]): DiaryCatch[] {
  return catches.filter(catch_ => {
    const catchDate = new Date(catch_.capturedAt);
    return months.some(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      return catchDate >= monthStart && catchDate <= monthEnd;
    });
  });
}

/**
 * Filter trips by month boundaries using startDate
 */
export function filterTripsByMonths(trips: DiaryTrip[], months: Date[]): DiaryTrip[] {
  return trips.filter(trip => {
    const tripDate = new Date(trip.startDate);
    return months.some(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      return tripDate >= monthStart && tripDate <= monthEnd;
    });
  });
}

/**
 * Calculate aggregated stats for a given period
 */
export function calculatePeriodStats(catches: DiaryCatch[], trips: DiaryTrip[]): PeriodData {
  const catchCount = catches.length;
  const tripCount = trips.length;
  const totalWeight = catches.reduce((sum, catch_) => sum + parseFloat(catch_.weight), 0);
  const successRate = tripCount > 0 ? catchCount / tripCount : 0;

  return {
    catches: catchCount,
    trips: tripCount,
    weight: totalWeight,
    successRate: successRate
  };
}

/**
 * Calculate change and percentage between current and previous values
 */
export function calculateChange(current: number, previous: number): { absolute: number; percentage: number; isPositive: boolean } {
  const absolute = current - previous;
  const percentage = previous > 0 ? ((absolute / previous) * 100) : 0;
  const isPositive = absolute >= 0;

  return { absolute, percentage, isPositive };
}

/**
 * Get comprehensive period comparison data
 */
export function getPeriodComparison(
  catches: DiaryCatch[], 
  trips: DiaryTrip[], 
  months: 3 | 6 | 12 | 24
): PeriodComparison {
  // Get current period data
  const currentMonths = getMonthsForPeriod(months);
  const currentCatches = filterCatchesByMonths(catches, currentMonths);
  const currentTrips = filterTripsByMonths(trips, currentMonths);
  const current = calculatePeriodStats(currentCatches, currentTrips);

  // Get previous period data
  const previousMonths = currentMonths.map(month => subMonths(month, months));
  const previousCatches = filterCatchesByMonths(catches, previousMonths);
  const previousTrips = filterTripsByMonths(trips, previousMonths);
  const previous = calculatePeriodStats(previousCatches, previousTrips);

  // Calculate changes
  const changes = {
    catches: calculateChange(current.catches, previous.catches),
    trips: calculateChange(current.trips, previous.trips),
    weight: calculateChange(current.weight, previous.weight),
    successRate: calculateChange(current.successRate, previous.successRate)
  };

  return {
    current,
    previous,
    changes
  };
}

/**
 * Format trend indicator with color
 */
export function formatTrendIndicator(change: { absolute: number; percentage: number; isPositive: boolean }): {
  arrow: string;
  colorClass: string;
  text: string;
} {
  const arrow = change.isPositive ? "↗" : "↘";
  const colorClass = change.isPositive ? "text-green-600" : "text-red-600";
  const sign = change.isPositive ? "+" : "";
  
  return {
    arrow,
    colorClass,
    text: `${sign}${change.absolute}`
  };
}

/**
 * Format trend indicator for weight (with kg suffix)
 */
export function formatWeightTrendIndicator(change: { absolute: number; percentage: number; isPositive: boolean }): {
  arrow: string;
  colorClass: string;
  text: string;
} {
  const base = formatTrendIndicator(change);
  return {
    ...base,
    text: `${base.text.replace(change.absolute.toString(), change.absolute.toFixed(1))} kg`
  };
}

/**
 * Format trend indicator for success rate (with decimal precision)
 */
export function formatSuccessRateTrendIndicator(change: { absolute: number; percentage: number; isPositive: boolean }): {
  arrow: string;
  colorClass: string;
  text: string;
} {
  const base = formatTrendIndicator(change);
  return {
    ...base,
    text: base.text.replace(change.absolute.toString(), change.absolute.toFixed(1))
  };
}

/**
 * Get biggest catch from a list of catches
 */
export function getBiggestCatch(catches: DiaryCatch[]): number {
  return catches.length > 0 ? Math.max(...catches.map(c => parseFloat(c.weight))) : 0;
}

/**
 * Get best catch (heaviest) from a list of catches
 */
export function getBestCatch(catches: DiaryCatch[]): DiaryCatch | null {
  return catches.reduce((max, catch_) => {
    const weight = parseFloat(catch_.weight);
    return weight > parseFloat(max?.weight || '0') ? catch_ : max;
  }, catches[0] || null);
}