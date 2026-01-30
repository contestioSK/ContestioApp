import { useState, useMemo, Fragment } from "react";
import DiaryLayout from "@/components/DiaryLayout";
import { Search, Shield, Ruler, Clock, AlertCircle, MapPin, Loader2, Scale } from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
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
}

// Dáta pre karty rýchleho prístupu
const quickLinks: QuickLinkCard[] = [
  {
    id: "sizes",
    icon: Ruler,
    title: "Lovné Miery"
  },
  {
    id: "closedSeasons",
    icon: Shield,
    title: "Doby Hájenia"
  },
  {
    id: "dailyHours",
    icon: Clock,
    title: "Denná Doba Lovu"
  },
  {
    id: "fishingAreas",
    icon: MapPin,
    title: "Revíry"
  }
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

// Helper: Check if fish is currently protected (in closed season)
function isCurrentlyProtected(fromStr: string, toStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  const currentYear = today.getFullYear();
  
  // Parse dates (format: "DD.MM." - e.g., "15.03.")
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
  
  // Handle year wraparound (e.g., 01.09. to 15.04.)
  if (toDate < fromDate) {
    // Season spans across year boundary - check if today is in either part
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
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded font-semibold">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

export default function FishingRulesPage() {
  const [activeSection, setActiveSection] = useState<QuickLinkType>("sizes");
  const [searchQuery, setSearchQuery] = useState("");
  const [areasSearchQuery, setAreasSearchQuery] = useState("");
  const isMobile = useIsMobile();

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
        
        // Mobile Card View
        if (isMobile) {
          return (
            <div className="space-y-3">
              {filteredSizeLimits.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenašli sa žiadne výsledky
                </div>
              ) : (
                filteredSizeLimits.map((row, index) => (
                  <Card key={index} className="p-4 bg-muted/30" data-testid={`card-size-limit-${index}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground" data-testid={`text-fish-${index}`}>
                          <HighlightText text={row.fish} query={searchQuery} />
                        </h4>
                        <div className="mt-2 flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
                          <span className="text-sm font-mono font-medium text-[#F97316]" data-testid={`text-size-${index}`}>
                            <HighlightText text={row.minMax} query={searchQuery} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          );
        }
        
        // Desktop Table View
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sidebar border-b border-sidebar-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Druh Ryby
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Minimálna lovná miera
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSizeLimits.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">
                      Nenašli sa žiadne výsledky
                    </td>
                  </tr>
                ) : (
                  filteredSizeLimits.map((row, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-border hover:bg-sidebar-accent transition-colors"
                    data-testid={`row-size-limit-${index}`}
                  >
                    <td className="px-6 py-4 text-sm text-foreground font-medium" data-testid={`text-fish-${index}`}>
                      <HighlightText text={row.fish} query={searchQuery} />
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-size-${index}`}>
                      <HighlightText text={row.minMax} query={searchQuery} />
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      }

      case "closedSeasons": {
        const filteredClosedSeasons = filterData(closedSeasonsData);
        
        // Mobile Card View
        if (isMobile) {
          return (
            <div className="space-y-3">
              {filteredClosedSeasons.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenašli sa žiadne výsledky
                </div>
              ) : (
                filteredClosedSeasons.map((row, index) => {
                  const isProtected = protectedFishSet.has(row.fish);
                  return (
                    <Card 
                      key={index} 
                      className={`p-4 ${isProtected ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' : 'bg-muted/30'}`}
                      data-testid={`card-closed-season-${index}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground" data-testid={`text-season-fish-${index}`}>
                              <HighlightText text={row.fish} query={searchQuery} />
                            </h4>
                            {isProtected && (
                              <Badge variant="destructive" className="text-xs gap-1" data-testid={`badge-protected-${index}`}>
                                <AlertCircle className="h-3 w-3" />
                                Hájená
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Od:</span>
                              <span className="text-foreground font-medium" data-testid={`text-season-from-${index}`}>
                                <HighlightText text={row.from} query={searchQuery} />
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Do:</span>
                              <span className="text-foreground font-medium" data-testid={`text-season-to-${index}`}>
                                <HighlightText text={row.to} query={searchQuery} />
                              </span>
                            </div>
                          </div>
                        </div>
                        {isProtected && (
                          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shrink-0 mt-1" aria-label="Aktuálne hájená" />
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          );
        }
        
        // Desktop Table View
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sidebar border-b border-sidebar-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Druh Ryby
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Od
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Do
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Stav
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClosedSeasons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      Nenašli sa žiadne výsledky
                    </td>
                  </tr>
                ) : (
                  filteredClosedSeasons.map((row, index) => {
                    const isProtected = protectedFishSet.has(row.fish);
                    return (
                      <tr 
                        key={index} 
                        className={`border-b border-border hover:bg-sidebar-accent transition-colors ${isProtected ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}
                        data-testid={`row-closed-season-${index}`}
                      >
                        <td className="px-6 py-4 text-sm text-foreground font-medium" data-testid={`text-season-fish-${index}`}>
                          <HighlightText text={row.fish} query={searchQuery} />
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-season-from-${index}`}>
                          <HighlightText text={row.from} query={searchQuery} />
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-season-to-${index}`}>
                          <HighlightText text={row.to} query={searchQuery} />
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isProtected ? (
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-red-600 dark:text-red-400 font-medium">Hájená</span>
                            </div>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">Možno loviť</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      }

      case "dailyHours": {
        const filteredDailyHours = filterData(dailyHoursData);
        const currentMonth = new Date().toLocaleDateString('sk-SK', { month: 'long' });
        const currentMonthCapitalized = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
        
        // Mobile Card View
        if (isMobile) {
          return (
            <div className="space-y-3">
              {filteredDailyHours.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenašli sa žiadne výsledky
                </div>
              ) : (
                filteredDailyHours.map((row, index) => {
                  const isCurrentMonth = row.month === currentMonthCapitalized;
                  return (
                    <Card 
                      key={index} 
                      className={`p-4 ${isCurrentMonth ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20' : 'bg-muted/30'}`}
                      data-testid={`card-daily-hours-${index}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground" data-testid={`text-month-${index}`}>
                              <HighlightText text={row.month} query={searchQuery} />
                            </h4>
                            {isCurrentMonth && (
                              <Badge variant="default" className="text-xs">Aktuálny</Badge>
                            )}
                          </div>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Kaprové vody:</span>
                              <span className="text-foreground font-medium" data-testid={`text-carp-hours-${index}`}>
                                <HighlightText text={row.carpWaters} query={searchQuery} />
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Pstruhové vody:</span>
                              <span className="text-foreground font-medium" data-testid={`text-trout-hours-${index}`}>
                                <HighlightText text={row.troutWaters} query={searchQuery} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          );
        }
        
        // Desktop Table View
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sidebar border-b border-sidebar-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Mesiac
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Kaprové Vody
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Pstruhové Vody
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDailyHours.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                      Nenašli sa žiadne výsledky
                    </td>
                  </tr>
                ) : (
                  filteredDailyHours.map((row, index) => {
                    const isCurrentMonth = row.month === currentMonthCapitalized;
                    return (
                      <tr 
                        key={index} 
                        className={`border-b border-border hover:bg-sidebar-accent transition-colors ${isCurrentMonth ? 'bg-primary/5' : ''}`}
                        data-testid={`row-daily-hours-${index}`}
                      >
                        <td className="px-6 py-4 text-sm text-foreground font-medium" data-testid={`text-month-${index}`}>
                          <div className="flex items-center gap-2">
                            <HighlightText text={row.month} query={searchQuery} />
                            {isCurrentMonth && (
                              <Badge variant="secondary" className="text-xs">Aktuálny</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-carp-hours-${index}`}>
                          <HighlightText text={row.carpWaters} query={searchQuery} />
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground" data-testid={`text-trout-hours-${index}`}>
                          <HighlightText text={row.troutWaters} query={searchQuery} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      }

      case "fishingAreas": {
        // Show instructions when no search
        if (areasSearchQuery.length < 2) {
          return (
            <div className="text-center py-12">
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Vyhľadajte rybársky revír</h3>
              <p className="text-muted-foreground mb-4">
                Zadajte aspoň 2 znaky do vyhľadávacieho poľa vyššie
              </p>
              <p className="text-sm text-muted-foreground">
                Môžete hľadať podľa čísla revíru (napr. 1-0020-1-1), názvu alebo kľúčových slov v poznámkach
              </p>
            </div>
          );
        }
        
        if (isLoadingAreas) {
          return (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Načítavam revíry...</span>
            </div>
          );
        }

        const areas = fishingAreasData || [];
        
        if (areas.length === 0) {
          return (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Žiadne výsledky</h3>
              <p className="text-muted-foreground">
                Pre "{areasSearchQuery}" sme nenašli žiadne revíry
              </p>
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
                  className="p-4 bg-muted/30"
                  data-testid={`card-fishing-area-${index}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="font-mono text-xs shrink-0" data-testid={`text-area-number-${index}`}>
                        {area.number}
                      </Badge>
                    </div>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sidebar border-b border-sidebar-border">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-sidebar-foreground w-32">
                    Číslo
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-sidebar-foreground w-64">
                    Názov
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-sidebar-foreground">
                    Poznámky
                  </th>
                </tr>
              </thead>
              <tbody>
                {areas.map((area, index) => (
                  <tr 
                    key={area.id} 
                    className="border-b border-border hover:bg-sidebar-accent transition-colors"
                    data-testid={`row-fishing-area-${index}`}
                  >
                    <td className="px-4 py-4 text-sm font-mono text-foreground" data-testid={`text-area-number-${index}`}>
                      <HighlightText text={area.number} query={areasSearchQuery} />
                    </td>
                    <td className="px-4 py-4 text-sm text-foreground font-medium" data-testid={`text-area-name-${index}`}>
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
          {/* Hlavička */}
          <div className="flex items-center gap-4">
            <TacticalIcon icon={Scale} variant="active" size="lg" showLabel={false} />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Rybársky Poriadok
              </h1>
              <p className="text-muted-foreground text-lg">
                Interaktívna databáza rybárskych pravidiel a predpisov
              </p>
            </div>
          </div>

          {/* Vyhľadávacie pole */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
            className="pl-12 h-14 text-lg bg-background border-border"
            data-testid="input-search-rules"
          />
        </div>

        {/* Karty pre rýchly prístup */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeSection === link.id;

            return (
              <Card
                key={link.id}
                onClick={() => setActiveSection(link.id)}
                className={`
                  p-6 cursor-pointer transition-all duration-200
                  ${isActive 
                    ? 'bg-sidebar-primary border-sidebar-primary shadow-lg' 
                    : 'bg-card border-border hover:border-sidebar-primary hover:shadow-md'
                  }
                `}
                data-testid={`card-${link.id}`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`
                    p-4 rounded-full
                    ${isActive 
                      ? 'bg-sidebar-primary-foreground/10' 
                      : 'bg-sidebar-accent'
                    }
                  `}>
                    <Icon className={`
                      h-8 w-8
                      ${isActive 
                        ? 'text-sidebar-primary-foreground' 
                        : 'text-sidebar-primary'
                      }
                    `} />
                  </div>
                  <h3 className={`
                    text-lg font-semibold
                    ${isActive 
                      ? 'text-sidebar-primary-foreground' 
                      : 'text-foreground'
                    }
                  `}>
                    {link.title}
                  </h3>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Oblasť pre zobrazenie obsahu */}
        <Card className="bg-card border-border">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {quickLinks.find(link => link.id === activeSection)?.title}
            </h2>
            {renderTable()}
          </div>
        </Card>
        </div>
    </DiaryLayout>
  );
}
