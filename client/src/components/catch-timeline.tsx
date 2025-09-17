import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Catch, Team, Referee } from "@shared/schema";

interface CatchTimelineProps {
  catches: (Catch & { team: Team; referee: Referee })[];
  isLoading: boolean;
  competitionId: string;
}

export default function CatchTimeline({ catches, isLoading, competitionId }: CatchTimelineProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; teamName: string; weight: string; fishType: string } | null>(null);

  const formatTimeAgo = (date: string | Date | null) => {
    if (!date) return 'Neznámy čas';
    const now = new Date();
    const catchTime = date instanceof Date ? date : new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - catchTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Práve teraz';
    if (diffInMinutes < 60) return `${diffInMinutes} min. dozadu`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hod. dozadu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 deň dozadu';
    if (diffInDays <= 4) return `${diffInDays} dni dozadu`;
    return `${diffInDays} dní dozadu`;
  };

  const getSectorBadge = (sector: string) => {
    const colors = {
      'A': 'bg-primary/10 text-primary',
      'B': 'bg-secondary/10 text-secondary',
      'C': 'bg-accent/10 text-accent',
    };
    
    return (
      <Link href={`/competition/${competitionId}/sector/${sector}`} data-testid={`link-catch-sector-${sector}`}>
        <Badge className={`text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors ${colors[sector as keyof typeof colors] || 'bg-muted/50'}`}>
          Sektor {sector}
        </Badge>
      </Link>
    );
  };

  const getFishTypeDisplay = (fishType: string) => {
    return fishType === 'scaly' ? 'Šupináč' : 'Lysec';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posledné úlovky</CardTitle>
          <p className="text-sm text-muted-foreground">Najnovšie príspevky rozhodcov</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-3 p-4 border border-border rounded-lg">
                <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort catches by submission time (most recent first)
  const sortedCatches = [...catches].sort((a, b) => 
    new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Posledné úlovky</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Najnovšie príspevky rozhodcov</p>
      </CardHeader>
      
      <CardContent className="p-0">
        {sortedCatches.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">Zatiaľ žiadne úlovky</p>
            <p className="text-sm text-muted-foreground mt-2">
              Úlovky sa tu zobrazia, keď ich rozhodcovia odošlú
            </p>
          </div>
        ) : (
          <div className="h-[900px] overflow-y-auto">
            {sortedCatches.map((catch_) => (
              <div 
                key={catch_.id} 
                className="p-6 border-b border-border hover:bg-muted/20 transition-colors"
                data-testid={`catch-timeline-item-${catch_.id}`}
              >
                <div className="flex space-x-4">
                  {/* Fish photo placeholder - would show actual photo if available */}
                  <div className="w-16 h-16 rounded-lg bg-muted/20 flex items-center justify-center flex-shrink-0">
                    {catch_.photoUrl ? (
                      <div 
                        className="w-16 h-16 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all transform hover:scale-105"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Kliknul si na fotku:', catch_.photoUrl);
                          setSelectedPhoto({
                            url: catch_.photoUrl!,
                            teamName: catch_.team?.name || 'Neznámy tím',
                            weight: `${parseFloat(catch_.weight).toFixed(2)} kg`,
                            fishType: getFishTypeDisplay(catch_.fishType)
                          });
                        }}
                        data-testid={`catch-photo-${catch_.id}`}
                      >
                        <img 
                          src={catch_.photoUrl} 
                          alt="Fotka úlovku" 
                          className="w-full h-full object-cover pointer-events-none"
                          onError={(e) => {
                            console.error('Chyba pri načítaní fotky:', catch_.photoUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center">
                        Žiadna<br />fotka
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-foreground text-base" data-testid={`catch-team-${catch_.id}`}>
                        {catch_.team?.name || 'Neznámy tím'}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`catch-time-${catch_.id}`}>
                        {formatTimeAgo(catch_.submittedAt!)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 mb-3">
                      {getSectorBadge(catch_.sector)}
                      <span className="text-sm text-muted-foreground" data-testid={`catch-fish-type-${catch_.id}`}>
                        {getFishTypeDisplay(catch_.fishType)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-accent text-xl" data-testid={`catch-weight-${catch_.id}`}>
                        {parseFloat(catch_.weight).toFixed(2)} kg
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
          </div>
        )}
      </CardContent>

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0" aria-describedby="catch-photo-description">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-50 bg-black/20 text-white hover:bg-black/40"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            
            {selectedPhoto && (
              <div className="flex flex-col">
                <div className="relative">
                  <img 
                    src={selectedPhoto.url}
                    alt="Zväčšená fotka úlovku"
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>
                
                <div className="p-6 bg-background border-t">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      {selectedPhoto.teamName}
                    </DialogTitle>
                    <p id="catch-photo-description" className="text-sm text-muted-foreground mb-2">
                      Detail úlovku s váhou a typom ryby
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="font-mono text-2xl text-accent font-bold">
                        {selectedPhoto.weight}
                      </div>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {selectedPhoto.fishType}
                      </Badge>
                    </div>
                  </DialogHeader>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
