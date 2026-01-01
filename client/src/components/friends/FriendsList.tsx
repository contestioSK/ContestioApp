import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Swords, Trash2 } from "lucide-react";
import { TacticalIcon } from "@/components/ui/tactical-icon";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

export default function FriendsList({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [friendToRemove, setFriendToRemove] = useState<string | null>(null);

  if (!userId) return null;

  const { data: myFriends = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/friends'],
    enabled: !!userId,
  });

  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string) =>
      apiRequest('DELETE', `/api/friends/${friendId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      toast({
        title: "Úspešne",
        description: "Priateľ odobraný",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa odstrániť priateľa",
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

  if (myFriends.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8 text-center flex flex-col items-center">
          <TacticalIcon icon={Users} variant="lime" size="lg" showLabel={false} />
          <p className="text-slate-400 mt-4">Zatiaľ nemáš žiadnych priateľov</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {myFriends.map((friend) => (
        <Card key={friend.id} className="bg-slate-800/50 border-slate-700 hover:border-blue-500 transition">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-16 h-16 mb-3">
                <AvatarImage src={friend.profileImageUrl || ""} />
                <AvatarFallback className="bg-blue-500">
                  {(friend.firstName?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-bold text-white">
                {friend.firstName} {friend.lastName}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => navigate('/diary/battles/create')}
                data-testid={`button-challenge-${friend.id}`}
              >
                <Swords className="w-4 h-4 mr-2" />
                Vyzvať
              </Button>
              <AlertDialog open={friendToRemove === friend.id} onOpenChange={(open) => !open && setFriendToRemove(null)}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 border-red-500/30 hover:border-red-500/50"
                    onClick={() => setFriendToRemove(friend.id)}
                    data-testid={`button-remove-${friend.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Odstrániť
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Odstrániť priateľa</AlertDialogTitle>
                    <AlertDialogDescription>
                      Naozaj chceš odstrániť {friend.firstName} {friend.lastName} z tvojich priateľov?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        removeFriendMutation.mutate(friend.id);
                        setFriendToRemove(null);
                      }}
                    >
                      Odstrániť
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
