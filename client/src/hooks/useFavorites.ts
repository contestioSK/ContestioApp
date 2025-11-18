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
  const { user, isLoading: authLoading } = useAuth();
  
  return useQuery<(FavoriteCompetition & { competition: any })[]>({
    queryKey: ['/api/users/favorites/competitions', authLoading],
    enabled: !!user && !authLoading,
  });
}

// Hook for managing favorite teams
export function useFavoriteTeams() {
  const { user, isLoading: authLoading } = useAuth();
  
  return useQuery<(FavoriteTeam & { team: any })[]>({
    queryKey: ['/api/users/favorites/teams', authLoading],
    enabled: !!user && !authLoading,
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
    onSuccess: (_, competitionId) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/competitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
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
    onSuccess: (_, competitionId) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/competitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      
      // Optimistically remove from favorites list
      queryClient.setQueryData(['/api/users/favorites/competitions'], (old: any) => {
        if (!old) return old;
        return old.filter((fav: any) => fav.competitionId !== competitionId);
      });
      
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
    onSuccess: (_, teamId) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
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
    onSuccess: (_, teamId) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      
      // Optimistically remove from favorites list
      queryClient.setQueryData(['/api/users/favorites/teams'], (old: any) => {
        if (!old) return old;
        return old.filter((fav: any) => fav.teamId !== teamId);
      });
      
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