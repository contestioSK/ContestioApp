import { useState, useMemo, Fragment, useEffect } from "react";
import DiaryLayout from "@/components/DiaryLayout";
import { Search, Shield, Ruler, Clock, AlertCircle, MapPin, Loader2, Scale, Filter, Info } from "lucide-react";
import { TacticalIcon } from "@/components/ui/tactical-icon";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { FishingArea } from "@shared/schema";

// Typy pre karty a tabuľky
type QuickLinkType = "sizes" | "closedSeasons" | "dailyHours" | "fishingAreas";

interface QuickLinkCard {
  id: QuickLinkType;
  icon: React.ElementType;
  title: string;
  shortTitle: string;
}

// Dáta pre karty rýchleho prístupu
const quickLinks: QuickLinkCard[] = [
  { id: "sizes", icon: Ruler, title: "Lovné Miery", shortTitle: "Miery" },
  { id: "closedSeasons", icon: Shield, title: "Doby Hájenia", shortTitle: "Hájenie" },
  { id: "dailyHours", icon: Clock, title: "Denná Doba Lovu", shortTitle: "Časy lovu" },
  { id: "fishingAreas", icon: MapPin, title: "Revíry", shortTitle: "Revíry" }
];

// Statické dáta pre tabuľku "Lovné miery" (2025)
const sizeLimitsData = [
  { fish: "Amur biely", minMax: "60 cm" },
  { fish: "Amur čierny", minMax: "60 cm" },
  { fish: "Boleň dravý", minMax: "40 cm" },
  { fish: "Hlavátka podunajská", minMax: "80 cm" },
  { fish: "Jalec hlavatý", minMax: "25 cm" },
  { fish: "Jalec maloústy", minMax: "20 cm" },
  { fish: "Jalec tmavý", minMax: "30 cm" },
  { fish: "Jeseter malý", minMax: "45 cm" },
  { fish: "Jeseter sibírsky", minMax: "45 cm" },
  { fish: "Kapor rybničný", minMax: "40 cm" },
  { fish: "Lieň sliznatý", minMax: "30 cm" },
  { fish: "Lipeň tymianový", minMax: "33 cm" },
  { fish: "Mieň sladkovodný", minMax: "35 cm" },
  { fish: "Mrena severná", minMax: "40 cm" },
  { fish: "Nosáľ sťahovavý", minMax: "30 cm" },
  { fish: "Pleskáč siný", minMax: "25 cm" },
  { fish: "Pleskáč tuponosý", minMax: "25 cm" },
  { fish: "Pleskáč vysoký", minMax: "30 cm" },
  { fish: "Podustva severná", minMax: "30 cm" },
  { fish: "Pstruh dúhový", minMax: "27 cm" },
  { fish: "Pstruh jazerný", minMax: "50 cm" },
  { fish: "Pstruh potočný", minMax: "27 cm" },
  { fish: "Sih peleď", minMax: "25 cm" },
  { fish: "Sivoň potočný", minMax: "27 cm" },
  { fish: "Sumec veľký", minMax: "70 cm" },
  { fish: "Šťuka severná", minMax: "60 cm" },
  { fish: "Tolstolobik", minMax: "45 cm" },
  { fish: "Úhor európsky", minMax: "50 cm" },
  { fish: "Zubáč veľkoústy", minMax: "50 cm" },
  { fish: "Zubáč volžský", minMax: "35 cm" }
];

// Statické dáta pre tabuľku "Doby hájenia" (2025)
const closedSeasonsData = [
  { fish: "Boleň dravý", from: "15.03.", to: "31.05." },
  { fish: "Hlavátka podunajská", from: "01.01.", to: "31.10." },
  { fish: "Jalec hlavatý", from: "15.03.", to: "31.05." },
  { fish: "Jalec maloústy", from: "15.03.", to: "31.05." },
  { fish: "Jalec tmavý", from: "15.03.", to: "31.05." },
  { fish: "Jeseter malý", from: "15.03.", to: "31.05." },
  { fish: "Jeseter sibírsky", from: "15.03.", to: "31.05." },
  { fish: "Kapor rybničný", from: "15.03.", to: "31.05." },
  { fish: "Lieň sliznatý", from: "15.03.", to: "31.05." },
  { fish: "Lipeň tymianový", from: "01.01.", to: "31.05." },
  { fish: "Mieň sladkovodný", from: "01.01.", to: "15.03." },
  { fish: "Mrena severná", from: "15.03.", to: "15.05." },
  { fish: "Nosáľ sťahovavý", from: "15.03.", to: "31.05." },
  { fish: "Pleskáč siný", from: "15.03.", to: "31.05." },
  { fish: "Pleskáč tuponosý", from: "15.03.", to: "31.05." },
  { fish: "Pleskáč vysoký", from: "15.03.", to: "31.05." },
  { fish: "Ploska pásavá", from: "01.01.", to: "31.05." },
  { fish: "Podustva severná", from: "15.03.", to: "31.05." },
  { fish: "Pstruh jazerný", from: "01.09.", to: "15.04." },
  { fish: "Pstruh potočný", from: "01.09.", to: "15.04." },
  { fish: "Sih peleď", from: "01.09.", to: "28.02." },
  { fish: "Sumec veľký", from: "01.01.", to: "15.06." },
  { fish: "Šťuka severná", from: "01.01.", to: "31.05." },
  { fish: "Zubáč veľkoústy", from: "01.01.", to: "15.06." },
  { fish: "Zubáč volžský", from: "01.01.", to: "15.06." }
];

