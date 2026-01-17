import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { sk } from "date-fns/locale";
import { useWebSocket } from "@/hooks/useWebSocket";
import { cn } from "@/lib/utils";
import { useVisibilityAwarePolling, POLLING_INTERVALS, STALE_TIMES } from "@/hooks/usePolling";

interface BattleInvitation {
  id: string;
  battleId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  battle?: {
    name: string;
    type: 'tournament' | 'location' | 'trip';
    tripDate?: string;
  };
  invitedBy?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const pollingInterval = useVisibilityAwarePolling(POLLING_INTERVALS.NOTIFICATIONS);

  const { data: invitations = [], isLoading } = useQuery<BattleInvitation[]>({
    queryKey: ['/api/diary/battles/invitations'],
    refetchInterval: pollingInterval,
    staleTime: STALE_TIMES.LIVE,
  });

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  useWebSocket((message) => {
    if (message.type === 'battle_invitation') {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      toast({
        title: "🎣 Nová výzva!",
        description: `${message.inviterName} vás pozval do battle: ${message.battleName}`,
      });
    }
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles'] });
      toast({
        title: "✅ Pozvánka prijatá",
        description: "Úspešne ste sa pridali do battle",
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      toast({
        title: "Chyba",
        description: "Nepodarilo sa prijať pozvánku",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      toast({
        title: "Pozvánka odmietnutá",
        description: "Pozvánka bola odmietnutá",
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odmietnuť pozvánku",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getBattleTypeLabel = (type: string) => {
    switch (type) {
      case 'tournament':
        return 'Turnaj';
      case 'location':
        return 'Lokalita';
      case 'trip':
        return 'Výlet';
      default:
        return type;
    }
  };

  const getInviterName = (invitedBy?: { firstName: string | null; lastName: string | null; email: string }) => {
    if (!invitedBy) return 'Používateľ';
    if (invitedBy.firstName || invitedBy.lastName) {
      return `${invitedBy.firstName || ''} ${invitedBy.lastName || ''}`.trim();
    }
    return invitedBy.email;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="topbar-notifications"
      >
        <Bell className="h-5 w-5" />
        {pendingInvitations.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
            {pendingInvitations.length > 9 ? '9+' : pendingInvitations.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <div 
          className={cn(
            "absolute right-0 mt-2 w-80 md:w-96 rounded-xl border border-border shadow-2xl",
            "bg-popover",
            "max-h-[80vh] overflow-hidden z-50"
          )}
          data-testid="notifications-dropdown"
        >
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="text-sm font-semibold">
              Notifikácie
              {pendingInvitations.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({pendingInvitations.length})
                </span>
              )}
            </h3>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="p-8 text-center">
                <Check className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">Všetko vyriešené!</p>
                <p className="text-xs text-muted-foreground mt-1">Žiadne nové notifikácie</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {pendingInvitations.slice(0, 10).map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 border-l-4 border-orange-500 transition-colors"
                  >
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {getInviterName(invitation.invitedBy)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500">
                          {invitation.battle ? getBattleTypeLabel(invitation.battle.type) : 'Battle'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pozval vás do: <span className="font-medium text-foreground">{invitation.battle?.name || 'Battle'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true, locale: sk })}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => acceptMutation.mutate(invitation.id)}
                        disabled={acceptMutation.isPending}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Prijať
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8"
                        onClick={() => rejectMutation.mutate(invitation.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Odmietnuť
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
