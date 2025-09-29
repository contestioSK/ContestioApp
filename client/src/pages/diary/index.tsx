import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fish, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";

export default function DiaryIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Load all catches for statistics
  const { data: allCatches = [] } = useQuery({
    queryKey: ['/api/diary/catches/all'],
    enabled: !!user?.id
  });

  // Calculate statistics from catches
  const diaryStats = {
    totalCatches: Array.isArray(allCatches) ? allCatches.length : 0,
    biggestFish: Array.isArray(allCatches) && allCatches.length > 0 
      ? Math.max(...allCatches.map((c: any) => parseFloat(c.weight || '0')))
      : 0,
    mostSuccessfulTechnique: "Položená"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <Card className="bg-slate-800/50 border-slate-600">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 p-4 border-b border-slate-600 text-sm font-medium text-slate-400 uppercase tracking-wide">
              <div>DRUH RYBY</div>
              <div>VÁHA / DĹŽKA</div>
              <div>REVÍR</div>
              <div>TECHNIKA</div>
              <div>DÁTUM</div>
            </div>
            
            {/* Table Rows */}
            {Array.isArray(allCatches) && allCatches.length > 0 ? (
              allCatches.slice(0, 6).map((catch_: any, index: number) => (
                <div 
                  key={catch_.id || index} 
                  className="grid grid-cols-5 gap-4 p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/diary/catches`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                      <Fish className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-white font-medium">
                      {catch_.fishType || 'Neznámy druh'}
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