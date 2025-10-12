import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "@/hooks/useWebSocket";

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

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch pending invitations
  const { data: invitations = [], isLoading } = useQuery<BattleInvitation[]>({
    queryKey: ['/api/diary/battles/invitations'],
  });

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  // WebSocket listener for battle invitations
  useWebSocket((message) => {
    if (message.type === 'battle_invitation') {
      console.log('[NotificationCenter] Received battle invitation:', message);
      
      // Invalidate invitations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      
      // Show toast notification
      toast({
        title: "🎣 Nová výzva!",
        description: `${message.inviterName} vás pozval do battle: ${message.battleName}`,
      });
    }
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest('POST', `/api/diary/battles/invitations/${invitationId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diary/battles'] });
      toast({
        title: "Pozvánka prijatá",
        description: "Úspešne ste sa pridali do battle",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa prijať pozvánku",
        variant: "destructive",
      });
    },
  });

  // Reject invitation mutation
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
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odmietnuť pozvánku",
        variant: "destructive",
      });
    },
  });

  // Close dropdown when clicking outside
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
      {/* Bell Icon Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-notifications"
      >
        <Bell className="h-5 w-5" />
        {pendingInvitations.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center" data-testid="badge-notification-count">
            {pendingInvitations.length}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-[hsl(192,52%,9%)] border border-[hsl(192,30%,20%)] rounded-lg shadow-2xl max-h-[500px] overflow-y-auto" data-testid="dropdown-notifications">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[hsl(192,30%,20%)]">
            <h3 className="text-sm font-semibold text-foreground">
              Battle pozvánky ({pendingInvitations.length})
            </h3>
          </div>

          {/* Content */}
          <div className="p-2">
            {isLoading ? (
              // Loading State
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-lg bg-[hsl(192,40%,14%)] animate-pulse">
                    <div className="h-4 bg-[hsl(192,40%,20%)] rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-[hsl(192,40%,20%)] rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : pendingInvitations.length === 0 ? (
              // Empty State
              <div className="py-12 text-center" data-testid="empty-notifications">
                <Check className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <h4 className="text-sm font-medium text-foreground mb-1">Všetko vyriešené!</h4>
                <p className="text-xs text-muted-foreground">Žiadne čakajúce pozvánky</p>
              </div>
            ) : (
              // Invitation Cards
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-4 rounded-lg bg-[hsl(192,40%,14%)] hover:bg-[hsl(192,40%,16%)] border-l-4 border-[hsl(186,100%,45%)] transition-colors duration-150"
                    data-testid={`invitation-${invitation.id}`}
                  >
                    {/* Content */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground" data-testid={`invitation-sender-${invitation.id}`}>
                          {getInviterName(invitation.invitedBy)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(186,100%,45%)]/20 text-[hsl(186,100%,45%)]" data-testid={`invitation-type-${invitation.id}`}>
                          {invitation.battle ? getBattleTypeLabel(invitation.battle.type) : 'Battle'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1" data-testid={`invitation-name-${invitation.id}`}>
                        {invitation.battle?.name || 'Názov battle'}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`invitation-time-${invitation.id}`}>
                        {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)] text-white"
                        onClick={() => acceptMutation.mutate(invitation.id)}
                        disabled={acceptMutation.isPending}
                        data-testid={`button-accept-${invitation.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Prijať
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-[hsl(192,30%,20%)] hover:bg-[hsl(192,40%,14%)]"
                        onClick={() => rejectMutation.mutate(invitation.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-${invitation.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
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
