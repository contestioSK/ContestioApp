import { Link } from "wouter";
import { useFavoriteCompetitions, useFavoriteTeams } from "@/hooks/useFavorites";
import { useToggleFavoriteCompetition, useToggleFavoriteTeam } from "@/hooks/useFavorites";
import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Trophy, Users, Calendar, MapPin, X } from "lucide-react";

export default function Favorites() {
  const { data: favoriteCompetitions, isLoading: competitionsLoading, isFetching: competitionsFetching } = useFavoriteCompetitions();
  const { data: favoriteTeams, isLoading: teamsLoading, isFetching: teamsFetching } = useFavoriteTeams();
  const { removeFavorite: removeCompetition, isRemoving: removingCompetition } = useToggleFavoriteCompetition();
  const { removeFavorite: removeTeam, isRemoving: removingTeam } = useToggleFavoriteTeam();

  const getStatusBadge = (status: string) => {
    const colors = {
      'registration': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'upcoming': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      'live': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 animate-pulse',
      'finished': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    };
    
    const labels = {
      'registration': 'Registrácia otvorená',
      'upcoming': 'Nadchádzajúca',
      'live': 'LIVE',
      'finished': 'Ukončená',
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('sk-SK', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const isLoading = competitionsLoading || teamsLoading || competitionsFetching || teamsFetching;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="h-16" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  const hasNoFavorites = (!favoriteCompetitions || favoriteCompetitions.length === 0) && 
                         (!favoriteTeams || favoriteTeams.length === 0);

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Heart className="w-8 h-8 text-red-500 fill-current" />
            <h1 className="text-3xl font-bold text-foreground">Obľúbené</h1>
          </div>
          <p className="text-muted-foreground">
            Tvoje obľúbené súťaže a tímy na jednom mieste
          </p>
        </div>

        {/* Empty State */}
        {hasNoFavorites && (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Zatiaľ nemáš žiadne obľúbené
              </h2>
              <p className="text-muted-foreground mb-6">
                Pridaj si obľúbené súťaže a tímy, aby si ich mal vždy na dosah
              </p>
              <Link href="/">
                <Button>
                  <Trophy className="w-4 h-4 mr-2" />
                  Preskúmať súťaže
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Favorite Competitions */}
        {favoriteCompetitions && favoriteCompetitions.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center space-x-2 mb-6">
              <Trophy className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Obľúbené súťaže ({favoriteCompetitions.length})
              </h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {favoriteCompetitions.map((favorite) => (
                <Card key={favorite.id} className="hover:shadow-lg transition-shadow" data-testid={`card-competition-${favorite.competitionId}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link href={`/competition/${favorite.competitionId}`}>
                          <CardTitle className="hover:text-primary cursor-pointer line-clamp-2">
                            {favorite.competition?.name || "Súťaž"}
                          </CardTitle>
                        </Link>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCompetition(favorite.competitionId)}
                        disabled={removingCompetition}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        data-testid={`button-remove-competition-${favorite.competitionId}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getStatusBadge(favorite.competition?.status || '')}
                    
                    {favorite.competition?.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="line-clamp-1">{favorite.competition.location}</span>
                      </div>
                    )}
                    
                    {favorite.competition?.startDate && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>
                          {formatDate(favorite.competition.startDate)}
                          {favorite.competition.endDate && 
                            ` - ${formatDate(favorite.competition.endDate)}`
                          }
                        </span>
                      </div>
                    )}

                    <Link href={`/competition/${favorite.competitionId}`}>
                      <Button variant="outline" className="w-full mt-4" data-testid={`button-view-competition-${favorite.competitionId}`}>
                        Zobraziť súťaž
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Teams */}
        {favoriteTeams && favoriteTeams.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Obľúbené tímy ({favoriteTeams.length})
              </h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {favoriteTeams.map((favorite) => (
                <Card key={favorite.id} className="hover:shadow-lg transition-shadow" data-testid={`card-team-${favorite.teamId}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link href={`/team/${favorite.teamId}`}>
                          <CardTitle className="hover:text-primary cursor-pointer line-clamp-2">
                            {favorite.team?.name || "Tím"}
                          </CardTitle>
                        </Link>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeam(favorite.teamId)}
                        disabled={removingTeam}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        data-testid={`button-remove-team-${favorite.teamId}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {favorite.team?.status && (
                      <Badge className={
                        favorite.team.status === 'approved' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : favorite.team.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                      }>
                        {favorite.team.status === 'approved' && 'Schválený'}
                        {favorite.team.status === 'pending' && 'Čaká na schválenie'}
                        {favorite.team.status === 'rejected' && 'Zamietnutý'}
                      </Badge>
                    )}
                    
                    {favorite.team?.totalWeight !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {favorite.team.totalWeight.toFixed(2)} kg
                        </span>
                        {' '}celková váha
                      </div>
                    )}
                    
                    {favorite.team?.catchCount !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {favorite.team.catchCount}
                        </span>
                        {' '}úlovkov
                      </div>
                    )}

                    <Link href={`/team/${favorite.teamId}`}>
                      <Button variant="outline" className="w-full mt-4" data-testid={`button-view-team-${favorite.teamId}`}>
                        Zobraziť tím
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
