import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, UserCheck } from "lucide-react";
import { TacticalIcon } from "@/components/ui/tactical-icon";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface FriendshipWithUser extends User {
  friendship?: { id: string; status: string };
}

export default function FriendRequests({ userId }: { userId: string }) {
  const { toast } = useToast();

  if (!userId) return null;

  const { data: friendRequests = [], isLoading } = useQuery<FriendshipWithUser[]>({
    queryKey: ['/api/friend-requests'],
    enabled: !!userId,
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest('PUT', `/api/friend-requests/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      toast({
        title: "Úspešne",
        description: "Priateľ prijatý",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa prijať žiadosť",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest('PUT', `/api/friend-requests/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
      toast({
        title: "Úspešne",
        description: "Žiadosť odmietnutá",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odmietnuť žiadosť",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (friendRequests.length === 0) {
    return (
      <Card className="bg-card border border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardContent className="p-8 text-center flex flex-col items-center">
          <TacticalIcon icon={UserCheck} variant="cyan" size="lg" showLabel={false} />
          <p className="text-muted-foreground dark:text-slate-400 mt-4">Žiadne čakajúce žiadosti</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {friendRequests.map((request) => (
        <Card key={request.friendship?.id} className="bg-card border border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={request.profileImageUrl || ""} />
                <AvatarFallback className="bg-blue-500">
                  {(request.firstName?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-bold text-foreground dark:text-white">
                {request.firstName} {request.lastName}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => acceptMutation.mutate(request.friendship!.id)}
                disabled={acceptMutation.isPending}
                data-testid={`button-accept-${request.friendship?.id}`}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectMutation.mutate(request.friendship!.id)}
                disabled={rejectMutation.isPending}
                data-testid={`button-reject-${request.friendship?.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
