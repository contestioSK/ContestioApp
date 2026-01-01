import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Trophy, Users, Calendar, Clock, Fish, Weight, Crown, Archive, Search, Filter, Eye, RotateCcw, Medal, BarChart3, Star, Plus, Loader2, SlidersHorizontal, Download, TrendingUp, FileText } from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { useLocation } from "wouter";
import DiaryLayout from "@/components/DiaryLayout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Archived battle data interface
interface ArchivedBattle {
  id: string;
  name: string;
  mode: string;
  status: "finished";
  startAt: Date | string;
  endAt: Date | string;
  participantCount: number;
  winner: string;
  userPosition: number | null;
  userScore: number;
  totalScore: number;
  participants: string[];
  results?: Array<{
    participant: { userId?: string; name: string };
    score: number;
    position: number;
  }>;
}


const getModeLabel = (mode: string) => {
  switch (mode) {
    case "most_fish": return "Najviac rýb";
    case "total_weight": return "Celková váha";
    case "biggest_fish": return "Najväčšia ryba";
    case "best_3_fish": return "Top 3 ryby";
    case "best_5_fish": return "Top 5 rýb";
    default: return mode;
  }
};

const getScoreUnit = (mode: string) => {
  switch (mode) {
    case "most_fish": return "rýb";
    case "total_weight": return "kg";
    case "biggest_fish": return "kg";
    case "best_3_fish": return "kg";
    case "best_5_fish": return "kg";
    default: return "";
  }
};

