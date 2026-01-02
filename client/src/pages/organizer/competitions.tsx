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
  Filter
} from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import type { Competition } from "@shared/schema";
import { useState, useMemo } from "react";

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
      case 'registration':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><Clock className="w-3 h-3 mr-1" />Registrácia</Badge>;
      case 'live':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Živá</Badge>;
      case 'finished':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Ukončená</Badge>;
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

  return (
    <OrganizerLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Moje súťaže</h1>
          <p className="text-muted-foreground mt-1">
            Zoznam všetkých vašich súťaží
          </p>
        </div>
        <Button onClick={() => setLocation('/register-competition')} data-testid="button-create-competition">
          <Plus className="w-4 h-4 mr-2" />
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
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredCompetitions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompetitions.map((competition) => (
            <Card 
              key={competition.id} 
              className="bg-card border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/organizer/competition/${competition.id}`)}
              data-testid={`card-competition-${competition.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {competition.imageUrl ? (
                    <img 
                      src={competition.imageUrl} 
                      alt={competition.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <TacticalIconInline icon={Trophy} variant="amber" size="lg" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{competition.name}</CardTitle>
                    <div className="mt-1">{getStatusBadge(competition.status)}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <TacticalIconInline icon={MapPin} variant="emerald" size="sm" className="mr-2 flex-shrink-0" />
                  <span className="truncate">{competition.location}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <TacticalIconInline icon={Calendar} variant="indigo" size="sm" className="mr-2 flex-shrink-0" />
                  {new Date(competition.startDate).toLocaleDateString('sk-SK')} - {new Date(competition.endDate).toLocaleDateString('sk-SK')}
                </div>
                {competition.maxTeams && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <TacticalIconInline icon={Users} variant="orange" size="sm" className="mr-2 flex-shrink-0" />
                    Max. {competition.maxTeams} tímov
                  </div>
                )}
                
                <div className="flex gap-2 pt-3">
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
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/organizer/competition/${competition.id}`);
                    }}
                    data-testid={`button-manage-${competition.id}`}
                  >
                    <Settings className="w-4 h-4 mr-1" />
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
              <TacticalIcon icon={Trophy} variant="amber" size="lg" showLabel={false} />
            </div>
            {competitions && competitions.length > 0 ? (
              <>
                <h3 className="text-lg font-medium text-foreground mb-2">Žiadne výsledky</h3>
                <p className="text-muted-foreground">
                  Žiadne súťaže nevyhovujú vášmu vyhľadávaniu.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-foreground mb-2">Žiadne súťaže</h3>
                <p className="text-muted-foreground mb-6">
                  Zatiaľ nemáte žiadne súťaže. Vytvorte svoju prvú súťaž!
                </p>
                <Button onClick={() => setLocation('/register-competition')}>
                  <Plus className="w-4 h-4 mr-2" />
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
