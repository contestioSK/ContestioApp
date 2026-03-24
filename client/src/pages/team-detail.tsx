import { useState } from "react";
import { useParams, Link } from "wouter";
import { TeamFlag } from "@/components/team-flag";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, Trophy, Fish, MapPin, Camera, X, Heart, Scale, Ruler, Calendar, Anchor, Trash2, Crown, Shield, Loader2 } from "lucide-react";
import { Team, TeamMember, Catch, Competition } from "@shared/schema";
import { useFavoriteTeams, useToggleFavoriteTeam } from "@/hooks/useFavorites";
import { useToast } from "@/hooks/use-toast";

type TeamWithDetails = Team & {
  members?: TeamMember[];
  catches?: Catch[];
};

const formatDateTime = (dateString: string | Date | null, variant: 'grid' | 'full' | 'short' = 'short') => {
  if (!dateString) return "Neznámy dátum";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Neznámy dátum";

  const time = date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
  const day = date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' });
  const fullDate = date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' });

  if (variant === 'grid') return `${time} • ${day}`;
  if (variant === 'full') return `${fullDate} • ${time}`;
  return day;
};

const getFishTypeLabel = (type: string) => {
  if (type === 'scaly') return 'Šupináč';
  if (type === 'mirror') return 'Lysec';
  return type;
};