const getPositionBadge = (position: number) => {
  if (position === 1) return { emoji: "🏆", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
  if (position === 2) return { emoji: "🥈", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" };
  if (position === 3) return { emoji: "🥉", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
  return { emoji: `${position}.`, color: "bg-muted text-muted-foreground" };
};

export default function BattleArchive() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Export battles to CSV
  const handleExportCSV = () => {
    if (battles.length === 0) {
      toast({
        title: "Žiadne dáta",
        description: "Nemáte žiadne súboje na export.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Názov", "Dátum", "Režim", "Účastníci", "Umiestnenie", "Moje skóre", "Víťazné skóre", "Víťaz"];
    const rows = battles.map(b => [
      b.name,
      format(b.startAt, "d.M.yyyy"),
      getModeLabel(b.mode),
      b.participantCount,
      b.userPosition || "N/A",
      `${b.userScore} ${getScoreUnit(b.mode)}`,
      `${b.totalScore} ${getScoreUnit(b.mode)}`,
      b.winner
    ]);
    
    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `battle-archive-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export úspešný",
      description: `Exportovaných ${battles.length} súbojov do CSV.`,
      variant: "success",
    });
  };

  // Export battles to PDF
  const handleExportPDF = () => {
    if (battles.length === 0) {
      toast({
        title: "Žiadne dáta",
        description: "Nemáte žiadne súboje na export.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("Archív súbojov", 14, 20);
    
    // Subtitle with date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Vygenerované: ${format(new Date(), "d.M.yyyy HH:mm")}`, 14, 28);
    
    // Statistics summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    const wins = battles.filter(b => b.userPosition === 1).length;
    const podiums = battles.filter(b => b.userPosition && b.userPosition <= 3).length;
    doc.text(`Celkom súbojov: ${battles.length}  |  Výhry: ${wins}  |  Pódium: ${podiums}`, 14, 38);
    
    // Table with battles
    const tableData = battles.map(b => [
      b.name.length > 25 ? b.name.substring(0, 22) + "..." : b.name,
      format(new Date(b.startAt), "d.M.yyyy"),
      getModeLabel(b.mode),
      b.participantCount.toString(),
      b.userPosition ? `${b.userPosition}.` : "N/A",
      `${b.userScore} ${getScoreUnit(b.mode)}`,
      b.winner.length > 15 ? b.winner.substring(0, 12) + "..." : b.winner
    ]);
    
    autoTable(doc, {
      startY: 45,
      head: [["Názov", "Dátum", "Režim", "Účast.", "Pozícia", "Skóre", "Víťaz"]],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    
    // Save PDF
    doc.save(`battle-archive-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    
    toast({
      title: "Export úspešný",
      description: `Exportovaných ${battles.length} súbojov do PDF.`,
      variant: "success",
    });
  };

  // Handle rematch - navigate to create with prefilled data
  const handleRematch = (battle: ArchivedBattle) => {
    // Extract participant userIds from results if available
    const participantUserIds = battle.results
      ?.filter(r => r.participant.userId)
      .map(r => r.participant.userId!)
      .filter(id => id !== user?.id) || []; // Exclude current user
    
    // Store rematch data in sessionStorage for battle-create to pick up
    sessionStorage.setItem('rematchData', JSON.stringify({
      mode: battle.mode,
      name: `Revanš: ${battle.name}`,
      participantUserIds: participantUserIds,
    }));
    setLocation("/diary/battles/create");
    toast({
      title: "Revanš",
      description: "Nastavenia súboja boli prekopírované. Upravte podľa potreby.",
    });
  };
  
  // Count active filters for mobile badge
  const activeFilterCount = [
    filterMode !== "all",
    filterResult !== "all"
  ].filter(Boolean).length;
  
  console.log("[BATTLE ARCHIVE MOUNT] Component mounted, user:", user?.id);
  
  // Force refresh archive data on mount to clear stale cache
  useEffect(() => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/archive'] });
      queryClient.removeQueries({ queryKey: ['/api/diary/battles/archive'] });
    }
  }, [user]);
  
  // Fetch archived battles from API with cache busting
  const { data: rawBattles = [], isLoading } = useQuery<ArchivedBattle[]>({
    queryKey: ['/api/diary/battles/archive'],
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
  });
  
  // Debug: Log what we get from API
  useEffect(() => {
    console.log("[BATTLE ARCHIVE] Raw battles from API:", rawBattles);
    console.log("[BATTLE ARCHIVE] Battles length:", rawBattles?.length);
  }, [rawBattles]);

  // Normalize date strings to Date objects
  const battles = useMemo(() => {
    return rawBattles.map(battle => ({
      ...battle,
      startAt: typeof battle.startAt === 'string' ? new Date(battle.startAt) : battle.startAt,
      endAt: typeof battle.endAt === 'string' ? new Date(battle.endAt) : battle.endAt,
    }));
  }, [rawBattles]);

  // Filter battles based on search and filters
  const filteredBattles = useMemo(() => {
    return battles.filter(battle => {
      const matchesSearch = battle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          battle.winner.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMode = filterMode === "all" || battle.mode === filterMode;
      const matchesResult = filterResult === "all" || 
                          (filterResult === "win" && battle.userPosition === 1) ||
                          (filterResult === "podium" && battle.userPosition !== null && battle.userPosition <= 3) ||
                          (filterResult === "participated" && battle.userPosition !== null && battle.userPosition > 3);
      
      return matchesSearch && matchesMode && matchesResult;
    });
  }, [battles, searchTerm, filterMode, filterResult]);

  // Calculate user statistics
  const userStats = useMemo(() => {
    const totalBattles = battles.length;
    const wins = battles.filter(b => b.userPosition === 1).length;
    const podiums = battles.filter(b => b.userPosition !== null && b.userPosition <= 3).length;
    const winRate = totalBattles > 0 ? (wins / totalBattles * 100).toFixed(1) : "0";
    
    return { totalBattles, wins, podiums, winRate };
  }, [battles]);

  // Prepare data for position trend chart (sorted by date, oldest first)
  const positionTrendData = useMemo(() => {
    if (battles.length < 2) return [];
    
    return [...battles]
      .filter(b => b.userPosition !== null)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(-10) // Last 10 battles
      .map((battle, index) => ({
        name: `#${index + 1}`,
        position: battle.userPosition,
        battleName: battle.name,
        date: format(battle.startAt, "d.M.", { locale: sk }),
      }));
  }, [battles]);

  // Debug: Show what we have
  console.log("[BATTLE ARCHIVE DEBUG] isLoading:", isLoading, "rawBattles.length:", rawBattles.length, "user:", user?.id);
  
  // Show loading state
  if (isLoading) {
    return (
      <DiaryLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Načítavam archív battles...</p>
          </div>
        </div>
      </DiaryLayout>
    );
  }
  
  // Debug: Show empty state reason
  if (rawBattles.length === 0) {
    console.log("[BATTLE ARCHIVE DEBUG] Empty battles array! User:", user?.id);
  }

  return (
    <DiaryLayout>
      <div className="space-y-6">
        {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <TacticalIcon icon={Archive} variant="amber" size="lg" showLabel={false} />
                <h1 className="text-3xl font-bold text-foreground">
                  Battle Archív
                </h1>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  PREMIUM
                </Badge>
              </div>
              <Button
                size="lg"
                onClick={() => setLocation("/diary/battles/create")}
                className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                data-testid="button-create-battle"
              >
                <Plus className="w-5 h-5 mr-2" />
                Vytvoriť nový Battle
              </Button>
            </div>
            
            <p className="text-muted-foreground text-lg">
              História všetkých vašich Fishing Battle súbojov a štatistiky
            </p>
          </div>

          {/* Position Trend Chart */}
          {positionTrendData.length >= 2 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Vývoj umiestnení
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={positionTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                      <YAxis 
                        reversed 
                        domain={[1, 'dataMax']} 
                        ticks={[1, 2, 3, 4, 5]}
                        className="text-xs fill-muted-foreground"
                        label={{ value: 'Umiestnenie', angle: -90, position: 'insideLeft', className: 'fill-muted-foreground text-xs' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border rounded-lg p-2 shadow-lg">
                                <p className="font-medium text-foreground">{data.battleName}</p>
                                <p className="text-sm text-muted-foreground">{data.date}</p>
                                <p className="text-sm font-semibold text-primary">{data.position}. miesto</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="position" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Posledných {positionTrendData.length} súbojov (nižšie = lepšie)
                </p>
              </CardContent>
            </Card>
          )}

          {/* User Statistics Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TacticalIconInline icon={BarChart3} variant="orange" size="md" />
                Vaše štatistiky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">{userStats.totalBattles}</div>
                  <div className="text-sm text-muted-foreground">Celkovo súbojov</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">{userStats.wins}</div>
                  <div className="text-sm text-muted-foreground">Víťazstvá</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">{userStats.podiums}</div>
                  <div className="text-sm text-muted-foreground">Pódiové umiestnenia</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">{userStats.winRate}%</div>
                  <div className="text-sm text-muted-foreground">Úspešnosť víťazstiev</div>
                </div>
              </div>
              
              {/* Export Buttons */}
              {battles.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportCSV}
                    data-testid="button-export-csv"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  {/* PDF Export hidden for now - functionality available in handleExportPDF */}
                  {/* <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportPDF}
                    data-testid="button-export-pdf"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button> */}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Vyhľadávanie a filtre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Hľadať podľa názvu súboja alebo víťaza..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    data-testid="input-search-battles"
                  />
                </div>
                
                {/* Mobile Filter Button */}
                <Button 
                  variant="outline" 
                  className="md:hidden"
                  onClick={() => setIsFilterSheetOpen(true)}
                  data-testid="button-open-filters"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtre
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
                
                {/* Desktop Filters */}
                <div className="hidden md:flex gap-4">
                  <Select value={filterMode} onValueChange={setFilterMode}>
                    <SelectTrigger className="w-48" data-testid="select-filter-mode">
                      <SelectValue placeholder="Herný režim" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky režimy</SelectItem>
                      <SelectItem value="most_fish">Najviac rýb</SelectItem>
                      <SelectItem value="total_weight">Celková váha</SelectItem>
                      <SelectItem value="biggest_fish">Najväčšia ryba</SelectItem>
                      <SelectItem value="best_3_fish">Top 3 ryby</SelectItem>
                      <SelectItem value="best_5_fish">Top 5 rýb</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterResult} onValueChange={setFilterResult}>
                    <SelectTrigger className="w-48" data-testid="select-filter-result">
                      <SelectValue placeholder="Výsledok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky výsledky</SelectItem>
                      <SelectItem value="win">Víťazstvá</SelectItem>
                      <SelectItem value="podium">Pódiové umiestnenia</SelectItem>
                      <SelectItem value="participated">Účasť</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Mobile Filter Sheet */}
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filtrovať súboje
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Herný režim</label>
                  <Select value={filterMode} onValueChange={setFilterMode}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Herný režim" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky režimy</SelectItem>
                      <SelectItem value="most_fish">Najviac rýb</SelectItem>
                      <SelectItem value="total_weight">Celková váha</SelectItem>
                      <SelectItem value="biggest_fish">Najväčšia ryba</SelectItem>
                      <SelectItem value="best_3_fish">Top 3 ryby</SelectItem>
                      <SelectItem value="best_5_fish">Top 5 rýb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Výsledok</label>
                  <Select value={filterResult} onValueChange={setFilterResult}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Výsledok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všetky výsledky</SelectItem>
                      <SelectItem value="win">Víťazstvá</SelectItem>
                      <SelectItem value="podium">Pódiové umiestnenia</SelectItem>
                      <SelectItem value="participated">Účasť</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setFilterMode("all");
                      setFilterResult("all");
                    }}
                    data-testid="button-clear-filters"
                  >
                    Vyčistiť
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => setIsFilterSheetOpen(false)}
                    data-testid="button-apply-filters"
                  >
                    Použiť filtre
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Battles List */}
          <div className="space-y-4">
            {filteredBattles.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <TacticalIcon icon={Archive} variant="neutral" size="lg" showLabel={false} />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm || filterMode !== "all" || filterResult !== "all" 
                      ? "Žiadne súboje nevyhovujú filtrom"
                      : "Zatiaľ ste neabsolvovali žiadne súboje"
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterMode !== "all" || filterResult !== "all"
                      ? "Skúste upraviť hľadacie kritériá alebo filtre."
                      : "Vytvorte svoj prvý Fishing Battle a súťažte s kamarátmi!"
                    }
                  </p>
                  {!(searchTerm || filterMode !== "all" || filterResult !== "all") && (
                    <Button 
                      onClick={() => setLocation("/diary/battles/create")}
                      data-testid="button-create-first-battle"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Vytvoriť prvý súboj
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredBattles.map((battle) => {
                const positionBadge = battle.userPosition !== null 
                  ? getPositionBadge(battle.userPosition)
                  : { emoji: "—", color: "bg-muted text-muted-foreground" };
                
                return (
                  <Card key={battle.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Battle Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {battle.name}
                            </h3>
                            {battle.userPosition !== null ? (
                              <Badge 
                                variant="secondary" 
                                className={positionBadge.color}
                              >
                                {positionBadge.emoji} {battle.userPosition}. miesto
                              </Badge>
                            ) : (
                              <Badge 
                                variant="secondary" 
                                className="bg-muted text-muted-foreground"
                              >
                                Bez umiestnenia
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <TacticalIconInline icon={Calendar} variant="indigo" size="sm" />
                              <span>{format(battle.startAt, "d. MMM yyyy", { locale: sk })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TacticalIconInline icon={Trophy} variant="amber" size="sm" />
                              <span>{getModeLabel(battle.mode)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TacticalIconInline icon={Users} variant="orange" size="sm" />
                              <span>{battle.participantCount} účastníkov</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TacticalIconInline icon={Crown} variant="amber" size="sm" />
                              <span>Víťaz: {battle.winner}</span>
                            </div>
                          </div>
                        </div>

                        {/* Battle Stats */}
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-lg font-bold text-foreground">
                              {battle.userScore} {getScoreUnit(battle.mode)}
                            </div>
                            <div className="text-xs text-muted-foreground">Váš výsledok</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-muted-foreground">
                              {battle.totalScore} {getScoreUnit(battle.mode)}
                            </div>
                            <div className="text-xs text-muted-foreground">Víťazný výsledok</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/diary/battles/${battle.id}`)}
                            data-testid={`button-view-battle-${battle.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Zobraziť
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRematch(battle)}
                            data-testid={`button-rematch-battle-${battle.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Revanš
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Create New Battle CTA */}
          {filteredBattles.length > 0 && (
            <Card className="mt-8">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <TacticalIcon icon={Trophy} variant="amber" size="lg" showLabel={false} />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Pripravený na ďalší súboj?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Vyzvite kamarátov na nový Fishing Battle a ukážte, kto je najlepší rybár!
                </p>
                <Button 
                  onClick={() => setLocation("/diary/battles/create")}
                  data-testid="button-create-new-battle"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Vytvoriť nový súboj
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
    </DiaryLayout>
  );
}