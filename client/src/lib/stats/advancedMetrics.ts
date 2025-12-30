import type { DiaryTrip, DiaryCatch } from "@shared/schema";
import { filterCatchesByMonths, getBestCatch, getBiggestCatch } from "@/lib/periodComparison";
import type { MonthlyStats } from "./basicStats";

export type SeasonalData = {
  season: string;
  label: string;
  catches: number;
  averageWeight: number;
  trips: number;
  efficiency: number;
};

export type HourlyData = {
  hour: number;
  hourLabel: string;
  count: number;
  totalWeight: number;
};

export type WeightProgressionData = {
  date: string;
  dateLabel: string;
  averageWeight: number;
  totalWeight: number;
  catchCount: number;
  biggestCatch: number;
};

export type CatchFrequencyData = {
  date: string;
  dateLabel: string;
  catches: number;
  trips: number;
  efficiency: number;
};

export type MonthComparisonData = {
  month: string;
  catches: number;
  totalWeight: number;
  trips: number;
  averageWeight: number;
  efficiency: number;
};

export type AdvancedSuccessRate = {
  overallRate: number;
  hourlyRates: Array<{
    hour: number;
    catches: number;
    trips: number;
    rate: number;
  }>;
  weeklyRates: Array<{
    day: string;
    catches: number;
    trips: number;
    rate: number;
  }>;
  monthlyEfficiency: Array<{
    month: string;
    efficiency: number;
    catches: number;
    trips: number;
  }>;
  bestHour: { hour: number; rate: number } | null;
  bestDay: { day: string; rate: number } | null;
};

export type CatchQualityScores = {
  weightPercentiles: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  qualityDistribution: Array<{
    quality: string;
    label: string;
    count: number;
    color: string;
  }>;
  catchesWithScores: Array<DiaryCatch & {
    weightScore: number;
    lengthBonus: number;
    typeBonus: number;
    qualityScore: number;
  }>;
};

export type LocationPerformance = {
  locationStats: Array<{
    location: string;
    catches: number;
    trips: number;
    totalWeight: number;
    averageWeight: number;
    biggestCatch: number;
    successRate: number;
    quality: number;
  }>;
  gpsHotspots: Array<DiaryCatch & { coordinates: [number, number] }>;
  bestLocation: string | null;
};

export type PersonalRecords = {
  heaviestCatch: DiaryCatch | null;
  longestCatch: DiaryCatch | null;
  bestTrip: (DiaryTrip & { catchCount: number; totalWeight: number; averageWeight: number }) | null;
  streaks: {
    current: number;
    longest: number;
  };
  monthlyRecords: Array<{
    month: string;
    bestCatch: DiaryCatch | null;
    totalCatches: number;
    totalWeight: number;
  }>;
};

export function calculateSeasonalData(
  catches: DiaryCatch[],
  trips: DiaryTrip[]
): SeasonalData[] {
  const data: SeasonalData[] = [
    { season: 'spring', label: 'Jar', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
    { season: 'summer', label: 'Leto', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
    { season: 'autumn', label: 'Jeseň', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 },
    { season: 'winter', label: 'Zima', catches: 0, averageWeight: 0, trips: 0, efficiency: 0 }
  ];

  catches.forEach(c => {
    const month = new Date(c.capturedAt).getMonth();
    let seasonIndex: number;
    if (month >= 2 && month <= 4) seasonIndex = 0;
    else if (month >= 5 && month <= 7) seasonIndex = 1;
    else if (month >= 8 && month <= 10) seasonIndex = 2;
    else seasonIndex = 3;
    data[seasonIndex].catches++;
    data[seasonIndex].averageWeight += parseFloat(c.weight);
  });

  trips.forEach(trip => {
    const month = new Date(trip.startDate).getMonth();
    let seasonIndex: number;
    if (month >= 2 && month <= 4) seasonIndex = 0;
    else if (month >= 5 && month <= 7) seasonIndex = 1;
    else if (month >= 8 && month <= 10) seasonIndex = 2;
    else seasonIndex = 3;
    data[seasonIndex].trips++;
  });

  data.forEach(season => {
    if (season.catches > 0) season.averageWeight = season.averageWeight / season.catches;
    if (season.trips > 0) season.efficiency = season.catches / season.trips;
  });

  return data;
}

export function calculateHourlyDistribution(catches: DiaryCatch[]): HourlyData[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const hourCatches = catches.filter(c => new Date(c.capturedAt).getHours() === hour);
    const totalWeight = hourCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
    return {
      hour,
      hourLabel: String(hour).padStart(2, '0') + ':00',
      count: hourCatches.length,
      totalWeight: parseFloat(totalWeight.toFixed(2))
    };
  });
}

