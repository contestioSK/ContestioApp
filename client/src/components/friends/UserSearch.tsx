import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Check, Clock, Users } from "lucide-react";
import { TacticalIcon } from "@/components/ui/tactical-icon";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface FriendshipWithUser extends User {
  friendship?: { id: string; status: string };
}

export default function UserSearch({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  if (!userId) return null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: myFriends = [] } = useQuery<User[]>({
    queryKey: ['/api/friends'],
    enabled: !!userId,
  });

  const { data: pendingRequests = [] } = useQuery<FriendshipWithUser[]>({
    queryKey: ['/api/friend-requests/sent'],
    enabled: !!userId,
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery<User[]>({
    queryKey: ['/api/users/search', debouncedQuery],
    queryFn: async () => {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!userId && debouncedQuery.length >= 2,
  });

  const friendIds = useMemo(() => new Set(myFriends.map(f => f.id)), [myFriends]);
  const pendingIds = useMemo(() => new Set(pendingRequests.map(r => r.id)), [pendingRequests]);

  const sendRequestMutation = useMutation({
    mutationFn: async (recipientId: string) =>
      apiRequest('POST', '/api/friend-requests', { recipientId }),
    onSuccess: (_, recipientId) => {
      setSentRequests(prev => new Set(prev).add(recipientId));
      toast({
        title: "Úspešne",
        description: "Žiadosť o priateľstvo odoslaná",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/search', debouncedQuery] });
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests/sent'] });
    },
    onError: (err: any) => {
      toast({
        title: "Chyba",
        description: err.response?.data?.message || "Chyba pri odoslaní žiadosti",
        variant: "destructive",
      });
    },
  });

  const getStatus = (userId: string): 'friend' | 'pending' | 'sent' | 'none' => {
    if (friendIds.has(userId)) return 'friend';
    if (pendingIds.has(userId)) return 'pending';
    if (sentRequests.has(userId)) return 'sent';
    return 'none';
  };

  const renderActionButton = (result: User) => {
    const status = getStatus(result.id);

    switch (status) {
      case 'friend':
        return (
          <Button size="sm" variant="outline" disabled className="text-green-500 border-green-500/30">
            <Check className="w-4 h-4 mr-1" />
            Priatelia
          </Button>
        );
      case 'pending':
      case 'sent':
        return (
          <Button size="sm" variant="outline" disabled className="text-amber-500 border-amber-500/30">
            <Clock className="w-4 h-4 mr-1" />
            Odoslaná
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => sendRequestMutation.mutate(result.id)}
            disabled={sendRequestMutation.isPending}
            data-testid={`button-add-friend-${result.id}`}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        );
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Hľadaj používateľov..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-muted dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-500"
        data-testid="input-search-users"
      />

      {searchQuery.length < 2 ? (
        <Card className="bg-card border border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <TacticalIcon icon={Search} variant="blue" size="lg" showLabel={false} />
            <p className="text-muted-foreground dark:text-slate-400 mt-4">Zadaj aspoň 2 znaky pre vyhľadávanie</p>
          </CardContent>
        </Card>
      ) : isSearching ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : searchResults.length === 0 ? (
        <Card className="bg-card border border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <TacticalIcon icon={Users} variant="purple" size="lg" showLabel={false} />
            <p className="text-muted-foreground dark:text-slate-400 mt-4">Žiadni používatelia nenájdení</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {searchResults.map((result) => (
            <Card key={result.id} className="bg-card border border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={result.profileImageUrl || ""} />
                    <AvatarFallback className="bg-blue-500">
                      {(result.firstName?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-foreground dark:text-white">
                    {result.firstName} {result.lastName}
                  </p>
                </div>
                {renderActionButton(result)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