// Statické dáta pre tabuľku "Denná doba lovu" (2025)
const dailyHoursData = [
  { month: "Január", carpWaters: "06:00 - 21:00", troutWaters: "07:00 - 17:00" },
  { month: "Február", carpWaters: "06:00 - 21:00", troutWaters: "07:00 - 17:00" },
  { month: "Marec", carpWaters: "06:00 - 21:00", troutWaters: "07:00 - 17:00" },
  { month: "Apríl", carpWaters: "06:00 - 21:00", troutWaters: "07:00 - 17:00" },
  { month: "Máj", carpWaters: "04:00 - 24:00", troutWaters: "05:00 - 21:00" },
  { month: "Jún", carpWaters: "00:00 - 24:00", troutWaters: "05:00 - 21:00" },
  { month: "Júl", carpWaters: "00:00 - 24:00", troutWaters: "05:00 - 21:00" },
  { month: "August", carpWaters: "00:00 - 24:00", troutWaters: "06:00 - 20:00" },
  { month: "September", carpWaters: "00:00 - 24:00", troutWaters: "07:00 - 19:00" },
  { month: "Október", carpWaters: "00:00 - 24:00", troutWaters: "07:00 - 19:00" },
  { month: "November", carpWaters: "06:00 - 21:00", troutWaters: "07:00 - 17:00" },
  { month: "December", carpWaters: "06:00 - 21:00", troutWaters: "07:00 - 17:00" }
];

// --- SIGNAL COMPONENT (Sonar Pulse) ---
function Signal({ variant = "blue" }: { variant?: "blue" | "red" }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
        variant === "red" ? "bg-red-500" : "bg-blue-400"
      }`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${
        variant === "red" ? "bg-red-600" : "bg-blue-500"
      }`} />
    </span>
  );
}

// Helper: Check if fish is currently protected (in closed season)
function isCurrentlyProtected(fromStr: string, toStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  
  const fromParts = fromStr.split('.').filter(p => p.length > 0);
  const toParts = toStr.split('.').filter(p => p.length > 0);
  
  const fromDay = parseInt(fromParts[0], 10);
  const fromMonth = parseInt(fromParts[1], 10);
  const toDay = parseInt(toParts[0], 10);
  const toMonth = parseInt(toParts[1], 10);
  
  if (isNaN(fromDay) || isNaN(fromMonth) || isNaN(toDay) || isNaN(toMonth)) {
    return false;
  }
  
  const fromDate = new Date(currentYear, fromMonth - 1, fromDay);
  const toDate = new Date(currentYear, toMonth - 1, toDay);
  
  if (toDate < fromDate) {
    return today >= fromDate || today <= toDate;
  }
  
  return today >= fromDate && today <= toDate;
}

// Helper: Highlight search query in text
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-blue-500/30 text-blue-200 dark:text-blue-300 rounded-sm px-0.5 font-semibold">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