export function calculateWeightProgression(
  monthlyStats: MonthlyStats[],
  catches: DiaryCatch[]
): WeightProgressionData[] {
  return monthlyStats.map(month => {
    const monthCatches = filterCatchesByMonths(catches, [new Date(month.monthDate)]);
    return {
      date: month.monthDate,
      dateLabel: month.month,
      averageWeight: month.catches > 0 ? month.totalWeight / month.catches : 0,
      totalWeight: month.totalWeight,
      catchCount: month.catches,
      biggestCatch: getBiggestCatch(monthCatches)
    };
  });
}

export function calculateCatchFrequency(monthlyStats: MonthlyStats[]): CatchFrequencyData[] {
  return monthlyStats.map(month => ({
    date: month.monthDate,
    dateLabel: month.month,
    catches: month.catches,
    trips: month.trips,
    efficiency: month.trips > 0 ? month.catches / month.trips : 0
  }));
}

export function calculateMonthComparison(monthlyStats: MonthlyStats[]): MonthComparisonData[] {
  return monthlyStats.map(month => ({
    month: month.month,
    catches: month.catches,
    totalWeight: month.totalWeight,
    trips: month.trips,
    averageWeight: month.catches > 0 ? month.totalWeight / month.catches : 0,
    efficiency: month.trips > 0 ? month.catches / month.trips : 0
  }));
}

export function calculateAdvancedSuccessRate(
  catches: DiaryCatch[],
  trips: DiaryTrip[],
  monthlyStats: MonthlyStats[]
): AdvancedSuccessRate {
  const totalCatches = catches.length;
  const totalTrips = trips.length;

  const hourlyRates = Array.from({ length: 24 }, (_, hour) => {
    const hourCatches = catches.filter(c => new Date(c.capturedAt).getHours() === hour);
    const hourTrips = trips.filter(t => {
      const startHour = new Date(t.startDate).getHours();
      const endHour = new Date(t.endDate).getHours();
      return startHour <= hour && hour <= endHour;
    });
    return {
      hour,
      catches: hourCatches.length,
      trips: hourTrips.length,
      rate: hourTrips.length > 0 ? hourCatches.length / hourTrips.length : 0
    };
  });

  const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
  const weeklyRates = Array.from({ length: 7 }, (_, day) => {
    const dayCatches = catches.filter(c => new Date(c.capturedAt).getDay() === day);
    const dayTrips = trips.filter(t => new Date(t.startDate).getDay() === day);
    return {
      day: dayNames[day],
      catches: dayCatches.length,
      trips: dayTrips.length,
      rate: dayTrips.length > 0 ? dayCatches.length / dayTrips.length : 0
    };
  });

  const monthlyEfficiency = monthlyStats.map(month => ({
    month: month.month,
    efficiency: month.trips > 0 ? month.catches / month.trips : 0,
    catches: month.catches,
    trips: month.trips
  }));

  const bestHourData = hourlyRates.filter(h => h.trips > 0).sort((a, b) => b.rate - a.rate)[0];
  const bestDayData = weeklyRates.filter(d => d.trips > 0).sort((a, b) => b.rate - a.rate)[0];

  return {
    overallRate: totalTrips > 0 ? totalCatches / totalTrips : 0,
    hourlyRates,
    weeklyRates,
    monthlyEfficiency,
    bestHour: bestHourData ? { hour: bestHourData.hour, rate: bestHourData.rate } : null,
    bestDay: bestDayData ? { day: bestDayData.day, rate: bestDayData.rate } : null
  };
}

export function calculateCatchQualityScores(catches: DiaryCatch[]): CatchQualityScores {
  const weights = catches.map(c => parseFloat(c.weight)).sort((a, b) => a - b);
  const maxWeight = Math.max(...catches.map(c => parseFloat(c.weight)), 0);

  const weightPercentiles = (() => {
    if (weights.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 };
    const percentile = (p: number) => {
      const index = Math.ceil(weights.length * p / 100) - 1;
      return weights[Math.max(0, index)] || 0;
    };
    return { 
      p25: percentile(25), 
      p50: percentile(50), 
      p75: percentile(75), 
      p90: percentile(90), 
      p95: percentile(95) 
    };
  })();

  const distribution = { poor: 0, average: 0, good: 0, excellent: 0 };
  weights.forEach(weight => {
    const score = maxWeight > 0 ? weight / maxWeight : 0;
    if (score >= 0.8) distribution.excellent++;
    else if (score >= 0.6) distribution.good++;
    else if (score >= 0.4) distribution.average++;
    else distribution.poor++;
  });

  const qualityDistribution = [
    { quality: 'Slabé', label: 'Slabé (< 40%)', count: distribution.poor, color: 'hsl(var(--destructive))' },
    { quality: 'Priemerné', label: 'Priemerné (40-60%)', count: distribution.average, color: 'hsl(var(--accent))' },
    { quality: 'Dobré', label: 'Dobré (60-80%)', count: distribution.good, color: 'hsl(var(--chart-2))' },
    { quality: 'Výborné', label: 'Výborné (80%+)', count: distribution.excellent, color: 'hsl(var(--primary))' }
  ];

  const catchesWithScores = catches.map(c => {
    const weight = parseFloat(c.weight);
    const weightScore = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
    const lengthBonus = c.lengthCm ? Math.min(20, c.lengthCm / 5) : 0;
    const typeBonus = c.fishType === 'sumec' ? 15 : 
                      c.fishType === 'stuka' ? 12 : 
                      c.fishType === 'amur' ? 10 : 
                      c.fishType === 'kapor_lysec' ? 8 : 5;
    const totalScore = Math.min(100, weightScore + lengthBonus + typeBonus);
    return { 
      ...c, 
      weightScore: Math.round(weightScore), 
      lengthBonus: Math.round(lengthBonus), 
      typeBonus, 
      qualityScore: Math.round(totalScore) 
    };
  }).sort((a, b) => b.qualityScore - a.qualityScore);

  return { weightPercentiles, qualityDistribution, catchesWithScores };
}

