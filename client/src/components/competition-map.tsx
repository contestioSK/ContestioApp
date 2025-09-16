import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Minus, RotateCcw } from "lucide-react";
import type { Team, TeamMember } from "@shared/schema";

interface CompetitionMapProps {
  competitionId: string;
  teams: (Team & { members: TeamMember[] })[];
}

export default function CompetitionMap({ competitionId, teams }: CompetitionMapProps) {
  const formatLastUpdate = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // Group teams by sector
  const teamsBySector = teams.reduce((acc, team) => {
    if (team.sector && team.status === 'approved') {
      if (!acc[team.sector]) {
        acc[team.sector] = [];
      }
      acc[team.sector].push(team);
    }
    return acc;
  }, {} as Record<string, (Team & { members: TeamMember[] })[]>);

  const getSectorColor = (sector: string) => {
    const colors = {
      'A': 'bg-primary border-primary',
      'B': 'bg-secondary border-secondary',
      'C': 'bg-accent border-accent',
    };
    return colors[sector as keyof typeof colors] || 'bg-muted border-muted';
  };

  const getSectorPosition = (sector: string) => {
    const positions = {
      'A': 'top-1/4 left-1/4',
      'B': 'top-1/3 right-1/3',
      'C': 'bottom-1/4 left-1/2',
    };
    return positions[sector as keyof typeof positions] || 'top-1/2 left-1/2';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Mapa súťaže</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Posledná aktualizácia:</span>
            <span className="text-sm font-medium text-foreground" data-testid="map-last-update">
              {formatLastUpdate()}
            </span>
            <Button variant="ghost" size="sm" data-testid="button-refresh-map">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Map Container */}
        <div className="relative bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg h-64 overflow-hidden">
          {/* Background lake image */}
          <img 
            src="https://images.unsplash.com/photo-1439066615861-d1af74d74000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600" 
            alt="Letecký pohľad na jazero s označenými rybárskymi sektormi" 
            className="w-full h-full object-cover opacity-60"
          />
          
          {/* Sector Markers */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full" data-testid="competition-map">
              
              {/* Render sectors with teams */}
              {Object.entries(teamsBySector).map(([sector, sectorTeams]) => (
                <div 
                  key={sector}
                  className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 ${getSectorColor(sector)} ${getSectorPosition(sector)}`}
                  data-testid={`sector-marker-${sector}`}
                >
                  {/* Sector Label */}
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-sm whitespace-nowrap">
                    <div className="text-foreground">Sektor {sector}</div>
                    <div className="text-muted-foreground text-xs">
                      {sectorTeams.length} tím{sectorTeams.length === 1 ? '' : sectorTeams.length < 5 ? 'y' : 'ov'}
                    </div>
                  </div>
                  
                  {/* Team tooltip on hover */}
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 opacity-0 hover:opacity-100 transition-opacity z-10 min-w-48">
                    <div className="text-xs font-medium text-foreground mb-1">
                      Tímy sektora {sector}:
                    </div>
                    <div className="space-y-1">
                      {sectorTeams.map((team) => (
                        <div key={team.id} className="flex justify-between text-xs">
                          <span className="text-foreground">{team.name}</span>
                          <span className="font-mono text-accent">
                            {parseFloat(team.totalWeight || '0').toFixed(1)} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show empty sectors */}
              {['A', 'B', 'C'].filter(sector => !teamsBySector[sector]).map((sector) => (
                <div 
                  key={sector}
                  className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-lg bg-muted/50 transform -translate-x-1/2 -translate-y-1/2 ${getSectorPosition(sector)}`}
                  data-testid={`sector-marker-${sector}-empty`}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-sm">
                    <div className="text-muted-foreground">Sektor {sector}</div>
                    <div className="text-muted-foreground text-xs">Prázdny</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Map Controls */}
          <div className="absolute bottom-3 right-3 flex space-x-1">
            <Button variant="outline" size="sm" className="bg-white p-2 rounded shadow-sm hover:bg-gray-50" data-testid="button-zoom-in">
              <Plus className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" className="bg-white p-2 rounded shadow-sm hover:bg-gray-50" data-testid="button-zoom-out">
              <Minus className="w-3 h-3" />
            </Button>
          </div>
          
          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg p-2 space-y-1">
            <div className="text-xs font-medium text-foreground">Sektory:</div>
            <div className="flex space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-xs">A</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span className="text-xs">B</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-xs">C</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sector Summary */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {['A', 'B', 'C'].map((sector) => {
            const sectorTeams = teamsBySector[sector] || [];
            const totalWeight = sectorTeams.reduce((sum, team) => sum + parseFloat(team.totalWeight || '0'), 0);
            const totalFish = sectorTeams.reduce((sum, team) => sum + (team.fishCount || 0), 0);
            
            return (
              <div key={sector} className="p-3 border border-border rounded-lg" data-testid={`sector-summary-${sector}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getSectorColor(sector)}`}></div>
                    <span className="font-medium text-foreground">Sektor {sector}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {sectorTeams.length} tím{sectorTeams.length === 1 ? '' : sectorTeams.length < 5 ? 'y' : 'ov'}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Celková hmotnosť:</span>
                    <span className="font-mono font-medium text-foreground">
                      {totalWeight.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Počet rýb:</span>
                    <span className="font-mono font-medium text-foreground">
                      {totalFish}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