// --- LEGAL DISCLAIMER COMPONENT ---
function LegalDisclaimer() {
  return (
    <div className="mt-8 p-4 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            Právne upozornenie
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Tieto údaje sú informatívneho charakteru. Pred lovom si vždy overte aktuálne platné pravidlá 
            na stránkach Slovenského rybárskeho zväzu. Niektoré revíry môžu mať odlišné miestne predpisy 
            a výnimky. Za dodržiavanie pravidiel zodpovedá každý rybár individuálne.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- EMPTY STATE COMPONENT ---
function EmptyState({ query, type }: { query: string; type: "search" | "areas" }) {
  if (type === "areas") {
    return (
      <div className="py-16 text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800">
          <MapPin className="text-slate-400 dark:text-slate-600" size={36} strokeWidth={1.25} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground tracking-tight">Vyhľadať revír</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Zadajte číslo alebo názov revíru (min. 2 znaky).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 text-center space-y-4">
      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800">
        <Filter size={24} strokeWidth={1.5} className="text-slate-400 dark:text-slate-600" />
      </div>
      <div className="space-y-1">
        <p className="text-foreground font-semibold tracking-tight">Nenašli sa výsledky pre "{query}"</p>
        <p className="text-xs text-muted-foreground font-medium">Skúste skrátený tvar (napr. "kapor").</p>
      </div>
    </div>
  );
}

export default function FishingRulesPage() {
  const isMobile = useIsMobile();
  
  // State with localStorage persistence
  const [activeSection, setActiveSection] = useState<QuickLinkType>(() => {
    try {
      const saved = localStorage.getItem('contestio_active_fishing_tab');
      return (saved as QuickLinkType) || "sizes";
    } catch {
      return "sizes";
    }
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [areasSearchQuery, setAreasSearchQuery] = useState("");

  // Persist activeSection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('contestio_active_fishing_tab', activeSection);
    } catch {
      // Ignore localStorage errors
    }
  }, [activeSection]);

  // Reset search when changing tabs (except for fishingAreas)
  useEffect(() => {
    if (activeSection !== "fishingAreas") {
      setSearchQuery("");
    }
  }, [activeSection]);

  // Fetch fishing areas when on that tab with search
  const { data: fishingAreasData, isLoading: isLoadingAreas } = useQuery<FishingArea[]>({
    queryKey: ['/api/fishing-areas', { search: areasSearchQuery }],
    queryFn: async () => {
      const response = await fetch(`/api/fishing-areas?search=${encodeURIComponent(areasSearchQuery)}`);
      if (!response.ok) throw new Error('Failed to fetch fishing areas');
      return response.json();
    },
    enabled: activeSection === "fishingAreas" && areasSearchQuery.length >= 2,
  });

  // Filter function for search
  const filterData = <T extends Record<string, any>>(data: T[]): T[] => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(query)
      )
    );
  };
  
  // Memoized list of currently protected fish
  const protectedFishSet = useMemo(() => {
    const set = new Set<string>();
    closedSeasonsData.forEach(row => {
      if (isCurrentlyProtected(row.from, row.to)) {
        set.add(row.fish);
      }
    });
    return set;
  }, []);

  const renderTable = () => {
    switch (activeSection) {
      case "sizes": {
        const filteredSizeLimits = filterData(sizeLimitsData);
        
        if (searchQuery && filteredSizeLimits.length === 0) {
          return <EmptyState query={searchQuery} type="search" />;
        }
        
        // Mobile Card View
        if (isMobile) {
          return (
            <div className="space-y-3">
              {filteredSizeLimits.map((row, index) => (
                <Card key={index} className="p-5 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800" data-testid={`card-size-limit-${index}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <TacticalIcon icon={Ruler} variant="neutral" size="sm" showLabel={false} />
                      <div>
                        <p className="text-sm font-semibold text-foreground tracking-tight" data-testid={`text-fish-${index}`}>
                          <HighlightText text={row.fish} query={searchQuery} />
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                          Minimálna lovná miera
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-mono font-medium text-[#28C6CE] tracking-tight" data-testid={`text-size-${index}`}>
                      {row.minMax}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          );
        }
        
        // Desktop Table View
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Druh Ryby
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Minimálna lovná miera
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSizeLimits.map((row, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                    data-testid={`row-size-limit-${index}`}
                  >
                    <td className="px-6 py-4 text-sm text-foreground font-semibold" data-testid={`text-fish-${index}`}>
                      <HighlightText text={row.fish} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-medium text-[#28C6CE]" data-testid={`text-size-${index}`}>
                        {row.minMax}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case "closedSeasons": {
        const filteredClosedSeasons = filterData(closedSeasonsData);
        
        if (searchQuery && filteredClosedSeasons.length === 0) {
          return <EmptyState query={searchQuery} type="search" />;
        }
        
        // Mobile Card View
        if (isMobile) {
          return (
            <div className="space-y-3">
              {filteredClosedSeasons.map((row, index) => {
                const isProtected = protectedFishSet.has(row.fish);
                return (
                  <Card 
                    key={index} 
                    className={`relative p-5 transition-all duration-300 ${
                      isProtected 
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' 
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                    }`}
                    data-testid={`card-closed-season-${index}`}
                  >
                    {isProtected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500 animate-pulse rounded-l-xl" />
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <TacticalIcon icon={Shield} variant={isProtected ? "danger" : "neutral"} size="sm" showLabel={false} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground tracking-tight" data-testid={`text-season-fish-${index}`}>
                              <HighlightText text={row.fish} query={searchQuery} />
                            </p>
                            {isProtected && <Signal variant="red" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground font-medium">{row.from} — {row.to}</span>
                            {isProtected && (
                              <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-widest" data-testid={`badge-protected-${index}`}>
                                Hájená
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        }
        
        // Desktop Table View
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Druh Ryby
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Doba hájenia
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Stav
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClosedSeasons.map((row, index) => {
                  const isProtected = protectedFishSet.has(row.fish);
                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                        isProtected ? 'bg-red-50/50 dark:bg-red-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'
                      }`}
                      data-testid={`row-closed-season-${index}`}
                    >
                      <td className="px-6 py-4 text-sm text-foreground font-semibold" data-testid={`text-season-fish-${index}`}>
                        <HighlightText text={row.fish} query={searchQuery} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-muted-foreground" data-testid={`text-season-dates-${index}`}>
                          {row.from} — {row.to}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isProtected ? (
                          <div className="flex items-center justify-end gap-2">
                            <Signal variant="red" />
                            <span className="text-red-600 dark:text-red-400 font-medium text-sm">Hájená</span>
                          </div>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">Možno loviť</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      case "dailyHours": {
        const filteredDailyHours = filterData(dailyHoursData);
        const currentMonth = new Date().toLocaleDateString('sk-SK', { month: 'long' });
        const currentMonthCapitalized = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
        
        if (searchQuery && filteredDailyHours.length === 0) {
          return <EmptyState query={searchQuery} type="search" />;
        }
        
        // Mobile Card View
        if (isMobile) {
          return (
            <div className="space-y-3">
              {filteredDailyHours.map((row, index) => {
                const isCurrentMonth = row.month === currentMonthCapitalized;
                return (
                  <Card 
                    key={index} 
                    className={`p-5 space-y-4 ${
                      isCurrentMonth 
                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50' 
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                    }`}
                    data-testid={`card-daily-hours-${index}`}
                  >
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                      <h3 className="font-bold text-foreground text-lg" data-testid={`text-month-${index}`}>
                        <HighlightText text={row.month} query={searchQuery} />
                      </h3>
                      {isCurrentMonth && (
                        <div className="flex items-center gap-2">
                          <Signal variant="blue" />
                          <Badge className="text-[10px] font-bold uppercase tracking-widest">Aktuálny</Badge>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Kaprové</p>
                        <p className="text-sm font-mono font-medium text-[#28C6CE]" data-testid={`text-carp-hours-${index}`}>
                          {row.carpWaters}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Pstruhové</p>
                        <p className="text-sm font-mono font-medium text-[#28C6CE]" data-testid={`text-trout-hours-${index}`}>
                          {row.troutWaters}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        }
        
        // Desktop Table View
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Mesiac
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Kaprové Vody
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Pstruhové Vody
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDailyHours.map((row, index) => {
                  const isCurrentMonth = row.month === currentMonthCapitalized;
                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                        isCurrentMonth ? 'bg-blue-50/50 dark:bg-blue-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'
                      }`}
                      data-testid={`row-daily-hours-${index}`}
                    >
                      <td className="px-6 py-4 text-sm text-foreground font-semibold" data-testid={`text-month-${index}`}>
                        <div className="flex items-center gap-2">
                          <HighlightText text={row.month} query={searchQuery} />
                          {isCurrentMonth && (
                            <div className="flex items-center gap-1.5">
                              <Signal variant="blue" />
                              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">Aktuálny</Badge>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-[#28C6CE]" data-testid={`text-carp-hours-${index}`}>
                          {row.carpWaters}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-[#28C6CE]" data-testid={`text-trout-hours-${index}`}>
                          {row.troutWaters}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }

      case "fishingAreas": {
        if (areasSearchQuery.length < 2) {
          return <EmptyState query="" type="areas" />;
        }
        
        if (isLoadingAreas) {
          return (
            <div className="py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-[#28C6CE] mx-auto" />
              <p className="text-muted-foreground mt-4 font-medium uppercase tracking-widest text-[10px]">
                Prehľadávam databázu...
              </p>
            </div>
          );
        }

        const areas = fishingAreasData || [];
        
        if (areas.length === 0) {
          return (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800">
                <AlertCircle size={24} strokeWidth={1.5} className="text-slate-400 dark:text-slate-600" />
              </div>
              <div className="space-y-1">
                <p className="text-foreground font-semibold tracking-tight">Žiadne výsledky</p>
                <p className="text-xs text-muted-foreground font-medium">
                  Pre "{areasSearchQuery}" sme nenašli žiadne revíry.
                </p>
              </div>
            </div>
          );
        }

        // Mobile Card View
        if (isMobile) {
          return (
            <div className="space-y-3">
              {areas.map((area, index) => (
                <Card 
                  key={area.id} 
                  className="p-5 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                  data-testid={`card-fishing-area-${index}`}
                >
                  <div className="space-y-2">
                    <Badge variant="outline" className="font-mono text-xs" data-testid={`text-area-number-${index}`}>
                      {area.number}
                    </Badge>
                    <h4 className="font-semibold text-foreground" data-testid={`text-area-name-${index}`}>
                      <HighlightText text={area.name} query={areasSearchQuery} />
                    </h4>
                    {area.notes && (
                      <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-area-notes-${index}`}>
                        <HighlightText text={area.notes} query={areasSearchQuery} />
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          );
        }
        
        // Desktop Table View
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground w-32">
                    Číslo
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground w-64">
                    Názov
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Poznámky
                  </th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area, index) => (
                  <tr 
                    key={area.id} 
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                    data-testid={`row-fishing-area-${index}`}
                  >
                    <td className="px-4 py-4 text-sm font-mono font-medium text-[#28C6CE]" data-testid={`text-area-number-${index}`}>
                      <HighlightText text={area.number} query={areasSearchQuery} />
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground font-semibold" data-testid={`text-area-name-${index}`}>
                      <HighlightText text={area.name} query={areasSearchQuery} />
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground" data-testid={`text-area-notes-${index}`}>
                      {area.notes ? (
                        <HighlightText text={area.notes} query={areasSearchQuery} />
                      ) : (
                        <span className="italic">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <DiaryLayout>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-16 bg-[#28C6CE]"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#28C6CE]">Pravidlá</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <TacticalIcon icon={Scale} variant="orange" size="lg" showLabel={false} />
                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">Rybársky Poriadok</h1>
                <Signal variant="blue" />
              </div>
              <p className="text-sm font-medium text-muted-foreground italic tracking-tight pl-0.5">
                Interaktívna databáza rybárskych pravidiel SR 2025
              </p>
            </div>
          </div>
        </header>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
          <Input
            type="text"
            placeholder={activeSection === "fishingAreas" 
              ? "Vyhľadať revír podľa čísla, názvu alebo poznámky..." 
              : "Vyhľadať pravidlo alebo druh ryby..."}
            value={activeSection === "fishingAreas" ? areasSearchQuery : searchQuery}
            onChange={(e) => activeSection === "fishingAreas" 
              ? setAreasSearchQuery(e.target.value)
              : setSearchQuery(e.target.value)
            }
            className="pl-12 h-14 text-lg bg-background border-slate-200 dark:border-slate-800 rounded-xl"
            data-testid="input-search-rules"
          />
        </div>

        {/* Navigation Grid: 2x2 mobile, 4x1 desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeSection === link.id;

            return (
              <button
                key={link.id}
                onClick={() => setActiveSection(link.id)}
                className={`
                  p-4 md:p-5 rounded-xl border transition-all duration-200 text-left
                  ${isActive 
                    ? 'bg-blue-500/10 border-blue-500/30 dark:bg-blue-950/30 dark:border-blue-800' 
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }
                `}
                data-testid={`card-${link.id}`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`
                    p-3 rounded-xl
                    ${isActive 
                      ? 'bg-blue-500/20 dark:bg-blue-500/10' 
                      : 'bg-slate-100 dark:bg-slate-800'
                    }
                  `}>
                    <Icon className={`
                      h-6 w-6
                      ${isActive 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-slate-500 dark:text-slate-400'
                      }
                    `} strokeWidth={1.75} />
                  </div>
                  <h3 className={`
                    text-sm font-semibold
                    ${isActive 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-foreground'
                    }
                  `}>
                    {isMobile ? link.shortTitle : link.title}
                  </h3>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {quickLinks.find(link => link.id === activeSection)?.title}
            </h2>
            {renderTable()}
          </div>
        </Card>

        {/* Legal Disclaimer */}
        <LegalDisclaimer />
      </div>
    </DiaryLayout>
  );
}
