import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Trophy, Share, Award, Heart } from "lucide-react";
import { getSideCompetitionLabels } from "@/lib/utils";
import { useFavoriteCompetitions, useToggleFavoriteCompetition } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import type { Competition } from "@shared/schema";

interface CompetitionCardProps {
  competition: Competition;
}

export default function CompetitionCard({ competition }: CompetitionCardProps) {
  const { isAuthenticated } = useAuth();
  const { data: favoriteCompetitions } = useFavoriteCompetitions();
  const { addFavorite, removeFavorite, isAdding, isRemoving } = useToggleFavoriteCompetition();
  
  // Check if this competition is in user's favorites
  const isFavorite = favoriteCompetitions?.some(fav => fav.competitionId === competition.id) || false;
  const isLoading = isAdding || isRemoving;
  
  const handleFavoriteToggle = () => {
    if (!isAuthenticated) return;
    
    if (isFavorite) {
      removeFavorite(competition.id);
    } else {
      addFavorite(competition.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-secondary text-secondary-foreground">
            <span className="w-2 h-2 bg-secondary-foreground rounded-full mr-2 animate-pulse"></span>
            ŽIVO
          </Badge>
        );
      case 'registration':
        return <Badge className="bg-accent text-accent-foreground">REGISTRÁCIA OTVORENÁ</Badge>;
      case 'finished':
        return <Badge className="bg-muted text-muted-foreground">UKONČENÁ</Badge>;
      default:
        return <Badge>{status.toUpperCase()}</Badge>;
    }
  };

  const getActionButton = () => {
    switch (competition.status) {
      case 'live':
        return (
          <Button 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
            data-testid={`button-watch-live-${competition.id}`}
          >
            <Link href={`/competition/${competition.id}`}>
              Sledovať naživo
            </Link>
          </Button>
        );
      case 'registration':
        return (
          <Button 
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
            asChild
            data-testid={`button-register-${competition.id}`}
          >
            <Link href={`/competition/${competition.id}`}>
              Registrovať tím
            </Link>
          </Button>
        );
      case 'finished':
        return (
          <Button 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
            data-testid={`button-view-results-${competition.id}`}
          >
            <Link href={`/competition/${competition.id}`}>
              Zobraziť výsledky
            </Link>
          </Button>
        );
      default:
        return (
          <Button 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
            data-testid={`button-view-${competition.id}`}
          >
            <Link href={`/competition/${competition.id}`}>
              Zobraziť detaily
            </Link>
          </Button>
        );
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('sk-SK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCompetitionImage = (status: string) => {
    switch (status) {
      case 'live':
        return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400";
      case 'registration':
        return "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400";
      case 'finished':
        return "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400";
      default:
        return "https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow" data-testid={`card-competition-${competition.id}`}>
      <div className="relative">
        <img 
          src={competition.imageUrl || getCompetitionImage(competition.status)} 
          alt={`Súťaž ${competition.name}`}
          className={`w-full h-48 rounded-t-lg ${
            competition.imageUrl 
              ? 'object-contain bg-white' // Pre nahrané logá - zobrazí celé logo s bielym pozadím
              : 'object-cover' // Pre predvolené obrázky - pokryje celú plochu
          }`}
        />
        <div className="absolute top-3 left-3">
          {getStatusBadge(competition.status)}
        </div>
        {competition.status === 'live' && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/50 text-white px-2 py-1 rounded text-sm font-mono">
              Práve teraz naživo
            </span>
          </div>
        )}
        {competition.status === 'registration' && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/50 text-white px-2 py-1 rounded text-sm">
              Začína {formatDate(competition.startDate)}
            </span>
          </div>
        )}
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground" data-testid={`text-name-${competition.id}`}>
            {competition.name}
          </h3>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span data-testid={`text-max-teams-${competition.id}`}>
              {competition.maxTeams ? `Maximálne ${competition.maxTeams}` : 'Otvorené'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4 mr-2" />
          <span data-testid={`text-location-${competition.id}`}>{competition.location}</span>
        </div>
        
        <div className="space-y-2 mb-4">
          {competition.status === 'live' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stav:</span>
                <span className="font-medium text-foreground">Živá súťaž</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Končí:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatDate(competition.endDate)}
                </span>
              </div>
            </>
          )}
          
          {competition.status === 'registration' && (
            <>
              {competition.firstPlacePrize && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Výhra:</span>
                  <span className="font-medium text-foreground">
                    €{parseFloat(competition.firstPlacePrize).toLocaleString()}
                  </span>
                </div>
              )}
              {competition.registrationFee && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Štartovné na tím:</span>
                  <span className="font-medium text-foreground">
                    €{parseFloat(competition.registrationFee)}/tím
                  </span>
                </div>
              )}
            </>
          )}
          
          {competition.status === 'finished' && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ukončená:</span>
                <span className="font-medium text-foreground">
                  {formatDate(competition.endDate)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trvanie:</span>
                <span className="font-mono font-medium text-foreground">
                  {Math.ceil((new Date(competition.endDate).getTime() - new Date(competition.startDate).getTime()) / (1000 * 60 * 60 * 24))} dní
                </span>
              </div>
            </>
          )}
          
          {/* Side Competitions */}
          {competition.sideCompetitions && competition.sideCompetitions.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1 mb-2">
                <Award className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Špeciálne súťaže</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {getSideCompetitionLabels(competition.sideCompetitions).slice(0, 2).map((label, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="bg-muted/10 text-foreground border-muted text-xs px-1 py-0"
                    data-testid={`badge-card-side-competition-${index}`}
                  >
                    {label}
                  </Badge>
                ))}
                {competition.sideCompetitions.length > 2 && (
                  <Badge 
                    variant="outline" 
                    className="bg-muted/10 text-muted-foreground border-muted text-xs px-1 py-0"
                    data-testid="badge-card-more-competitions"
                  >
                    +{competition.sideCompetitions.length - 2} ďalších
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {getActionButton()}
          {isAuthenticated && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleFavoriteToggle}
              disabled={isLoading}
              className={isFavorite ? "text-red-500 hover:text-red-600" : ""}
              data-testid={`button-favorite-${competition.id}`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon"
            data-testid={`button-share-${competition.id}`}
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