const StatCard = ({ label, value, unit, icon: Icon }: { label: string; value: string | number; unit?: string; icon: any }) => (
  <div className="bg-card border border-border p-4 md:p-5 rounded-xl flex items-center justify-between group hover:border-slate-700 transition-colors relative overflow-hidden">
    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-slate-800/20 rounded-full blur-2xl group-hover:bg-[#F97316]/10 transition-colors" />
    <div className="relative z-10">
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl md:text-3xl font-black italic text-foreground tracking-tighter tabular-nums">{value}</span>
        {unit && <span className="text-xs md:text-sm font-bold text-muted-foreground uppercase">{unit}</span>}
      </div>
    </div>
    <div className="relative z-10 w-10 h-10 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:text-[#F97316] transition-colors border border-border shadow-sm">
      <Icon size={18} strokeWidth={1.75} />
    </div>
  </div>
);

const CatchGridItem = ({ data, onClick }: { data: Catch; onClick: (c: Catch) => void }) => (
  <button
    onClick={() => onClick(data)}
    className="group relative w-full aspect-[4/3] bg-card rounded-xl overflow-hidden border border-border cursor-pointer hover:border-[#F97316]/50 transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] text-left focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 focus:ring-offset-background"
    aria-label={`Zobraziť detail úlovku: ${Number(data.weight || 0).toFixed(3)} kg`}
  >
    {data.photoUrl ? (
      <img
        src={data.photoUrl}
        alt={`Úlovok ${data.weight}kg`}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
        loading="lazy"
      />
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-card">
        <Camera size={32} strokeWidth={1.5} />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Bez fotky</span>
      </div>
    )}

    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />

    <div className="absolute top-3 left-3 z-10">
      <span className="bg-[#F97316] text-white text-xs font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
        <Scale size={10} />
        {Number(data.weight).toFixed(3)}
      </span>
    </div>

    <div className="absolute bottom-3 left-3 right-3 z-10">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-bold text-white uppercase flex items-center gap-1.5 drop-shadow-md">
          <Fish size={12} className={data.fishType === 'mirror' ? "text-blue-400" : "text-emerald-400"} />
          {getFishTypeLabel(data.fishType)}
        </div>
      </div>
      <div className="flex justify-between items-end border-t border-white/10 pt-2 mt-1">
        <div className="text-[10px] text-slate-400 font-mono">
          {formatDateTime(data.submittedAt, 'grid')}
        </div>
        {data.sector && (
          <div className="text-[10px] text-slate-300 font-bold bg-black/40 px-1.5 rounded">
            {data.sector}
          </div>
        )}
      </div>
    </div>
  </button>
);

export default function TeamDetail() {
  const { teamId } = useParams();
  const [selectedPhoto, setSelectedPhoto] = useState<Catch | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<TeamMember | null>(null);
  const [confirmNewCaptain, setConfirmNewCaptain] = useState<TeamMember | null>(null);
  const { toast } = useToast();

  const { data: teamData, isLoading } = useQuery<TeamWithDetails>({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

  const { data: competition } = useQuery<Competition>({
    queryKey: ["/api/competitions", teamData?.competitionId],
    enabled: !!teamData?.competitionId,
  });

  const { data: favoriteTeams } = useFavoriteTeams();
  const { addFavorite, removeFavorite, isAdding, isRemoving } = useToggleFavoriteTeam();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const isOrganizer = isAuthenticated && competition && (
    user?.role === 'admin' || (user?.role === 'organizer' && competition.organizerId === user?.id)
  );

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest('DELETE', `/api/teams/${teamId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      toast({ title: "Člen bol odstránený z tímu" });
      setConfirmRemoveMember(null);
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message || "Nepodarilo sa odstrániť člena", variant: "destructive" });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      await apiRequest('PATCH', `/api/teams/${teamId}/members/${memberId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId] });
      toast({ title: "Kapitán tímu bol zmenený" });
      setConfirmNewCaptain(null);
    },
    onError: (error: any) => {
      toast({ title: "Chyba", description: error.message || "Nepodarilo sa zmeniť rolu", variant: "destructive" });
    },
  });

  const isFavorite = isAuthenticated && favoriteTeams?.some(fav => fav.teamId === teamId);

  const handleToggleFavorite = () => {
    if (!isAuthenticated || !teamId) return;
    if (isFavorite) {
      removeFavorite(teamId);
    } else {
      addFavorite(teamId);
    }
  };

  const sortedCatches = teamData?.catches
    ? [...teamData.catches].sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        const validA = dateA > 0 && !isNaN(dateA);
        const validB = dateB > 0 && !isNaN(dateB);
        if (validA && !validB) return -1;
        if (!validA && validB) return 1;
        if (!validA && !validB) return 0;
        return dateB - dateA;
      })
    : [];

  const totalWeight = sortedCatches.reduce((sum, c) => sum + Number(c.weight), 0);
  const catchCount = sortedCatches.length;
  const averageWeight = catchCount > 0 ? totalWeight / catchCount : 0;

  const biggestCatch = sortedCatches.length > 0
    ? sortedCatches.reduce((max, curr) => Number(curr.weight) > Number(max.weight) ? curr : max, sortedCatches[0])
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8 space-y-8">
        <div className="flex gap-6 items-center">
          <Skeleton className="w-24 h-24 rounded-2xl bg-muted" />
          <div className="space-y-3">
            <Skeleton className="w-64 h-10 bg-muted" />
            <Skeleton className="w-32 h-6 bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mb-6 text-muted-foreground border border-border">
          <Anchor size={32} />
        </div>
        <h2 className="text-2xl font-black text-foreground uppercase mb-2">Mimo radar</h2>
        <p className="text-muted-foreground mb-8 max-w-xs mx-auto">Tento tím sa v našich vodách nenachádza. Skúste ich pohľadať v celkovom rebríčku.</p>
        <Link href="/">
          <Button variant="outline" className="border-border text-muted-foreground">Späť na prehľad</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-sans selection:bg-orange-500/30">

      <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <Link href={teamData.competitionId ? `/competition/${teamData.competitionId}` : '/'}>
            <button className="group flex items-center text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider mb-4 transition-colors">
              <ArrowLeft className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" /> Späť na súťaž
            </button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-card border border-border overflow-hidden shadow-2xl relative group ring-1 ring-white/5">
                {teamData.photoUrl ? (
                  <img src={teamData.photoUrl} alt={teamData.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Anchor size={32} />
                  </div>
                )}
                {teamData.status === 'approved' && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500 shadow-[0_0_10px_#10B981]" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-1">
                  <TeamFlag country={teamData.country} size="md" />
                  <h1 className="text-3xl md:text-5xl font-black italic text-foreground uppercase tracking-tighter leading-none drop-shadow-lg">
                    {teamData.name}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
                  {teamData.sector && (
                    <Badge variant="outline" className="bg-card border-border text-foreground/80">
                      <MapPin size={12} className="mr-1 text-[#F97316]" /> Sektor {teamData.sector}
                    </Badge>
                  )}
                  {teamData.createdAt && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      <Calendar size={12} /> Reg: {formatDateTime(teamData.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isAuthenticated && !authLoading && (
              <Button
                variant={isFavorite ? "default" : "outline"}
                onClick={handleToggleFavorite}
                disabled={isAdding || isRemoving}
                className={`min-w-[140px] shadow-none ${isFavorite ? "bg-[#F97316] hover:bg-orange-600 text-white" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-white" : ""}`} />
                {isFavorite ? "Sleduješ" : "Sledovať tím"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Celková váha" value={totalWeight.toFixed(3)} unit="kg" icon={Scale} />
          <StatCard label="Počet rýb" value={catchCount} unit="ks" icon={Fish} />
          <StatCard label="Priemer" value={averageWeight.toFixed(3)} unit="kg" icon={Ruler} />
          <StatCard label="Big Fish" value={biggestCatch ? Number(biggestCatch.weight).toFixed(3) : "-"} unit="kg" icon={Trophy} />
        </div>

        <div className="grid lg:grid-cols-3 gap-10">

          <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-xl font-black italic text-foreground uppercase tracking-wide flex items-center gap-2">
                <Fish className="text-[#F97316]" size={24} /> Úlovky tímu
              </h2>
              <Badge variant="secondary" className="bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20 font-bold">
                {catchCount} ks SPOLU
              </Badge>
            </div>

            {catchCount === 0 ? (
              <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-card/30">
                <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <Fish size={32} />
                </div>
                <h3 className="text-foreground font-bold uppercase mb-1">Žiadne úlovky</h3>
                <p className="text-muted-foreground text-sm">Tím zatiaľ neprekabátil žiadnu rybu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {sortedCatches.map((c) => (
                  <CatchGridItem
                    key={c.id}
                    data={c}
                    onClick={(d) => setSelectedPhoto(d)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="order-1 lg:order-2 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-xl font-black italic text-foreground uppercase tracking-wide flex items-center gap-2">
                <Users className="text-muted-foreground" size={24} /> Súpiska
              </h2>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              {teamData.members?.map((member, i) => (
                <div key={i} className="p-4 border-b border-border last:border-0 flex items-center gap-4 hover:bg-muted/30 transition-colors group">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border overflow-hidden flex-shrink-0 group-hover:border-slate-600 transition-colors">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} className="w-full h-full object-cover" alt={member.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-black">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm truncate">{member.name}</span>
                      {member.role === 'captain' && (
                        <Badge className="bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20 px-1 py-0 text-[9px] h-4">C</Badge>
                      )}
                    </div>
                    {member.email && (
                      <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                    )}
                  </div>
                  {isOrganizer && (
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      {member.role !== 'captain' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                          title="Nastaviť ako kapitána"
                          onClick={() => setConfirmNewCaptain(member)}
                        >
                          <Crown size={14} />
                        </Button>
                      )}
                      {(teamData.members?.length ?? 0) > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                          title="Odstrániť z tímu"
                          onClick={() => setConfirmRemoveMember(member)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isOrganizer && (
              <p className="text-[10px] text-muted-foreground/50 mt-2 pl-1">
                <Shield size={10} className="inline mr-1" />
                Ako organizátor môžeš spravovať členov tímu
              </p>
            )}

          </div>
        </div>
      </div>

      <Dialog open={!!confirmRemoveMember} onOpenChange={() => setConfirmRemoveMember(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Odstrániť člena z tímu?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {confirmRemoveMember?.role === 'captain' ? (
                <>Odstraňuješ <span className="font-bold text-amber-500">kapitána</span> „{confirmRemoveMember?.name}". Ďalší člen tímu bude automaticky ustanovený ako nový kapitán.</>
              ) : (
                <>Naozaj chceš odstrániť „{confirmRemoveMember?.name}" z tímu? Táto akcia je nevratná.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmRemoveMember(null)} className="border-border text-muted-foreground">
              Zrušiť
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRemoveMember && removeMemberMutation.mutate(confirmRemoveMember.id)}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
              Odstrániť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmNewCaptain} onOpenChange={() => setConfirmNewCaptain(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Zmeniť kapitána tímu?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Nastaviť „{confirmNewCaptain?.name}" ako nového kapitána tímu? Doterajší kapitán bude preradený na bežného člena.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmNewCaptain(null)} className="border-border text-muted-foreground">
              Zrušiť
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => confirmNewCaptain && changeRoleMutation.mutate({ memberId: confirmNewCaptain.id, role: 'captain' })}
              disabled={changeRoleMutation.isPending}
            >
              {changeRoleMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Crown size={14} className="mr-2" />}
              Potvrdiť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black/95 border-border backdrop-blur-xl [&>button]:hidden" aria-describedby="catch-photo-description">
          <div className="relative h-[80vh] flex flex-col">

            <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <div className="text-white pointer-events-auto">
                {selectedPhoto && (
                  <div>
                    <div className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-md">
                      {Number(selectedPhoto.weight).toFixed(3)} kg
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-300 mt-1">
                      <span className="bg-[#F97316] text-white px-2 py-0.5 rounded text-[10px] uppercase shadow-sm">
                        {getFishTypeLabel(selectedPhoto.fishType)}
                      </span>
                      <span className="opacity-80" id="catch-photo-description">
                        {formatDateTime(selectedPhoto.submittedAt, 'full')}
                      </span>
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
