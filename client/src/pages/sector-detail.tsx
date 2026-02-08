import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Trophy, Fish, X, Activity, TrendingUp, Crown, Camera } from "lucide-react";
import { Team, TeamMember, Catch } from "@shared/schema";

type SectorStatistics = {
  teams: (Team & { members: TeamMember[] })[];
  biggestFish: Catch | null;
  biggestScalyCarp: Catch | null;
  biggestMirrorCarp: Catch | null;
  averageWeight: number;
};

const StatCard = ({ label, value, unit, icon: Icon, iconColor, onClick }: {
  label: string; value: string | number; unit?: string; icon: any; iconColor: string; onClick?: () => void;
}) => {
  const content = (
    <>
      <div className="w-12 h-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center mb-4 shadow-inner">
        <Icon size={22} className={iconColor} strokeWidth={2} />
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-xl md:text-3xl font-mono font-medium text-[#F97316]">
          {value}
        </span>
        <span className="text-xs md:text-sm font-normal text-muted-foreground">{unit}</span>
      </div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </div>
    </>
  );

  const baseClass = `
    bg-card border border-border rounded-xl p-6
    flex flex-col items-center justify-center text-center
    h-full transition-all duration-200 shadow-sm
  `;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} cursor-pointer hover:border-slate-700 hover:bg-card/80 group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
};

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center text-yellow-950 font-black text-sm shadow-[0_0_15px_rgba(234,179,8,0.4)]">1</div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center text-slate-800 font-black text-sm shadow-[0_0_15px_rgba(148,163,184,0.3)]">2</div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-orange-900 font-black text-sm shadow-[0_0_15px_rgba(249,115,22,0.3)]">3</div>;
  return <div className="w-8 h-8 rounded-full bg-slate-800 border border-border flex items-center justify-center text-muted-foreground font-bold text-sm">{rank}</div>;
};

