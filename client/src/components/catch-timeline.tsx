import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import type { Catch, Team, Referee } from "@shared/schema";

interface CatchTimelineProps {
  catches: (Catch & { team: Team; referee: Referee })[];
  isLoading: boolean;
}

export default function CatchTimeline({ catches, isLoading }: CatchTimelineProps) {
  const formatTimeAgo = (date: string | Date | null) => {
    if (!date) return 'Unknown time';
    const now = new Date();
    const catchTime = date instanceof Date ? date : new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - catchTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getSectorBadge = (sector: string) => {
    const colors = {
      'A': 'bg-primary/10 text-primary',
      'B': 'bg-secondary/10 text-secondary',
      'C': 'bg-accent/10 text-accent',
    };
    
    return (
      <Badge className={`text-xs font-medium ${colors[sector as keyof typeof colors] || 'bg-muted/50'}`}>
        Sector {sector}
      </Badge>
    );
  };

  const getFishTypeDisplay = (fishType: string) => {
    return fishType === 'scaly' ? 'Scaly Carp' : 'Mirror Carp';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Catches</CardTitle>
          <p className="text-sm text-muted-foreground">Latest submissions from referees</p>
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
          <span>Live Catches</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Latest submissions from referees</p>
      </CardHeader>
      
      <CardContent className="p-0">
        {sortedCatches.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">No catches submitted yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Catches will appear here as they are submitted by referees
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {sortedCatches.slice(0, 20).map((catch_) => (
              <div 
                key={catch_.id} 
                className="p-4 border-b border-border hover:bg-muted/20 transition-colors"
                data-testid={`catch-timeline-item-${catch_.id}`}
              >
                <div className="flex space-x-3">
                  {/* Fish photo placeholder - would show actual photo if available */}
                  <div className="w-12 h-12 rounded-lg bg-muted/20 flex items-center justify-center flex-shrink-0">
                    {catch_.photoUrl ? (
                      <img 
                        src={catch_.photoUrl} 
                        alt="Catch photo" 
                        className="w-12 h-12 rounded-lg object-cover"
                        data-testid={`catch-photo-${catch_.id}`}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground text-center">
                        No<br />Photo
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-foreground text-sm" data-testid={`catch-team-${catch_.id}`}>
                        {catch_.team?.name || 'Unknown Team'}
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid={`catch-time-${catch_.id}`}>
                        {formatTimeAgo(catch_.submittedAt!)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-2">
                      {getSectorBadge(catch_.sector)}
                      <span className="text-xs text-muted-foreground" data-testid={`catch-fish-type-${catch_.id}`}>
                        {getFishTypeDisplay(catch_.fishType)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-accent text-lg" data-testid={`catch-weight-${catch_.id}`}>
                        {parseFloat(catch_.weight).toFixed(2)} kg
                      </div>
                      
                      {catch_.isVerified && (
                        <Badge className="bg-secondary/10 text-secondary text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {sortedCatches.length > 20 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Showing latest 20 catches
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
