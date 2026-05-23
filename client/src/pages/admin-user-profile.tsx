import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  User, 
  Trophy, 
  Fish, 
  MapPin, 
  Swords, 
  Users, 
  Star, 
  Bell, 
  Crown,
  Calendar,
  Mail,
  Shield,
  Target,
  Heart
} from "lucide-react";
import DiaryLayout from "@/components/DiaryLayout";

interface UserProfile {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    nickname: string | null;
    profileImageUrl: string | null;
    role: string;
    active: boolean;
    isPremium: boolean;
    userTier: string;
    premiumExpiresAt: string | null;
    emailVerified: boolean;
    isNewsletterSubscribed: boolean;
    facebookUrl: string | null;
    instagramUrl: string | null;
    preferences: any;
    createdAt?: string;
  };
  teams: Array<{
    id: string;
    teamId: string;
    userId: string;
    role: string;
    team: {
      id: string;
      name: string;
      status: string;
      competition: {
        id: string;
        name: string;
        status: string;
        startDate: string;
      };
    };
  }>;
  favoriteCompetitions: Array<{
    id: string;
    competition: {
      id: string;
      name: string;
      status: string;
    };
  }>;
  favoriteTeams: Array<{
    id: string;
    team: {
      id: string;
      name: string;
      competition: {
        name: string;
      };
    };
  }>;
  diaryCatches: Array<{
    id: string;
    fishType: string;
    weight: string;
    lengthCm: number | null;
    capturedAt: string;
    photos?: Array<{ url: string }>;
  }>;
  diaryTrips: Array<{
    id: string;
    name: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
  }>;
  battles: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  }>;
  friends: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    nickname: string | null;
    profileImageUrl: string | null;
  }>;
  seasonGoals: Array<{
    id: string;
    goalType: string;
    targetValue: number;
    currentValue: number;
  }>;
  subscription: {
    id: string;
    product: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  notificationPreferences: {
    newCatch: boolean;
    leaderboardChange: boolean;
    biggestFish: boolean;
    officialAnnouncement: boolean;
  } | null;
  statistics: {
    totalTeams: number;
    totalDiaryCatches: number;
    totalTrips: number;
    totalBattles: number;
    totalFriends: number;
  };
}

