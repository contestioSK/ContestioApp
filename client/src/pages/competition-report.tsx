import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { TeamFlag } from "@/components/team-flag";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, PieChart, Mic, Clock, MapPin, BarChart3,
  LayoutList, Fish, TrendingUp, Activity,
} from "lucide-react";
import StatsDashboard from "@/components/stats-dashboard";
import { useVisibilityAwarePolling, POLLING_INTERVALS, STALE_TIMES } from "@/hooks/usePolling";
import type { Competition, Team, Catch } from "@shared/schema";

// ---- INLINE HELPER COMPONENTS ----

const HorizontalBarChart = ({
  data,
  competitionId,
}: {
  data: { name: string; weight: number; color: string; sector?: string }[];
  competitionId?: string;
}) => {
  const max = Math.max(...data.map((d) => d.weight), 1);
  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            {competitionId && d.sector ? (
              <Link href={`/competition/${competitionId}/sector/${d.sector}`}>
                <span className="text-foreground font-bold hover:text-[#F97316] transition-colors cursor-pointer">
                  {d.name}
                </span>
              </Link>
            ) : (
              <span className="text-foreground font-bold">{d.name}</span>
            )}
            <span className="text-muted-foreground">{d.weight.toFixed(1)} kg</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${d.color}`}
              style={{ width: `${(d.weight / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const HOUR_COLORS = [
  "#3B82F6","#3B82F6","#2563EB","#2563EB","#1D4ED8","#3B82F6",
  "#2563EB","#3B82F6","#06B6D4","#22D3EE","#06B6D4","#14B8A6",
  "#F59E0B","#10B981","#22C55E","#84CC16","#A3E635","#EAB308",
  "#F59E0B","#F97316","#EA580C","#F97316","#3B82F6","#3B82F6",
];

const HourlyBarChart = ({
  data,
}: {
  data: { hour: string; val: number }[];
}) => {
  const max = Math.max(...data.map((d) => d.val), 1);
  const yTicks: number[] = [];
  for (let i = 0; i <= max; i += Math.max(1, Math.ceil(max / 5))) {
    yTicks.push(i);
  }
  if (yTicks[yTicks.length - 1] < max) yTicks.push(max);

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex min-w-[600px]" style={{ minHeight: "220px" }}>
        <div className="flex flex-col justify-between pr-2 pb-6 text-[10px] text-muted-foreground font-mono items-end shrink-0 w-8">
          {[...yTicks].reverse().map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="flex-1 relative">
          <div className="absolute inset-0 bottom-6 flex flex-col justify-between pointer-events-none">
            {[...yTicks].reverse().map((_, i) => (
              <div key={i} className="border-t border-dashed border-border/40 w-full" />
            ))}
          </div>
          <div
            className="flex items-end h-full gap-[2px] relative z-10 pb-6"
            style={{ height: "220px" }}
          >
            {data.map((d, i) => {
              const barHeight = max > 0 ? (d.val / max) * 100 : 0;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center flex-1 h-full justify-end group"
                >
                  <div className="relative w-full h-full flex items-end">
                    {d.val > 0 && (
                      <div
                        className="w-full rounded-t-sm transition-all duration-500 hover:opacity-80"
                        style={{
                          height: `${barHeight}%`,
                          backgroundColor: HOUR_COLORS[i % 24],
                          minHeight: d.val > 0 ? "4px" : "0px",
                        }}
                      />
                    )}
                    {d.val > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-border font-mono">
                        {d.val}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-[2px]">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[8px] sm:text-[9px] text-muted-foreground font-mono leading-none">
                  {d.hour}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground font-mono pl-8 -mt-1 italic">
        Počet úlovkov
      </div>
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

const safeTimestamp = (ts: unknown): number => {
  if (!ts) return 0;
  const d = new Date(ts as string);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
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

  const sectorStats = useMemo(() => {
    if (!catches || !teams) return [];
    const sectors = Array.from(
      new Set(teams.filter((t) => t.sector).map((t) => t.sector))
    ).filter(Boolean) as string[];
    const sectorColors = [
      "bg-cyan-500",
      "bg-purple-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-rose-500",
    ];
    return sectors
      .map((sector, i) => {
        const sectorTeamIds = teams.filter((t) => t.sector === sector).map((t) => t.id);
        const weight = catches
          .filter((c) => sectorTeamIds.includes(c.teamId || ""))
          .reduce((sum, c) => sum + safeWeight(c.weight), 0);
        return {
          name: `Sektor ${sector}`,
          sector,
          weight,
          color: sectorColors[i % sectorColors.length],
        };
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
      if (
        competition?.status === "registration" ||
        competition?.status === "setup"
      ) {
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
      <div className="border-b border-border/50 bg-background sticky top-0 z-10 backdrop-blur-sm bg-background/90">
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

        {/* TAB 1: OVERVIEW */}
        {statsTab === "overview" && (
          <div className="space-y-8">
            {/* Commentator Block */}
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 md:p-6 rounded-xl flex gap-4 items-start">
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

            {/* Hourly Chart */}
            <div className="bg-card p-4 sm:p-6 rounded-xl border border-border overflow-hidden">
              <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                <Clock size={18} strokeWidth={1.75} className="text-muted-foreground" />
                Úlovky podľa hodín
              </h3>
              <p className="text-xs text-muted-foreground mb-4 sm:mb-6">
                Rozdelenie úlovkov podľa hodín dňa. Klikni na stĺpec pre detail.
              </p>
              <HourlyBarChart data={hourlyActivity} />
            </div>

            {/* Sector Bar Chart */}
            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <MapPin size={18} strokeWidth={1.75} className="text-muted-foreground" />
                Kde ryby berú najviac
              </h3>
              <HorizontalBarChart data={sectorStats} competitionId={id} />
              {sectorStats.length > 0 && (
                <p className="text-xs text-muted-foreground mt-6 leading-relaxed bg-muted/30 p-3 rounded-lg">
                  {sectorStats[0]?.name} vedie s váhou{" "}
                  {sectorStats[0]?.weight.toFixed(1)} kg.
                </p>
              )}
            </div>

            {/* 4 stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card p-4 rounded-xl text-center border border-border">
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">
                  Priemerná váha úlovku
                </div>
                <div className="text-2xl font-mono font-medium text-[#F97316]">
                  {liveStats.avgWeight.toFixed(1)} kg
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl text-center border border-border">
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">
                  Počet úlovkov
                </div>
                <div className="text-2xl font-mono font-medium text-[#F97316]">
                  {liveStats.totalFish}
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl text-center border border-border">
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">
                  TOP ryba preteku
                </div>
                <div className="text-2xl font-mono font-medium text-[#F97316]">
                  {liveStats.biggestFish.toFixed(1)} kg
                </div>
              </div>
              <div className="bg-card p-4 rounded-xl text-center border border-border">
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">
                  Celková váha
                </div>
                <div className="text-2xl font-mono font-medium text-[#F97316]">
                  {liveStats.totalWeight.toFixed(1)} kg
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SECTORS */}
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

        {/* TAB 3: ANALYTICS */}
        {statsTab === "analytics" && id && (
          <div className="space-y-6">
            <StatsDashboard competitionId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
