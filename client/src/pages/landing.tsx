import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, Users, Trophy, MapPin } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Fish className="text-primary text-2xl" />
                <h1 className="text-xl font-bold text-primary">Contestio</h1>
              </div>
              <div className="hidden md:flex items-center space-x-1 bg-muted/20 rounded-full px-3 py-1">
                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                <span className="text-sm font-medium text-secondary">Live Competitions</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="button-login"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 lg:py-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
            alt="Serene lake with fishing boats at dawn" 
            className="w-full h-full object-cover opacity-20" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Live Fishing <span className="text-primary">Competitions</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Follow real-time catches, leaderboards, and team performances in competitive fishing tournaments around the world.
            </p>
            
            {/* Live Stats Banner */}
            <div className="inline-flex items-center space-x-8 bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-lg mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-live-competitions">3</div>
                <div className="text-sm text-muted-foreground">Live Now</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary" data-testid="text-active-teams">127</div>
                <div className="text-sm text-muted-foreground">Active Teams</div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent" data-testid="text-recent-catches">1,843</div>
                <div className="text-sm text-muted-foreground">Catches Today</div>
              </div>
            </div>

            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Sample Competitions Grid */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-2">Sample Competitions</h2>
            <p className="text-muted-foreground">Live and upcoming fishing tournaments</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sample Competition Cards */}
            <Card className="hover:shadow-lg transition-shadow" data-testid="card-competition-1">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                  alt="Fishing boats during competition on calm lake" 
                  className="w-full h-48 object-cover rounded-t-lg" 
                />
                <Badge className="absolute top-3 left-3 bg-secondary text-secondary-foreground">
                  <span className="w-2 h-2 bg-secondary-foreground rounded-full mr-2 animate-pulse"></span>
                  LIVE
                </Badge>
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground">Lake Michigan Championship</h3>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>24 teams</span>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Michigan, USA</span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Leader:</span>
                    <span className="font-medium text-foreground">Team Northwind</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Weight:</span>
                    <span className="font-mono font-medium text-foreground">127.45 kg</span>
                  </div>
                </div>
                
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-watch-live">
                  Watch Live
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="card-competition-2">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                  alt="Fishing equipment and tackle box preparation at sunrise" 
                  className="w-full h-48 object-cover rounded-t-lg" 
                />
                <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
                  REGISTRATION OPEN
                </Badge>
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground">Rocky Mountain Trophy Hunt</h3>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>16/32 teams</span>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Colorado, USA</span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prize Pool:</span>
                    <span className="font-medium text-foreground">$25,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registration Fee:</span>
                    <span className="font-medium text-foreground">$450/team</span>
                  </div>
                </div>
                
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-register-team">
                  Register Team
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="card-competition-3">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
                  alt="Successful angler holding large fish with sunset background" 
                  className="w-full h-48 object-cover rounded-t-lg" 
                />
                <Badge className="absolute top-3 left-3 bg-muted text-muted-foreground">
                  FINISHED
                </Badge>
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground">Atlantic Coast Masters</h3>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Trophy className="w-3 h-3 text-accent" />
                    <span>Completed</span>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Maine, USA</span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Winner:</span>
                    <span className="font-medium text-foreground">Team Tidewater</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Winning Weight:</span>
                    <span className="font-mono font-medium text-foreground">89.32 kg</span>
                  </div>
                </div>
                
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-view-results">
                  View Results
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Fish className="text-2xl" />
              <h3 className="text-xl font-bold">Contestio</h3>
            </div>
            <p className="text-primary-foreground/80 mb-4">
              The ultimate platform for live fishing competitions.
            </p>
            <div className="text-primary-foreground/80 text-sm">
              © 2024 Contestio. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