export default function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const { user: currentUser, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
      navigate('/diary');
    }
  }, [authLoading, currentUser, navigate]);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['/api/admin/users', userId, 'profile'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}/profile`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return res.json();
    },
    enabled: !!userId && !!currentUser && currentUser.role === 'admin',
  });

  if (authLoading || isLoading) {
    return (
      <DiaryLayout>
        <div className="container max-w-6xl mx-auto p-4 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DiaryLayout>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  if (!profile) {
    return (
      <DiaryLayout>
        <div className="container max-w-6xl mx-auto p-4">
          <p className="text-muted-foreground">Používateľ nebol nájdený.</p>
        </div>
      </DiaryLayout>
    );
  }

  const { user, teams, favoriteCompetitions, favoriteTeams, diaryCatches, diaryTrips, battles, friends, seasonGoals, subscription, notificationPreferences, statistics } = profile;

  const getUserDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.nickname) return user.nickname;
    if (user.email) return user.email;
    return 'Neznámy používateľ';
  };

  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.nickname) return user.nickname[0].toUpperCase();
    return 'U';
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      admin: { label: 'Admin', variant: 'destructive' },
      organizer: { label: 'Organizátor', variant: 'default' },
      referee: { label: 'Rozhodca', variant: 'secondary' },
      public: { label: 'Verejný', variant: 'outline' },
    };
    const config = roleConfig[role] || roleConfig.public;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <DiaryLayout>
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Profil používateľa</h1>
          <Badge variant="outline" className="text-xs">
            Read-only
          </Badge>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-semibold text-foreground">{getUserDisplayName()}</h2>
                  {getRoleBadge(user.role)}
                  {user.isPremium && (
                    <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {!user.active && (
                    <Badge variant="destructive">Neaktívny</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{user.email}</span>
                      {user.emailVerified && (
                        <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">Overený</Badge>
                      )}
                    </div>
                  )}
                  {user.nickname && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>@{user.nickname}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Tier: {user.userTier}</span>
                  </div>
                  {user.premiumExpiresAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Premium do: {new Date(user.premiumExpiresAt).toLocaleDateString('sk-SK')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold text-foreground">{statistics.totalTeams}</p>
            <p className="text-xs text-muted-foreground">Tímy</p>
          </Card>
          <Card className="bg-card border-border p-4 text-center">
            <Fish className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-foreground">{statistics.totalDiaryCatches}</p>
            <p className="text-xs text-muted-foreground">Úlovky</p>
          </Card>
          <Card className="bg-card border-border p-4 text-center">
            <MapPin className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-foreground">{statistics.totalTrips}</p>
            <p className="text-xs text-muted-foreground">Výlety</p>
          </Card>
          <Card className="bg-card border-border p-4 text-center">
            <Swords className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-foreground">{statistics.totalBattles}</p>
            <p className="text-xs text-muted-foreground">Súboje</p>
          </Card>
          <Card className="bg-card border-border p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold text-foreground">{statistics.totalFriends}</p>
            <p className="text-xs text-muted-foreground">Priatelia</p>
          </Card>
        </div>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="teams" data-testid="tab-teams">
              <Trophy className="h-4 w-4 mr-2" />
              Tímy
            </TabsTrigger>
            <TabsTrigger value="catches" data-testid="tab-catches">
              <Fish className="h-4 w-4 mr-2" />
              Úlovky
            </TabsTrigger>
            <TabsTrigger value="trips" data-testid="tab-trips">
              <MapPin className="h-4 w-4 mr-2" />
              Výlety
            </TabsTrigger>
            <TabsTrigger value="battles" data-testid="tab-battles">
              <Swords className="h-4 w-4 mr-2" />
              Súboje
            </TabsTrigger>
            <TabsTrigger value="favorites" data-testid="tab-favorites">
              <Heart className="h-4 w-4 mr-2" />
              Obľúbené
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Bell className="h-4 w-4 mr-2" />
              Nastavenia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Členstvo v tímoch ({teams.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Žiadne členstvo v tímoch</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {teams.map((membership) => (
                        <div
                          key={membership.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div>
                            <p className="font-medium text-foreground">{membership.team.name}</p>
                            <p className="text-sm text-muted-foreground">{membership.team.competition.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(membership.team.competition.startDate).toLocaleDateString('sk-SK')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{membership.role}</Badge>
                            <Badge
                              variant={membership.team.status === 'approved' ? 'default' : 'secondary'}
                            >
                              {membership.team.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="catches" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Úlovky z denníka ({diaryCatches.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {diaryCatches.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Žiadne úlovky</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {diaryCatches.slice(0, 50).map((catch_) => (
                        <div
                          key={catch_.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                        >
                          {catch_.photos && catch_.photos.length > 0 ? (
                            <img
                              src={catch_.photos[0].url}
                              alt={catch_.fishType}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                              <Fish className="w-6 h-6 text-blue-500" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{catch_.fishType === 'mirror' ? 'Lysec' : catch_.fishType === 'scaly' ? 'Šupináč' : catch_.fishType}</p>
                            <p className="text-sm text-muted-foreground">
                              {catch_.weight} kg
                              {catch_.lengthCm && ` • ${catch_.lengthCm} cm`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(catch_.capturedAt).toLocaleString('sk-SK')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trips" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Výlety ({diaryTrips.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {diaryTrips.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Žiadne výlety</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {diaryTrips.map((trip) => (
                        <div
                          key={trip.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div>
                            <p className="font-medium text-foreground">{trip.name}</p>
                            {trip.location && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {trip.location}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(trip.startDate).toLocaleDateString('sk-SK')}
                              {trip.endDate && ` - ${new Date(trip.endDate).toLocaleDateString('sk-SK')}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="battles" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Súboje ({battles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {battles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Žiadne súboje</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {battles.map((battle) => (
                        <div
                          key={battle.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div>
                            <p className="font-medium text-foreground">{battle.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(battle.startDate).toLocaleDateString('sk-SK')} - {new Date(battle.endDate).toLocaleDateString('sk-SK')}
                            </p>
                          </div>
                          <Badge
                            variant={battle.status === 'active' ? 'default' : 'secondary'}
                          >
                            {battle.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Obľúbené súťaže ({favoriteCompetitions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {favoriteCompetitions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Žiadne obľúbené súťaže</p>
                  ) : (
                    <div className="space-y-2">
                      {favoriteCompetitions.map((fav) => (
                        <div key={fav.id} className="p-2 rounded bg-muted/30">
                          <p className="text-sm font-medium text-foreground">{fav.competition.name}</p>
                          <Badge variant="outline" className="text-xs">{fav.competition.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-rose-500" />
                    Obľúbené tímy ({favoriteTeams.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {favoriteTeams.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Žiadne obľúbené tímy</p>
                  ) : (
                    <div className="space-y-2">
                      {favoriteTeams.map((fav) => (
                        <div key={fav.id} className="p-2 rounded bg-muted/30">
                          <p className="text-sm font-medium text-foreground">{fav.team.name}</p>
                          <p className="text-xs text-muted-foreground">{fav.team.competition.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Nastavenia notifikácií
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notificationPreferences ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Nový úlovok</span>
                        <Badge variant={notificationPreferences.newCatch ? 'default' : 'secondary'}>
                          {notificationPreferences.newCatch ? 'Zapnuté' : 'Vypnuté'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Zmena rebríčka</span>
                        <Badge variant={notificationPreferences.leaderboardChange ? 'default' : 'secondary'}>
                          {notificationPreferences.leaderboardChange ? 'Zapnuté' : 'Vypnuté'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Najväčšia ryba</span>
                        <Badge variant={notificationPreferences.biggestFish ? 'default' : 'secondary'}>
                          {notificationPreferences.biggestFish ? 'Zapnuté' : 'Vypnuté'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Oficiálne oznamy</span>
                        <Badge variant={notificationPreferences.officialAnnouncement ? 'default' : 'secondary'}>
                          {notificationPreferences.officialAnnouncement ? 'Zapnuté' : 'Vypnuté'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Nastavenia nie sú dostupné</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Sezónne ciele ({seasonGoals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {seasonGoals.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Žiadne sezónne ciele</p>
                  ) : (
                    <div className="space-y-2">
                      {seasonGoals.map((goal) => (
                        <div key={goal.id} className="p-2 rounded bg-muted/30">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground">{goal.goalType}</span>
                            <span className="text-sm text-muted-foreground">
                              {goal.currentValue}/{goal.targetValue}
                            </span>
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full mt-1">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {subscription && (
                <Card className="bg-card border-border md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Predplatné
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{subscription.product}</p>
                        <p className="text-sm text-muted-foreground">
                          Stav: {subscription.status}
                        </p>
                        {subscription.currentPeriodEnd && (
                          <p className="text-xs text-muted-foreground">
                            Platné do: {new Date(subscription.currentPeriodEnd).toLocaleDateString('sk-SK')}
                          </p>
                        )}
                      </div>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {friends.length > 0 && (
                <Card className="bg-card border-border md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-cyan-500" />
                      Priatelia ({friends.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {friends.slice(0, 20).map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={friend.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {friend.firstName?.[0] || friend.nickname?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">
                            {friend.firstName && friend.lastName
                              ? `${friend.firstName} ${friend.lastName}`
                              : friend.nickname || 'Neznámy'}
                          </span>
                        </div>
                      ))}
                      {friends.length > 20 && (
                        <Badge variant="outline">+{friends.length - 20} ďalších</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DiaryLayout>
  );
}
