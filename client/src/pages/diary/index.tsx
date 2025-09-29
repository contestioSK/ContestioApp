import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fish, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";

// Function to get fish icon based on fish type
const getFishIcon = (fishType?: string) => {
  const iconColor = getFishIconColor(fishType);
  return <Fish className={`w-5 h-5 ${iconColor}`} />;
};

// Function to get fish icon color based on fish type
const getFishIconColor = (fishType?: string) => {
  if (!fishType) return "text-blue-400";
  
  if (fishType.includes("kapor")) return "text-yellow-400";
  if (fishType.includes("stuka")) return "text-green-400";
  if (fishType.includes("sumec")) return "text-purple-400";
  if (fishType.includes("amur")) return "text-emerald-400";
  if (fishType.includes("pstruh")) return "text-pink-400";
  if (fishType.includes("zubac")) return "text-orange-400";
  
  return "text-blue-400"; // default
};

export default function DiaryIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Load all catches for statistics
  const { data: allCatches = [] } = useQuery({
    queryKey: ['/api/diary/catches/all'],
    enabled: !!user?.id
  });

  // Filter catches for 2025 season (January 15, 2025 onwards)
  const season2025Catches = Array.isArray(allCatches) ? allCatches.filter((catch_: any) => {
    if (!catch_.caughtAt) return false;
    const catchDate = new Date(catch_.caughtAt);
    const season2025Start = new Date('2025-01-15');
    return catchDate >= season2025Start;
  }) : [];

  // Calculate statistics from 2025 season catches
  const diaryStats = {
    totalCatches: season2025Catches.length,
    biggestFish: season2025Catches.length > 0 
      ? Math.max(...season2025Catches.map((c: any) => {
          const weight = parseFloat(c.weight || '0');
          return isNaN(weight) ? 0 : weight;
        }))
      : 0,
    mostSuccessfulTechnique: (() => {
      if (season2025Catches.length === 0) return "Žiadna";
      
      // Count technique usage from 2025 season only
      const techniqueCount = season2025Catches.reduce((acc: any, catch_: any) => {
        const technique = catch_.technique || 'Neznáma';
        acc[technique] = (acc[technique] || 0) + 1;
        return acc;
      }, {});
      
      // Find most used technique
      const techniques = Object.entries(techniqueCount);
      if (techniques.length === 0) return 'Neznáma';
      
      const mostUsed = techniques.reduce((a: any, b: any) => 
        a[1] > b[1] ? a : b
      );
      
      return mostUsed[0];
    })()
  };

  return (
    <DiaryLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">
            Môj Denník
          </h1>
          <Button 
            size="lg" 
            onClick={() => setLocation("/diary/catches")}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg font-medium"
            data-testid="button-add-catch"
          >
            <Plus className="w-5 h-5 mr-2" />
            Pridať Úlovok
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card className="bg-slate-700/50 border-slate-600">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-1">Sezóna 2025</div>
              <div className="text-3xl font-bold text-white">{diaryStats.totalCatches} úlovkov</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-700/50 border-slate-600">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-1">Najväčšia Ryba</div>
              <div className="text-3xl font-bold text-white">
                {diaryStats.biggestFish > 0 ? `${diaryStats.biggestFish.toFixed(1)} kg` : '0 kg'}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-700/50 border-slate-600">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-1">Najúspešnejšia Technika</div>
              <div className="text-3xl font-bold text-white">{diaryStats.mostSuccessfulTechnique}</div>
            </CardContent>
          </Card>
        </div>

        {/* Catches Table */}
        <Card className="bg-slate-800/50 border-slate-600 overflow-hidden">
          <CardContent className="p-0">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-5 gap-4 p-4 border-b border-slate-600 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-700/30">
              <div>DRUH RYBY</div>
              <div>VÁHA / DĹŽKA</div>
              <div>REVÍR</div>
              <div>TECHNIKA</div>
              <div>DÁTUM</div>
            </div>
            
            {/* Table Rows */}
            {season2025Catches.length > 0 ? (
              season2025Catches.slice(0, 6).map((catch_: any, index: number) => (
                <div 
                  key={catch_.id || index} 
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/diary/catches`)}
                >
                  {/* Desktop Row */}
                  <div className="hidden md:grid grid-cols-5 gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                        {getFishIcon(catch_.fishType)}
                      </div>
                      <div className="text-white font-medium">
                        {catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Neznámy druh'}
                      </div>
                    </div>
                    
                    <div className="text-white font-semibold">
                      {catch_.weight ? `${catch_.weight} kg` : catch_.length ? `${catch_.length} cm` : 'N/A'}
                    </div>
                    
                    <div className="text-slate-300">
                      {catch_.location || 'Neznáme miesto'}
                    </div>
                    
                    <div className="text-slate-300">
                      {catch_.technique || 'Neznáma'}
                    </div>
                    
                    <div className="text-slate-300">
                      {catch_.caughtAt ? new Date(catch_.caughtAt).toLocaleDateString('sk-SK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : 'N/A'}
                    </div>
                  </div>

                  {/* Mobile Card */}
                  <div className="md:hidden p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-slate-600/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        {getFishIcon(catch_.fishType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium mb-1">
                          {catch_.fishType ? getFishTypeLabel(catch_.fishType) : 'Neznámy druh'}
                        </div>
                        <div className="text-white/80 text-sm mb-2">
                          {catch_.weight ? `${catch_.weight} kg` : catch_.length ? `${catch_.length} cm` : 'N/A'}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                          <div>
                            <span className="text-slate-500">Miesto:</span> {catch_.location || 'N/A'}
                          </div>
                          <div>
                            <span className="text-slate-500">Technika:</span> {catch_.technique || 'N/A'}
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500">Dátum:</span> {catch_.caughtAt ? new Date(catch_.caughtAt).toLocaleDateString('sk-SK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Fish className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Zatiaľ nemáte žiadne úlovky</p>
                <Button 
                  onClick={() => setLocation("/diary/catches")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Pridať prvý úlovok
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DiaryLayout>
  );
}