import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OrganizerLayout from "@/components/OrganizerLayout";
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Settings,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Timer,
  Zap
} from "lucide-react";
import { PulsingDot } from "@/components/ui/pulsing-dot";
import type { Competition } from "@shared/schema";
import { useState, useMemo } from "react";

function formatTimeRemaining(endDate: string | Date): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Ukončené";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function OrganizerCompetitions() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: competitions, isLoading } = useQuery<Competition[]>({
    queryKey: ['/api/organizer/competitions'],
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600">
            <Clock className="w-3 h-3 mr-1" />Rozpracovaná
          </Badge>
        );
      case 'ready':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700">
            <Clock className="w-3 h-3 mr-1" />Pripravená
          </Badge>
        );
      case 'registration':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700">
            <Clock className="w-3 h-3 mr-1" />Registrácia
          </Badge>
        );
      case 'live':
        return (
          <Badge className="bg-green-500 text-white border-0 shadow-lg shadow-green-500/25">
            <PulsingDot color="green" />
            <span className="ml-2">Živá</span>
          </Badge>
        );
      case 'finished':
        return <Badge variant="outline" className="text-slate-500"><AlertCircle className="w-3 h-3 mr-1" />Ukončená</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredCompetitions = useMemo(() => {
    if (!competitions) return [];
    
    return competitions.filter(competition => {
      const matchesSearch = competition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           competition.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || competition.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [competitions, searchQuery, statusFilter]);

  const liveCount = competitions?.filter(c => c.status === 'live').length || 0;

  return (
    <OrganizerLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Moje súťaže</h1>
            <p className="text-muted-foreground mt-1">
              Zoznam všetkých tvojich súťaží
            </p>
          </div>
          {liveCount > 0 && (
            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 ml-2">
              <PulsingDot color="green" />
              <span className="ml-2">{liveCount} živá</span>
            </Badge>
          )}
        </div>
        <Button 
          onClick={() => setLocation('/organizer/create')} 
          className="bg-[#28C6CE] hover:bg-[#1DB5BC] text-white shadow-lg shadow-orange-500/25 border-0"
          data-testid="button-create-competition"
        >
          <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
          Vytvoriť súťaž
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hľadať súťaž..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-competition"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky stavy</SelectItem>
            <SelectItem value="draft">Rozpracované</SelectItem>
            <SelectItem value="ready">Pripravené</SelectItem>
            <SelectItem value="registration">Registrácia</SelectItem>
            <SelectItem value="live">Živé</SelectItem>
            <SelectItem value="finished">Ukončené</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Competitions List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : filteredCompetitions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompetitions.map((competition) => (
            <Card 
              key={competition.id} 
              className={`bg-card shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden ${
                competition.status === 'live' 
                  ? 'border-2 border-green-500/50 dark:border-green-500/30' 
                  : competition.status === 'registration'
                  ? 'border border-blue-200 dark:border-blue-900/50'
                  : 'border border-slate-200 dark:border-slate-700'
              }`}
              onClick={() => setLocation(`/organizer/competition/${competition.id}`)}
              data-testid={`card-competition-${competition.id}`}
            >
              {/* Status ribbon at top */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                competition.status === 'live' 
                  ? 'bg-green-500' 
                  : competition.status === 'registration'
                  ? 'bg-blue-500'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`} />
              
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  {competition.imageUrl ? (
                    <img 
                      src={competition.imageUrl} 
                      alt={competition.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      competition.status === 'live' 
                        ? 'bg-green-500' 
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {competition.status === 'live' ? (
                        <Zap className="w-5 h-5 text-white" strokeWidth={1.75} />
                      ) : (
                        <Trophy className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-bold truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {competition.name}
                    </CardTitle>
                    <div className="mt-1">{getStatusBadge(competition.status)}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="truncate">{competition.location}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    {new Date(competition.startDate).toLocaleDateString('sk-SK')} - {new Date(competition.endDate).toLocaleDateString('sk-SK')}
                  </div>
                </div>
                
                {/* Time remaining badge */}
                {competition.status !== 'finished' && (
                  <div className="flex items-center justify-between">
                    {competition.maxTeams && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="h-4 w-4 mr-1 flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
                        <span className="text-xs">Max. <span className="font-mono font-medium text-[#28C6CE]">{competition.maxTeams}</span></span>
                      </div>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      competition.status === 'live' 
                        ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      <Timer className="w-3 h-3 inline mr-1" />
                      {competition.status === 'live' 
                        ? formatTimeRemaining(competition.endDate)
                        : formatTimeRemaining(competition.startDate)
                      }
                    </span>
                  </div>
                )}
                
                {/* Registration open indicator */}
                {competition.status === 'registration' && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Registrácia otvorená
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/competition/${competition.id}`);
                    }}
                    data-testid={`button-view-${competition.id}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Zobraziť
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-[#28C6CE] hover:bg-[#1DB5BC] text-white border-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/organizer/competition/${competition.id}`);
                    }}
                    data-testid={`button-manage-${competition.id}`}
                  >
                    <Settings className="w-4 h-4 mr-1" strokeWidth={1.75} />
                    Spravovať
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <Trophy className="w-6 h-6 text-muted-foreground" strokeWidth={1.75} />
              </div>
            </div>
            {competitions && competitions.length > 0 ? (
              <>
                <h3 className="text-lg font-bold text-foreground mb-2">Žiadne výsledky</h3>
                <p className="text-muted-foreground">
                  Žiadne súťaže nevyhovujú tvojmu vyhľadávaniu.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-foreground mb-2">Žiadne súťaže</h3>
                <p className="text-muted-foreground mb-6">
                  Zatiaľ nemáš žiadne súťaže. Vytvor svoju prvú súťaž!
                </p>
                <Button 
                  onClick={() => setLocation('/organizer/create')}
                  className="bg-[#28C6CE] hover:bg-[#1DB5BC] text-white shadow-lg shadow-orange-500/25"
                >
                  <Plus className="w-4 h-4 mr-2" strokeWidth={1.75} />
                  Vytvoriť súťaž
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </OrganizerLayout>
  );
}
