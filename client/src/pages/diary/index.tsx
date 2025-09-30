import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Fish, Plus, X, Calendar, MapPin, Target, Ruler, Weight, Swords, Trophy, Crown, Play } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DiaryLayout from "@/components/DiaryLayout";
import { getFishTypeLabel } from "@/utils/fishTypeMapping";
import { useState } from "react";

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

// Quick start fishing form schema
const quickStartSchema = z.object({
  location: z.string().min(1, "Lokalita je povinná"),
  notes: z.string().optional(),
});

type QuickStartFormData = z.infer<typeof quickStartSchema>;

export default function DiaryIndex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCatch, setSelectedCatch] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isStartFishingOpen, setIsStartFishingOpen] = useState(false);
  const { toast } = useToast();

  // Load all catches for statistics
  const { data: allCatches = [] } = useQuery({
    queryKey: ['/api/diary/catches/all'],
    enabled: !!user?.id
  });

  // Check premium status
  const { data: premiumStatus, isLoading: premiumLoading } = useQuery<{ isPremium: boolean }>({
    queryKey: ["/api/auth/premium-status"],
    enabled: !!user?.id
  });

  const isPremium = premiumStatus?.isPremium || false;

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

  // Quick start fishing form
  const quickStartForm = useForm<QuickStartFormData>({
    resolver: zodResolver(quickStartSchema),
    defaultValues: {
      location: "",
      notes: "",
    }
  });

  // Create quick trip mutation
  const createQuickTripMutation = useMutation({
    mutationFn: async (data: QuickStartFormData) => {
      const today = new Date();
      const tripData = {
        name: `Rybačka ${today.toLocaleDateString('sk-SK')}`,
        startDate: today.toISOString(),
        endDate: today.toISOString(), // Single day trip
        location: data.location,
        notes: data.notes || "",
        visibility: "private" as const,
        participants: []
      };
      const response = await apiRequest("POST", "/api/diary/trips", tripData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diary/trips"] });
      setIsStartFishingOpen(false);
      quickStartForm.reset();
      toast({
        title: "Rybačka začatá!",
        description: "Teraz môžete pridávať úlovky.",
      });
      // Redirect to catches page to add first catch
      setLocation("/diary/catches");
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa začať rybačku",
        variant: "destructive",
      });
    }
  });

  const handleQuickStart = (data: QuickStartFormData) => {
    createQuickTripMutation.mutate(data);
  };

  return (
    <DiaryLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">
            Môj rybársky denník
          </h1>
          <div className="flex gap-3">
            <Button 
              size="lg" 
              onClick={() => setIsStartFishingOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg font-medium"
              data-testid="button-start-fishing"
            >
              <Play className="w-5 h-5 mr-2" />
              Začať rybačku
            </Button>
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
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card className="bg-slate-700/50 border-slate-600" data-testid="card-season-catches">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-1">Sezóna 2025</div>
              <div className="text-3xl font-bold text-white" data-testid="text-total-catches">{diaryStats.totalCatches} úlovkov</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-700/50 border-slate-600" data-testid="card-biggest-fish">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-1">Najväčšia Ryba</div>
              <div className="text-3xl font-bold text-white" data-testid="text-biggest-fish">
                {diaryStats.biggestFish > 0 ? `${diaryStats.biggestFish.toFixed(1)} kg` : '0 kg'}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-700/50 border-slate-600" data-testid="card-best-technique">
            <CardContent className="p-6">
              <div className="text-sm text-slate-400 mb-1">Najúspešnejšia Technika</div>
              <div className="text-3xl font-bold text-white" data-testid="text-best-technique">{diaryStats.mostSuccessfulTechnique}</div>
            </CardContent>
          </Card>
        </div>

        {/* Fishing Battle CTA */}
        <Card className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-600/30 mb-8" data-testid="card-battle-cta">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Swords className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">Fishing Battle</h3>
                    {!isPremium && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-slate-300 text-sm">
                    Súťažte s karamátmi v priatelských rybárskych dueloch!
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {isPremium ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/diary/battle/archive")}
                      className="border-yellow-600/50 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-100"
                      data-testid="button-battle-archive"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Archív
                    </Button>
                    <Button
                      onClick={() => setLocation("/diary/battle/create")}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      data-testid="button-create-battle-cta"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Vytvoriť Battle
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setLocation("/diary/battle/paywall")}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    data-testid="button-unlock-battle"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Odomknúť PREMIUM
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                  onClick={() => setSelectedCatch(catch_)}
                  data-testid={`catch-row-${catch_.id || index}`}
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

        {/* Detail Panel */}
        <Sheet open={!!selectedCatch} onOpenChange={() => setSelectedCatch(null)}>
          <SheetContent className="w-full sm:max-w-md bg-slate-800 border-slate-600 text-white overflow-y-auto" data-testid="catch-detail-panel">
            <SheetHeader className="pb-6">
              <SheetTitle className="text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                  {getFishIcon(selectedCatch?.fishType)}
                </div>
                {selectedCatch?.fishType ? getFishTypeLabel(selectedCatch.fishType) : 'Detail úlovku'}
              </SheetTitle>
            </SheetHeader>

            {selectedCatch && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Weight className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-400">Váha</div>
                      <div className="font-semibold" data-testid="detail-weight">{selectedCatch.weight ? `${selectedCatch.weight} kg` : 'Neuvedené'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Ruler className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-400">Dĺžka</div>
                      <div className="font-semibold">{selectedCatch.length ? `${selectedCatch.length} cm` : 'Neuvedené'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-400">Miesto</div>
                      <div className="font-semibold">{selectedCatch.location || 'Neuvedené'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-400">Technika</div>
                      <div className="font-semibold">{selectedCatch.technique || 'Neuvedené'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-sm text-slate-400">Dátum úlovku</div>
                      <div className="font-semibold">
                        {selectedCatch.caughtAt ? new Date(selectedCatch.caughtAt).toLocaleDateString('sk-SK', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Neuvedené'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo */}
                {selectedCatch.photo && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Fotografia</div>
                    <img 
                      src={selectedCatch.photo} 
                      alt="Fotografia úlovku"
                      className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setLightboxImage(selectedCatch.photo)}
                      data-testid="catch-photo"
                    />
                  </div>
                )}

                {/* Notes */}
                {selectedCatch.notes && (
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Poznámky</div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-sm">
                      {selectedCatch.notes}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-4">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setSelectedCatch(null);
                      setLocation('/diary/catches');
                    }}
                    data-testid="button-edit-catch"
                  >
                    Upraviť úlovok
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Photo Lightbox */}
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/90 border-0" data-testid="photo-lightbox">
            <div className="relative flex items-center justify-center h-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
              {lightboxImage && (
                <img 
                  src={lightboxImage} 
                  alt="Fotografia úlovku"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Start Fishing Dialog */}
        <Dialog open={isStartFishingOpen} onOpenChange={setIsStartFishingOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-500" />
                Začať rybačku
              </DialogTitle>
              <DialogDescription>
                Rýchlo spustite jednodňovú rybačku. Stačí zadať lokalitu a môžete pridávať úlovky.
              </DialogDescription>
            </DialogHeader>
            <Form {...quickStartForm}>
              <form onSubmit={quickStartForm.handleSubmit(handleQuickStart)} className="space-y-4">
                <FormField
                  control={quickStartForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lokalita *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="napr. Dunaj - Bratislava" 
                            className="pl-10"
                            data-testid="input-quick-location"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={quickStartForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznámka (voliteľné)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Rýchle poznámky o dnešnej rybačke..."
                          className="resize-none"
                          rows={3}
                          data-testid="textarea-quick-notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsStartFishingOpen(false)}
                    className="flex-1"
                    data-testid="button-cancel-quick-start"
                  >
                    Zrušiť
                  </Button>
                  <Button
                    type="submit"
                    disabled={createQuickTripMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    data-testid="button-submit-quick-start"
                  >
                    {createQuickTripMutation.isPending ? (
                      <>
                        <Calendar className="w-4 h-4 mr-2 animate-spin" />
                        Vytváram...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Začať rybačku
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DiaryLayout>
  );
}