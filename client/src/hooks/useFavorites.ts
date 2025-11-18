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
    queryKey: ['/api/users/favorites/competitions', user?.id],
    enabled: !!user && !authLoading,
  });
}

// Hook for managing favorite teams
export function useFavoriteTeams() {
  const { user, isLoading: authLoading } = useAuth();
  
  return useQuery<(FavoriteTeam & { team: any })[]>({
    queryKey: ['/api/users/favorites/teams', user?.id],
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
  const { user } = useAuth();
  
  const addMutation = useMutation({
    mutationFn: (competitionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest('POST', `/api/users/favorites/competitions`, { competitionId });
    },
    onMutate: () => {
      return { userId: user?.id };
    },
    onSuccess: (_, competitionId, context: any) => {
      const userId = context?.userId;
      if (!userId) return;
      // Invalidate all related queries with proper userId
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/competitions', userId] });
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
    mutationFn: (competitionId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest('DELETE', `/api/users/favorites/competitions/${competitionId}`);
    },
    onMutate: async (competitionId) => {
      const userId = user?.id;
      if (!userId) return;
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/users/favorites/competitions', userId] });
      // Optimistically update
      const previousFavorites = queryClient.getQueryData(['/api/users/favorites/competitions', userId]);
      queryClient.setQueryData(['/api/users/favorites/competitions', userId], (old: any) => {
        if (!old) return old;
        return old.filter((fav: any) => fav.competitionId !== competitionId);
      });
      return { userId, previousFavorites };
    },
    onSuccess: (_, competitionId, context: any) => {
      const userId = context?.userId;
      if (!userId) return;
      // Invalidate all related queries with proper userId
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/competitions', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions', competitionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      toast({
        title: "Úspech", 
        description: "Súťaž odstránená z obľúbených",
      });
    },
    onError: (_, __, context: any) => {
      const userId = context?.userId;
      if (!userId || !context?.previousFavorites) return;
      // Rollback optimistic update
      queryClient.setQueryData(['/api/users/favorites/competitions', userId], context.previousFavorites);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť súťaž z obľúbených",
        variant: "destructive",
      });
    },
  });

  return {
    addFavorite: (id: string) => {
      if (!user?.id) {
        toast({ title: "Chyba", description: "Musíte byť prihlásený", variant: "destructive" });
        return;
      }
      addMutation.mutate(id);
    },
    removeFavorite: (id: string) => {
      if (!user?.id) {
        toast({ title: "Chyba", description: "Musíte byť prihlásený", variant: "destructive" });
        return;
      }
      removeMutation.mutate(id);
    },
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

// Hook for toggling team favorites  
export function useToggleFavoriteTeam() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const addMutation = useMutation({
    mutationFn: (teamId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest('POST', `/api/users/favorites/teams`, { teamId });
    },
    onMutate: () => {
      return { userId: user?.id };
    },
    onSuccess: (_, teamId, context: any) => {
      const userId = context?.userId;
      if (!userId) return;
      // Invalidate all related queries with proper userId
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/teams', userId] });
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
    mutationFn: (teamId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest('DELETE', `/api/users/favorites/teams/${teamId}`);
    },
    onMutate: async (teamId) => {
      const userId = user?.id;
      if (!userId) return;
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/users/favorites/teams', userId] });
      // Optimistically update
      const previousFavorites = queryClient.getQueryData(['/api/users/favorites/teams', userId]);
      queryClient.setQueryData(['/api/users/favorites/teams', userId], (old: any) => {
        if (!old) return old;
        return old.filter((fav: any) => fav.teamId !== teamId);
      });
      return { userId, previousFavorites };
    },
    onSuccess: (_, teamId, context: any) => {
      const userId = context?.userId;
      if (!userId) return;
      // Invalidate all related queries with proper userId
      queryClient.invalidateQueries({ queryKey: ['/api/users/favorites/teams', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', teamId] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Úspech",
        description: "Tím odstránený z obľúbených", 
      });
    },
    onError: (_, __, context: any) => {
      const userId = context?.userId;
      if (!userId || !context?.previousFavorites) return;
      // Rollback optimistic update
      queryClient.setQueryData(['/api/users/favorites/teams', userId], context.previousFavorites);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť tím z obľúbených",
        variant: "destructive",
      });
    },
  });

  return {
    addFavorite: (id: string) => {
      if (!user?.id) {
        toast({ title: "Chyba", description: "Musíte byť prihlásený", variant: "destructive" });
        return;
      }
      addMutation.mutate(id);
    },
    removeFavorite: (id: string) => {
      if (!user?.id) {
        toast({ title: "Chyba", description: "Musíte byť prihlásený", variant: "destructive" });
        return;
      }
      removeMutation.mutate(id);
    },
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