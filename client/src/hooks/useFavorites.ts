import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { 
  FavoriteCompetition, 
  FavoriteTeam,
  NotificationPreferences
} from '@shared/schema';

// Hook for managing favorite competitions
export function useFavoriteCompetitions() {
  const { isAuthenticated } = useAuth();
  
  return useQuery<(FavoriteCompetition & { competition: any })[]>({
    queryKey: ['/api/users/favorites/competitions'],
    enabled: isAuthenticated,
  });
}

// Hook for managing favorite teams
export function useFavoriteTeams() {
  const { isAuthenticated } = useAuth();
  
  return useQuery<(FavoriteTeam & { team: any })[]>({
    queryKey: ['/api/users/favorites/teams'],
    enabled: isAuthenticated,
  });
}

// Hook for notification preferences
export function useNotificationPreferences() {
  const { isAuthenticated } = useAuth();
  
  return useQuery<NotificationPreferences>({
    queryKey: ['/api/users/notification-preferences'],
    enabled: isAuthenticated,
  });
}

// Hook for toggling competition favorites
export function useToggleFavoriteCompetition() {
  const { toast } = useToast();
  
  const addMutation = useMutation({
    mutationFn: (competitionId: string) => 
      apiRequest('POST', `/api/users/favorites/competitions`, { competitionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/competitions'] });
      toast({
        title: "Úspech",
        description: "Súťaž pridaná do obľúbených",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať súťaž do obľúbených",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (competitionId: string) => 
      apiRequest('DELETE', `/api/users/favorites/competitions/${competitionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/competitions'] });
      toast({
        title: "Úspech", 
        description: "Súťaž odstránená z obľúbených",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť súťaž z obľúbených",
        variant: "destructive",
      });
    },
  });

  return {
    addFavorite: addMutation.mutate,
    removeFavorite: removeMutation.mutate,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

// Hook for toggling team favorites  
export function useToggleFavoriteTeam() {
  const { toast } = useToast();
  
  const addMutation = useMutation({
    mutationFn: (teamId: string) => 
      apiRequest('POST', `/api/users/favorites/teams`, { teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/teams'] });
      toast({
        title: "Úspech",
        description: "Tím pridaný do obľúbených",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa pridať tím do obľúbených",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (teamId: string) => 
      apiRequest('DELETE', `/api/users/favorites/teams/${teamId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/teams'] });
      toast({
        title: "Úspech",
        description: "Tím odstránený z obľúbených", 
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť tím z obľúbených",
        variant: "destructive",
      });
    },
  });

  return {
    addFavorite: addMutation.mutate,
    removeFavorite: removeMutation.mutate,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

// Hook for updating notification preferences
export function useUpdateNotificationPreferences() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (preferences: Partial<NotificationPreferences>) => 
      apiRequest('PUT', `/api/users/notification-preferences`, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/notification-preferences'] });
      toast({
        title: "Úspech",
        description: "Nastavenia notifikácií aktualizované",
      });
    },
    onError: () => {
      toast({
        title: "Chyba", 
        description: "Nepodarilo sa aktualizovať nastavenia",
        variant: "destructive",
      });
    },
  });
}