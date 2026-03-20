import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { TeamFlag } from "@/components/team-flag";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, PieChart, BarChart3,
  LayoutList, Activity, Target, Trophy, Mic,
} from "lucide-react";
import StatsDashboard from "@/components/stats-dashboard";
import { TeamAverageTable } from "@/components/stats-dashboard/charts/team-average-table";
import { useVisibilityAwarePolling, POLLING_INTERVALS, STALE_TIMES } from "@/hooks/usePolling";
import type { Competition, Team, Catch } from "@shared/schema";

// ---- INLINE HELPER COMPONENTS ----

const DistributionRow = ({
  label,
  count,
  maxCount,
  colorClass,
  bgClass,
}: {
  label: string;
  count: number;
  maxCount: number;
  colorClass: string;
  bgClass: string;
}) => {
  const percentage = count > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-16 font-mono text-muted-foreground text-xs">{label}</span>
      <div className="flex-1 h-5 bg-background rounded-md overflow-hidden relative border border-border/30">
        <div
          className={`absolute top-0 left-0 h-full rounded-md transition-all duration-1000 ${bgClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`w-6 text-right font-bold text-sm ${count > 0 ? colorClass : "text-muted-foreground/40"}`}>
        {count}
      </span>
    </div>
  );
};

const SectorTable = ({
  sector,
  leaderboard,
  competitionId,
}: {
  sector: string;
  leaderboard: any[];
  competitionId: string;
}) => {
  const sectorTeams = leaderboard
    .filter((t) => t.sector === sector)
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      if (b.fish !== a.fish) return b.fish - a.fish;
      return (a.name || "").localeCompare(b.name || "", "sk");
    });
  return (
    <div className="bg-card/50 rounded-xl border border-border overflow-hidden mb-4">
      <div className="p-3 bg-muted/50 font-bold text-foreground text-sm flex justify-between">
        <Link
          href={`/competition/${competitionId}/sector/${sector}`}
          className="hover:text-orange-500 transition-colors"
        >
          Sektor {sector}
        </Link>
        <span className="text-muted-foreground text-xs font-normal">Top 5 tímov</span>
      </div>
      <table className="w-full text-xs text-left">
        <thead className="text-muted-foreground uppercase bg-muted/30">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Tím</th>
            <th className="px-4 py-2 text-right">Váha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sectorTeams.slice(0, 5).map((t, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <td className="px-4 py-2 font-mono text-muted-foreground">{i + 1}.</td>
              <td className="px-4 py-2 text-foreground font-medium">
                <Link
                  href={`/team/${t.id}`}
                  className="hover:text-orange-500 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <TeamFlag country={t.country} size="xs" />
                  {t.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-right text-foreground font-bold">
                {t.weight.toFixed(1)}
              </td>
            </tr>
          ))}
          {sectorTeams.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">
                Žiadne tímy v tomto sektore
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ---- HELPERS ----

const safeWeight = (w: unknown): number => {
  const s = String(w ?? "0").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

// ---- MAIN PAGE ----

export default function CompetitionReport() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [statsTab, setStatsTab] = useState<"overview" | "sectors" | "analytics">("overview");

  const livePollingInterval = useVisibilityAwarePolling(POLLING_INTERVALS.COMPETITION_LIVE);

  const { data: competition, isLoading: competitionLoading } = useQuery<Competition>({
    queryKey: ["/api/competitions", id],
    enabled: !!id,
  });

  const isLive = competition?.status === "live";

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members?: any[] })[]>({
    queryKey: ["/api/competitions", id, "teams"],
    enabled: !!id,
    refetchInterval: isLive ? livePollingInterval : false,
    staleTime: isLive ? STALE_TIMES.LIVE : STALE_TIMES.STATIC,
  });

  const { data: catches, isLoading: catchesLoading } = useQuery<
    (Catch & { team?: Team; referee?: any })[]
  >({
    queryKey: ["/api/competitions", id, "catches"],
    enabled: !!id,
    refetchInterval: isLive ? livePollingInterval : false,
    staleTime: isLive ? STALE_TIMES.LIVE : STALE_TIMES.STATIC,
  });

  // ---- DATA FOR OVERVIEW TAB ----

  const overviewStats = useMemo(() => {
    if (!catches || catches.length === 0) return null;

    const weightDistribution = { under10: 0, tier10to15: 0, tier15to20: 0, tier20to25: 0, over25: 0 };
    let biggestFishCatch = catches[0];

    catches.forEach((c) => {
      const w = safeWeight(c.weight);
      if (w > safeWeight(biggestFishCatch.weight)) biggestFishCatch = c;
      if (w < 10) weightDistribution.under10++;
      else if (w < 15) weightDistribution.tier10to15++;
      else if (w < 20) weightDistribution.tier15to20++;
      else if (w < 25) weightDistribution.tier20to25++;
      else weightDistribution.over25++;
    });

    const maxInTier = Math.max(
      weightDistribution.tier10to15,
      weightDistribution.tier15to20,
      weightDistribution.tier20to25,
      weightDistribution.over25,
    ) || 1;

    const sortedByWeight = [...catches].sort((a, b) => safeWeight(b.weight) - safeWeight(a.weight));
    const top5 = sortedByWeight.slice(0, 5);
    const top5Avg = top5.reduce((sum, c) => sum + safeWeight(c.weight), 0) / Math.max(top5.length, 1);

    const top3 = sortedByWeight.slice(0, 3);
    const top3Avg = top3.reduce((sum, c) => sum + safeWeight(c.weight), 0) / Math.max(top3.length, 1);

    const scalyCount = catches.filter((c) => c.fishType === "scaly").length;
    const scalyPct = catches.length > 0 ? Math.round((scalyCount / catches.length) * 100) : 0;

    return { weightDistribution, maxInTier, top5Avg, top3, top3Avg, scalyPct, biggestFishCatch };
  }, [catches]);

  // 2-hour activity buckets (weight sum)
  const activityChart = useMemo(() => {
    const slots = ["06", "08", "10", "12", "14", "16", "18", "20", "22", "00", "02", "04"];
    const weights: Record<string, number> = {};
    slots.forEach((s) => (weights[s] = 0));
    if (catches) {
      catches.forEach((c) => {
        if (!c.submittedAt) return;
        const hour = new Date(c.submittedAt).getHours();
        const bucket = Math.floor(hour / 2) * 2;
        const key = String(bucket).padStart(2, "0");
        if (weights[key] !== undefined) weights[key] += safeWeight(c.weight);
      });
    }
    return slots.map((s) => ({ time: `${s}:00`, val: weights[s] }));
  }, [catches]);

  const { svgPath, svgMaxVal } = useMemo(() => {
    const maxVal = Math.max(...activityChart.map((p) => p.val), 1);
    const width = 1000;
    const height = 200;
    const step = width / (activityChart.length - 1);
    let path = `M 0 ${height - (activityChart[0].val / maxVal) * height}`;
    for (let i = 1; i < activityChart.length; i++) {
      const xP = (i - 1) * step;
      const yP = height - (activityChart[i - 1].val / maxVal) * height;
      const xC = i * step;
      const yC = height - (activityChart[i].val / maxVal) * height;
      path += ` C ${xP + (xC - xP) / 2} ${yP}, ${xP + (xC - xP) / 2} ${yC}, ${xC} ${yC}`;
    }
    return { svgPath: path, svgMaxVal: maxVal };
  }, [activityChart]);

  // ---- DATA FOR OTHER TABS ----

  const liveStats = useMemo(() => {
    if (!catches || catches.length === 0)
      return { totalFish: 0, totalWeight: 0, biggestFish: 0, avgWeight: 0 };
    const totalFish = catches.length;
    const totalWeight = catches.reduce((sum, c) => sum + safeWeight(c.weight), 0);
    const biggestFish = Math.max(...catches.map((c) => safeWeight(c.weight)));
    const avgWeight = totalFish > 0 ? totalWeight / totalFish : 0;
    return { totalFish, totalWeight, biggestFish, avgWeight };
  }, [catches]);

  const sortedLeaderboard = useMemo(() => {
    if (!teams) return [];
    const statsMap: Record<string, { weight: number; fish: number }> = {};
    if (catches) {
      for (const c of catches) {
        const tid = c.teamId || "";
        if (!statsMap[tid]) statsMap[tid] = { weight: 0, fish: 0 };
        statsMap[tid].weight += safeWeight(c.weight);
        statsMap[tid].fish += 1;
      }
    }
    return teams
      .filter((t) => t.status === "approved")
      .map((team) => ({
        ...team,
        weight: statsMap[team.id]?.weight || 0,
        fish: statsMap[team.id]?.fish || 0,
        sector: (team.sector || "-").trim(),
      }))
      .sort((a, b) => {
        if (b.weight !== a.weight) return b.weight - a.weight;
        if (b.fish !== a.fish) return b.fish - a.fish;
        return (a.name || "").localeCompare(b.name || "", "sk");
      })
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }, [teams, catches]);

  const teamTop3AverageData = useMemo(() => {
    if (!teams || !catches) return [];
    const approvedTeams = teams.filter((t) => t.status === "approved");
    return approvedTeams
      .map((team) => {
        const teamCatches = catches
          .filter((c) => c.teamId === team.id)
          .sort((a, b) => safeWeight(b.weight) - safeWeight(a.weight));
        const top3 = teamCatches.slice(0, 3);
        const avg = top3.length > 0
          ? top3.reduce((sum, c) => sum + safeWeight(c.weight), 0) / top3.length
          : 0;
        return {
          teamName: team.name || "—",
          averageWeight: parseFloat(avg.toFixed(2)),
          fishCount: top3.length,
          maxFish: 3,
        };
      })
      .filter((t) => t.fishCount > 0)
      .sort((a, b) => b.averageWeight - a.averageWeight);
  }, [teams, catches]);

  const sectorStats = useMemo(() => {
    if (!catches || !teams) return [];
    const sectors = Array.from(
      new Set(teams.filter((t) => t.sector).map((t) => t.sector))
    ).filter(Boolean) as string[];
    return sectors
      .map((sector) => {
        const sectorTeamIds = teams.filter((t) => t.sector === sector).map((t) => t.id);
        const weight = catches
          .filter((c) => sectorTeamIds.includes(c.teamId || ""))
          .reduce((sum, c) => sum + safeWeight(c.weight), 0);
        return { name: `Sektor ${sector}`, sector, weight };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [catches, teams]);

  const hourlyActivity = useMemo(() => {
    if (!catches) return [];
    const hourSlots = Array.from({ length: 24 }, (_, i) =>
      `${String(i).padStart(2, "0")}:00`
    );
    const hours: { [key: string]: number } = {};
    hourSlots.forEach((h) => (hours[h] = 0));
    catches.forEach((c) => {
      if (!c.submittedAt) return;
      const hour = new Date(c.submittedAt).getHours();
      const key = `${String(hour).padStart(2, "0")}:00`;
      if (hours[key] !== undefined) hours[key]++;
    });
    return hourSlots.map((hour) => ({ hour, val: hours[hour] }));
  }, [catches]);

  const uniqueSectors = Array.from(
    new Set(sortedLeaderboard.map((t) => t.sector).filter((s) => s !== "-"))
  );

  const getCommentary = useMemo(() => {
    return (type: "short" | "full") => {
      if (competition?.status === "registration" || competition?.status === "setup") {
        return "Pretek nám ešte nezačal.";
      }
      const hasAnyCatches = (liveStats.totalFish ?? 0) > 0;
      if (!hasAnyCatches) {
        return type === "short"
          ? "Čakáme na prvý záber…"
          : "Zatiaľ nepadol žiadny úlovok. Prvé dáta sa objavia hneď po overení úlovku.";
      }
      const peakHour = hourlyActivity.reduce(
        (max, h) => (h.val > max.val ? h : max),
        { hour: "", val: 0 }
      );
      const topSector = sectorStats[0];
      let timeComment = "";
      if (peakHour.hour) {
        const hourNum = Number((peakHour.hour || "0").split(":")[0]);
        if (hourNum >= 18 || hourNum < 6) {
          timeComment = "Ryby sa ozývajú hlavne večer a v noci.";
        } else if (hourNum >= 6 && hourNum < 12) {
          timeComment = "Najlepšie zábery prichádzajú ráno.";
        } else {
          timeComment = "Zábery prichádzajú rovnomerne počas dňa.";
        }
      }
      if (type === "short") return timeComment || "Sledujte vývoj preteku.";
      let fullComment = "";
      if (topSector && topSector.weight > 0) {
        fullComment = `Najviac záberov je v ${topSector.name.toLowerCase()} s celkovou váhou ${topSector.weight.toFixed(1)} kg. `;
      }
      if (peakHour.hour && peakHour.val > 0) {
        fullComment += `Najaktívnejšie obdobie je okolo ${peakHour.hour}.`;
      }
      return fullComment || "Pretek práve prebieha, sledujte aktuálne výsledky.";
    };
  }, [competition?.status, sectorStats, hourlyActivity, liveStats.totalFish]);

  const isLoading = competitionLoading || teamsLoading || catchesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Súťaž nebola nájdená</h1>
          <Button onClick={() => navigate("/")}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Späť na hlavnú stránku
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">

      {/* PAGE HEADER */}
      <div className="border-b border-border/50 sticky top-0 z-10 backdrop-blur-sm bg-background/90">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <button
            onClick={() => navigate(`/competition/${id}`)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors mb-3"
          >
            <ChevronLeft size={16} />
            Späť na pretek
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
                <PieChart className="text-blue-500" size={22} />
                Ako ryby berú počas preteku
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {competition.name} · Dáta priamo z vody
              </p>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex p-1 bg-muted/50 rounded-xl border border-border self-start md:self-auto">
              <button
                onClick={() => setStatsTab("overview")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  statsTab === "overview"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Prehľad
              </button>
              <button
                onClick={() => setStatsTab("sectors")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  statsTab === "sectors"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutList size={14} />
                Sektory
              </button>
              <button
                onClick={() => setStatsTab("analytics")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  statsTab === "analytics"
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 size={14} />
                Detailné štatistiky
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">

        {/* ===== TAB 1: OVERVIEW ===== */}
        {statsTab === "overview" && (
          <div className="space-y-6">

            {/* --- 4 STAT CARDS --- */}
            {overviewStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. Váhová pyramída */}
                <div className="bg-card border border-border/50 rounded-xl p-5 hover:border-border transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Váhová pyramída
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <DistributionRow
                      label="25+ kg"
                      count={overviewStats.weightDistribution.over25}
                      maxCount={overviewStats.maxInTier}
                      colorClass="text-purple-400"
                      bgClass="bg-purple-500"
                    />
                    <DistributionRow
                      label="20–25 kg"
                      count={overviewStats.weightDistribution.tier20to25}
                      maxCount={overviewStats.maxInTier}
                      colorClass="text-rose-400"
                      bgClass="bg-rose-500"
                    />
                    <DistributionRow
                      label="15–20 kg"
                      count={overviewStats.weightDistribution.tier15to20}
                      maxCount={overviewStats.maxInTier}
                      colorClass="text-amber-400"
                      bgClass="bg-amber-500"
                    />
                    <DistributionRow
                      label="10–15 kg"
                      count={overviewStats.weightDistribution.tier10to15}
                      maxCount={overviewStats.maxInTier}
                      colorClass="text-emerald-400"
                      bgClass="bg-emerald-500"
                    />
                  </div>
                </div>

                {/* 2. Priemer TOP 5 */}
                <div className="bg-card border border-border/50 rounded-xl p-5 hover:border-border transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <Target size={16} className="text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Priemer TOP 5
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5 mt-4">
                    <span className="text-4xl font-mono font-bold text-foreground">
                      {overviewStats.top5Avg.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">kg</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">
                    Kľúčový parameter k víťazstvu
                  </p>
                </div>

                {/* 3. Druhové zastúpenie */}
                <div className="bg-card border border-border/50 rounded-xl p-5 hover:border-border transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart size={16} className="text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Druhové zastúpenie
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <span className="text-2xl font-mono font-bold text-foreground">
                        {overviewStats.scalyPct}%
                      </span>
                      <span className="block text-[10px] text-muted-foreground uppercase mt-0.5">
                        Šupináč
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-mono font-bold text-foreground">
                        {100 - overviewStats.scalyPct}%
                      </span>
                      <span className="block text-[10px] text-muted-foreground uppercase mt-0.5">
                        Lysec
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full mt-3 overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${overviewStats.scalyPct}%` }}
                    />
                    <div
                      className="h-full bg-teal-500"
                      style={{ width: `${100 - overviewStats.scalyPct}%` }}
                    />
                  </div>
                </div>

                {/* 4. Najtažšia ryba */}
                <div className="bg-card border border-teal-500/30 rounded-xl p-5 relative overflow-hidden group">
                  <Trophy className="absolute -right-2 -bottom-2 w-20 h-20 text-teal-500/10 group-hover:scale-110 transition-transform" />
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy size={16} className="text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                      Najtažšia ryba
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-mono font-bold text-foreground">
                        {safeWeight(overviewStats.biggestFishCatch.weight).toFixed(1)}
                      </span>
                      <span className="text-sm font-medium text-teal-400 mb-1">kg</span>
                    </div>
                    <div className="mt-3">
                      <span className="text-[10px] block text-muted-foreground uppercase tracking-tight">
                        Lovec / Tím
                      </span>
                      <span className="text-sm font-bold text-foreground truncate block">
                        {overviewStats.biggestFishCatch.team?.name || "—"}
                      </span>
                      {overviewStats.biggestFishCatch.team?.sector && (
                        <span className="text-[10px] text-teal-500/80 font-mono">
                          Sektor {overviewStats.biggestFishCatch.team.sector}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-card border border-border/50 rounded-xl p-5 text-center text-muted-foreground text-sm">
                    Žiadne dáta
                  </div>
                ))}
              </div>
            )}

            {/* --- SVG AREA CHART --- */}
            <div className="bg-card border border-border/50 rounded-xl p-6">
              <div className="mb-6">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Activity size={18} className="text-teal-400" />
                  Časová os aktivity
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sila záberov v kg prepočítaná na časové úseky
                </p>
              </div>

              <div className="relative h-[250px] w-full">
                <svg
                  viewBox="0 0 1000 200"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${svgPath} L 1000 200 L 0 200 Z`}
                    fill="url(#areaGrad)"
                  />
                  <path
                    d={svgPath}
                    fill="none"
                    stroke="#14B8A6"
                    strokeWidth="3"
                  />
                  {activityChart.map((p, i) => (
                    <circle
                      key={i}
                      cx={i * (1000 / (activityChart.length - 1))}
                      cy={200 - (p.val / svgMaxVal) * 200}
                      r="5"
                      fill="hsl(var(--background))"
                      stroke="#14B8A6"
                      strokeWidth="2.5"
                    />
                  ))}
                </svg>
                <div className="absolute bottom-[-28px] w-full flex justify-between text-[10px] text-muted-foreground font-mono px-0">
                  {activityChart.map((p, i) => (
                    <span key={i}>{p.time}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* --- BOTTOM 2-COL: VÁHOVÝ PRIEMER TOP 3 + KOMENTÁR --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">

              {/* Left: Váhový priemer TOP 3 tímov */}
              <TeamAverageTable
                data={teamTop3AverageData.slice(0, 3)}
                title="Váhový priemer top 3 úlovkov"
                description="Tímy seradené podľa priemernej váhy ich 3 najťažších úlovkov"
              />

              {/* Right: Komentár k preteku */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 flex gap-4 items-start">
                <div className="shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mt-1">
                  <Mic size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                    Komentár k preteku
                  </h4>
                  <p className="text-foreground text-lg md:text-xl font-medium leading-relaxed">
                    "{getCommentary("full")}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB 2: SECTORS ===== */}
        {statsTab === "sectors" && (
          <div className="space-y-6">
            <h3 className="text-foreground font-bold text-lg mb-4">Poradie v sektoroch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uniqueSectors.map((sector) => (
                <SectorTable
                  key={sector}
                  sector={sector}
                  leaderboard={sortedLeaderboard}
                  competitionId={id!}
                />
              ))}
              {uniqueSectors.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  Sektory ešte nie sú rozdelené
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== TAB 3: ANALYTICS ===== */}
        {statsTab === "analytics" && id && (
          <div className="space-y-6">
            <StatsDashboard competitionId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
