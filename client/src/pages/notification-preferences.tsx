import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, Save, Check, Loader2 } from "lucide-react";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useFavorites";
import { useToast } from "@/hooks/use-toast";

export default function NotificationPreferences() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const mutation = useUpdateNotificationPreferences();
  const { toast } = useToast();
  
  // Local state to manage form changes
  const [formData, setFormData] = useState({
    allCatches: preferences?.allCatches ?? true,
    favoriteCompetitions: preferences?.favoriteCompetitions ?? true,
    favoriteTeams: preferences?.favoriteTeams ?? true,
    biggestFish: preferences?.biggestFish ?? true,
    officialAnnouncements: preferences?.officialAnnouncements ?? true,
    leaderboardChanges: preferences?.leaderboardChanges ?? false,
    pushNotifications: preferences?.pushNotifications ?? false,
  });
  
  // Update local state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setFormData({
        allCatches: preferences.allCatches ?? true,
        favoriteCompetitions: preferences.favoriteCompetitions ?? true,
        favoriteTeams: preferences.favoriteTeams ?? true,
        biggestFish: preferences.biggestFish ?? true,
        officialAnnouncements: preferences.officialAnnouncements ?? true,
        leaderboardChanges: preferences.leaderboardChanges ?? false,
        pushNotifications: preferences.pushNotifications ?? false,
      });
    }
  }, [preferences]);
  
  const handleSwitchChange = (key: keyof typeof formData, checked: boolean) => {
    setFormData(prev => ({ ...prev, [key]: checked }));
  };
  
  const handleSave = () => {
    mutation.mutate(formData);
  };
  
  // Check if there are any changes to enable save button
  const hasChanges = preferences && Object.keys(formData).some(
    key => formData[key as keyof typeof formData] !== preferences[key as keyof typeof preferences]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-muted-foreground">Načítavanie nastavení...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <Bell className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Nastavenia notifikácií</h1>
          </div>
          <p className="text-muted-foreground">
            Konfigurácia oznámení a upozornení pre súťaže a udalosti
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upozornenia na úlovky</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="all-catches">Všetky nové úlovky</Label>
                <p className="text-sm text-muted-foreground">
                  Dostávať oznámenia o každom novom úlovku vo všetkých súťažiach
                </p>
              </div>
              <Switch
                id="all-catches"
                checked={formData.allCatches}
                onCheckedChange={(checked) => handleSwitchChange("allCatches", checked)}
                data-testid="switch-all-catches"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="favorite-competitions">Obľúbené súťaže</Label>
                <p className="text-sm text-muted-foreground">
                  Oznámenia len pre súťaže označené ako obľúbené
                </p>
              </div>
              <Switch
                id="favorite-competitions"
                checked={formData.favoriteCompetitions}
                onCheckedChange={(checked) => handleSwitchChange("favoriteCompetitions", checked)}
                data-testid="switch-favorite-competitions"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="favorite-teams">Obľúbené tímy</Label>
                <p className="text-sm text-muted-foreground">
                  Oznámenia pre úlovky od obľúbených tímov
                </p>
              </div>
              <Switch
                id="favorite-teams"
                checked={formData.favoriteTeams}
                onCheckedChange={(checked) => handleSwitchChange("favoriteTeams", checked)}
                data-testid="switch-favorite-teams"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Špeciálne udalosti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="biggest-fish">Najväčšie ryby</Label>
                <p className="text-sm text-muted-foreground">
                  Upozornenia na nové top 3 najväčšie úlovky
                </p>
              </div>
              <Switch
                id="biggest-fish"
                checked={formData.biggestFish}
                onCheckedChange={(checked) => handleSwitchChange("biggestFish", checked)}
                data-testid="switch-biggest-fish"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="leaderboard-changes">Zmeny v rebríčku</Label>
                <p className="text-sm text-muted-foreground">
                  Oznámenia pri zmenách pozícií v rebríčku
                </p>
              </div>
              <Switch
                id="leaderboard-changes"
                checked={formData.leaderboardChanges}
                onCheckedChange={(checked) => handleSwitchChange("leaderboardChanges", checked)}
                data-testid="switch-leaderboard-changes"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Systémové oznámenia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="official-announcements">Oficiálne oznamy</Label>
                <p className="text-sm text-muted-foreground">
                  Dôležité oznamy od organizátorov súťaží
                </p>
              </div>
              <Switch
                id="official-announcements"
                checked={formData.officialAnnouncements}
                onCheckedChange={(checked) => handleSwitchChange("officialAnnouncements", checked)}
                data-testid="switch-official-announcements"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push notifikácie</Label>
                <p className="text-sm text-muted-foreground">
                  Povoliť push notifikácie v prehliadači
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={formData.pushNotifications}
                onCheckedChange={(checked) => handleSwitchChange("pushNotifications", checked)}
                data-testid="switch-push-notifications"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || mutation.isPending}
            className="min-w-[120px]"
            data-testid="button-save-preferences"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Ukladanie...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Uložiť
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}