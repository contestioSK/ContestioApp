import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Building2, Trophy, BookOpen, Users, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Register() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="text-register-title">
            Zaregistruj sa do Contestio
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Vyberte si typ účtu, ktorý najlepšie vyhovuje vašim potrebám.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto mt-6 rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Individual User Account */}
          <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300" data-testid="card-individual-user">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Individuálny účet
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Pre rybárov, ktorí si chcú viesť osobný denník
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4 mb-6">
                <div className="flex items-start space-x-3">
                  <BookOpen className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground">Rybársky denník</h4>
                    <p className="text-sm text-muted-foreground">Zaznamenávajte svoje úlovky a miesta</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Trophy className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground">Fishing battles</h4>
                    <p className="text-sm text-muted-foreground">Súťažte s priateľmi v osobných výzvach</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground">Pripojenie k súťažiam</h4>
                    <p className="text-sm text-muted-foreground">Zaregistrujte sa do verejných súťaží</p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/auth/login')}
                className="w-full font-medium"
                size="lg"
                data-testid="button-register-individual"
              >
                Prihlásiť sa / Registrovať
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Začnite bezplatne s freemium verziou
              </p>
            </CardContent>
          </Card>

          {/* Organizer Account */}
          <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300" data-testid="card-organizer">
            <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Organizátor
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Pre organizovanie profesionálnych rybárskych súťaží
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground">Vytvorenie súťaží</h4>
                    <p className="text-sm text-muted-foreground">Organizujte a spravujte rybárske súťaže</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground">Správa tímov</h4>
                    <p className="text-sm text-muted-foreground">Schvaľovanie registrácií a riadenie účastníkov</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Trophy className="w-5 h-5 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground">Live sledovanie</h4>
                    <p className="text-sm text-muted-foreground">Sledujte súťaže v reálnom čase s rozhodcami</p>
                  </div>
                </div>
              </div>
              <Link href="/register-competition">
                <Button 
                  className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium"
                  size="lg"
                  data-testid="button-register-organizer"
                >
                  Zaregistrovať súťaž
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Pozrite si <Link href="/pricing" className="text-primary hover:underline">cenník</Link> pre organizátorov
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Already have account */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Už máte účet?
          </p>
          <Button 
            variant="outline"
            onClick={() => navigate('/auth/login')}
            className="font-medium"
            data-testid="button-existing-login"
          >
            Prihlásiť sa
          </Button>
        </div>

        {/* Help section */}
        <div className="bg-muted/50 rounded-lg p-6 mt-12">
          <h3 className="text-lg font-semibold text-foreground mb-3 text-center">
            Potrebujete pomoc s výberom?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-foreground mb-2">Individuálny účet je pre vás, ak:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Chcete si viesť osobný rybársky denník</li>
                <li>• Plánujete sa pripojiť k existujúcim súťažiam</li>
                <li>• Súťažíte rekreačne s priateľmi</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Organizátorský účet je pre vás, ak:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Organizujete oficiálne rybárske súťaže</li>
                <li>• Potrebujete spravovať viacero tímov</li>
                <li>• Chcete live sledovanie a reporting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}