export function calculateLocationPerformance(
  trips: DiaryTrip[],
  catches: DiaryCatch[],
  catchQualityScores: CatchQualityScores
): LocationPerformance {
  const stats: Record<string, {
    location: string;
    catches: number;
    trips: number;
    totalWeight: number;
    averageWeight: number;
    biggestCatch: number;
    successRate: number;
    quality: number;
  }> = {};

  trips.forEach(trip => {
    const tripCatches = catches.filter(c => c.tripId === trip.id);
    const weights = tripCatches.map(c => parseFloat(c.weight));
    const avgQuality = catchQualityScores.catchesWithScores
      .filter(c => c.tripId === trip.id)
      .reduce((sum, c) => sum + c.qualityScore, 0) / Math.max(1, tripCatches.length);

    if (!stats[trip.location]) {
      stats[trip.location] = {
        location: trip.location,
        catches: 0,
        trips: 0,
        totalWeight: 0,
        averageWeight: 0,
        biggestCatch: 0,
        successRate: 0,
        quality: 0
      };
    }

    const stat = stats[trip.location];
    stat.trips++;
    stat.catches += tripCatches.length;
    stat.totalWeight += weights.reduce((sum, w) => sum + w, 0);
    stat.biggestCatch = Math.max(stat.biggestCatch, ...weights, 0);
    stat.quality = (stat.quality * (stat.trips - 1) + avgQuality) / stat.trips;
  });

  Object.values(stats).forEach(stat => {
    stat.averageWeight = stat.catches > 0 ? stat.totalWeight / stat.catches : 0;
    stat.successRate = stat.trips > 0 ? stat.catches / stat.trips : 0;
  });

  const gpsHotspots = catches
    .filter(c => c.latitude && c.longitude)
    .map(c => ({ 
      ...c, 
      coordinates: [parseFloat(c.longitude!), parseFloat(c.latitude!)] as [number, number] 
    }));

  const locationStats = Object.values(stats).sort((a, b) => b.successRate - a.successRate);
  const bestLocation = locationStats[0]?.location || null;

  return { locationStats, gpsHotspots, bestLocation };
}

export function calculatePersonalRecords(
  catches: DiaryCatch[],
  trips: DiaryTrip[],
  monthlyStats: MonthlyStats[]
): PersonalRecords {
  const heaviestCatch = catches.reduce(
    (max, c) => parseFloat(c.weight) > parseFloat(max?.weight || '0') ? c : max,
    catches[0] || null
  );

  const longestCatch = catches
    .filter(c => c.lengthCm)
    .reduce((max, c) => (c.lengthCm || 0) > (max?.lengthCm || 0) ? c : max, null as DiaryCatch | null);

  const bestTrip = trips
    .map(trip => {
      const tripCatches = catches.filter(c => c.tripId === trip.id);
      const tripTotalWeight = tripCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
      return {
        ...trip,
        catchCount: tripCatches.length,
        totalWeight: tripTotalWeight,
        averageWeight: tripCatches.length > 0 ? tripTotalWeight / tripCatches.length : 0
      };
    })
    .sort((a, b) => b.catchCount - a.catchCount)[0] || null;

  const streaks = (() => {
    const sortedTrips = [...trips].sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    let currentStreak = 0;
    let maxStreak = 0;
    sortedTrips.forEach(trip => {
      if (catches.some(c => c.tripId === trip.id)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    return { current: currentStreak, longest: maxStreak };
  })();

  const monthlyRecords = monthlyStats
    .map(month => ({
      month: month.month,
      bestCatch: getBestCatch(filterCatchesByMonths(catches, [new Date(month.monthDate)])),
      totalCatches: month.catches,
      totalWeight: month.totalWeight
    }))
    .filter(record => record.bestCatch);

  return { heaviestCatch, longestCatch, bestTrip, streaks, monthlyRecords };
}