export default function SectorDetail() {
  const { competitionId, sector } = useParams();
  const [selectedPhoto, setSelectedPhoto] = useState<Catch | null>(null);

  const { data: sectorStats, isLoading } = useQuery<SectorStatistics>({
    queryKey: ["/api/competitions", competitionId, "sectors", sector, "statistics"],
    enabled: !!competitionId && !!sector,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!sectorStats) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-foreground text-xl font-bold">Sektor nenájdený</h2>
        <Link href={`/competition/${competitionId}`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Späť na súťaž
          </Button>
        </Link>
      </div>
    );
  }

  const sortedTeams = [...sectorStats.teams].sort((a, b) => parseFloat(b.totalWeight || '0') - parseFloat(a.totalWeight || '0'));
  const sectorName = sector ? `Sektor ${sector.toUpperCase()}` : "Sektor ?";

  const sectorTotalWeight = sectorStats.teams.reduce((sum, t) => sum + parseFloat(t.totalWeight || '0'), 0);
  const sectorFishCount = sectorStats.teams.reduce((sum, t) => sum + (Number(t.fishCount) || 0), 0);

  const biggestFishWeight = Number(sectorStats.biggestFish?.weight);
  const hasBiggest = Number.isFinite(biggestFishWeight) && biggestFishWeight > 0;
  const biggestFishDisplay = hasBiggest ? biggestFishWeight.toFixed(2) : "—";
  const biggestFishUnit = hasBiggest ? "kg" : "";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-20">

      <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/competition/${competitionId}`}>
            <button className="flex items-center text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider mb-2 transition-colors">
              <ArrowLeft className="w-3 h-3 mr-1" /> Späť na súťaž
            </button>
          </Link>
          <div className="flex items-end justify-between">
            <h1 className="text-3xl md:text-5xl font-black italic text-foreground uppercase tracking-tighter leading-none drop-shadow-lg">
              {sectorName}
            </h1>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold hidden md:flex">
              LIVE
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Počet úlovkov"
            value={sectorFishCount}
            unit="ks"
            icon={Fish}
            iconColor="text-blue-400"
          />
          <StatCard
            label="Celková Váha"
            value={sectorTotalWeight.toFixed(2)}
            unit="kg"
            icon={Activity}
            iconColor="text-emerald-400"
          />
          <StatCard
            label="Najväčšia Ryba"
            value={biggestFishDisplay}
            unit={biggestFishUnit}
            icon={Trophy}
            iconColor="text-yellow-400"
            onClick={hasBiggest ? () => setSelectedPhoto(sectorStats.biggestFish) : undefined}
          />
          <StatCard
            label="Priemerná Váha"
            value={sectorStats.averageWeight.toFixed(1)}
            unit="kg"
            icon={TrendingUp}
            iconColor="text-purple-400"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Trophy size={14} /> Rebríček
            </h2>
            <span className="text-xs text-muted-foreground font-mono">{sortedTeams.length} tímov</span>
          </div>

          <div className="space-y-2">
            {sortedTeams.map((team, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;

              const memberNames = (team.members || []).map(m => m.name);
              const membersDisplay = memberNames.length > 0
                ? memberNames.slice(0, 2).join(', ') + (memberNames.length > 2 ? ` +${memberNames.length - 2}` : '')
                : "Bez členov";

              const fishCount = Number(team.fishCount || 0);
              const fishCountDisplay = fishCount > 0 ? `${fishCount} KS` : "Bez úlovku";
              const isEmpty = parseFloat(team.totalWeight || "0") === 0 && fishCount === 0;

              return (
                <Link key={team.id} href={`/team/${team.id}`}>
                  <div className={`
                    relative overflow-hidden rounded-xl border p-4 transition-all cursor-pointer group
                    ${isTop3 && !isEmpty ? 'bg-card' : 'bg-background hover:bg-card'}
                    ${rank === 1 && !isEmpty ? 'border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]' :
                      rank === 2 && !isEmpty ? 'border-slate-500/30' :
                      rank === 3 && !isEmpty ? 'border-orange-500/30' : 'border-border'}
                  `}>
                    <div className="absolute -right-4 -bottom-6 text-[80px] font-black italic text-slate-800/20 z-0 pointer-events-none select-none">
                      {rank}
                    </div>

                    <div className="relative z-10 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <RankBadge rank={rank} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-lg truncate flex items-center gap-2 ${isEmpty ? 'text-muted-foreground' : rank === 1 ? 'text-yellow-400' : 'text-foreground group-hover:text-foreground'}`}>
                          {team.name}
                          {rank === 1 && !isEmpty && <Crown size={14} className="text-yellow-500 fill-yellow-500 animate-pulse" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                          <Users size={12} />
                          {membersDisplay}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`font-black text-xl md:text-2xl italic tracking-tighter tabular-nums ${isEmpty ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {parseFloat(team.totalWeight || '0').toFixed(2)}
                          <span className="text-xs font-bold text-muted-foreground ml-1 not-italic">KG</span>
                        </div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          {fishCountDisplay}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {sortedTeams.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <p className="text-muted-foreground">Zatiaľ žiadne tímy v sektore.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-border backdrop-blur-xl [&>button]:hidden" aria-describedby="sector-photo-description">
          <div className="relative h-[80vh] flex flex-col">
            <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <div className="text-white pointer-events-auto">
                {selectedPhoto && (
                  <div>
                    <div className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-md text-white">
                      Najväčšia ryba sektora
                    </div>
                    <div className="text-2xl font-bold mt-1" id="sector-photo-description">
                      {Number(selectedPhoto.weight).toFixed(2)} kg
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="bg-black/50 hover:bg-white hover:text-black text-white p-2 rounded-full transition-all border border-white/10 pointer-events-auto backdrop-blur-md"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-0 md:p-4">
              {selectedPhoto && selectedPhoto.photoUrl ? (
                <img
                  src={selectedPhoto.photoUrl}
                  alt="Detail"
                  className="max-h-full max-w-full object-contain md:rounded-lg shadow-2xl"
                />
              ) : selectedPhoto ? (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-4 border border-border">
                    <Camera size={40} className="text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-bold uppercase text-sm">Bez fotky</p>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
