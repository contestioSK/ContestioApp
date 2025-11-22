import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { UserPlus, Check, X, Users, Swords } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";
import DiaryLayout from "@/components/DiaryLayout";
import { useLocation } from "wouter";

interface FriendshipWithUser extends User {
  friendship?: { id: string; status: string };
}

export default function Friends() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: myFriends = [] } = useQuery<User[]>({
    queryKey: ['/api/friends'],
    enabled: !!user?.id,
  });

  const { data: friendRequests = [] } = useQuery<FriendshipWithUser[]>({
    queryKey: ['/api/friend-requests'],
    enabled: !!user?.id,
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery<User[]>({
    queryKey: ['/api/users/search', searchQuery],
    enabled: !!user?.id && searchQuery.length >= 2,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (recipientId: string) =>
      apiRequest('POST', '/api/friend-requests', { recipientId }),
    onSuccess: () => {
      toast({
        title: "Úspešne",
        description: "Žiadosť o priateľstvo odoslaná",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/search'] });
    },
    onError: (err: any) => {
      toast({
        title: "Chyba",
        description: err.response?.data?.message || "Chyba pri odoslaní",
        variant: "destructive",
      });
    },
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
  });

  return (
    <DiaryLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Priatelia</h1>
            <p className="text-slate-400">Spravuj svoje kontakty a vyzývaj ich na súboje</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
              <TabsTrigger value="friends" className="text-white">
                Moji Priatelia <span className="ml-2 text-xs font-bold">({myFriends.length})</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-white">
                Žiadosti <span className="ml-2 text-xs font-bold">({friendRequests.length})</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="text-white">
                Hľadať
              </TabsTrigger>
            </TabsList>

            {/* Friends Tab */}
            <TabsContent value="friends" className="space-y-4">
              {myFriends.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <Users className="mx-auto mb-4 w-12 h-12 text-slate-500" />
                    <p className="text-slate-400">Zatiaľ nemáš žiadnych priateľov</p>
                  </CardContent>
                </Card>
              ) : (
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
                          <p className="text-xs text-slate-400">{friend.email}</p>
                        </div>
                        <div className="space-y-2">
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => navigate('/diary/battles/create')}
                          >
                            <Swords className="w-4 h-4 mr-2" />
                            Vyzvať
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => removeFriendMutation.mutate(friend.id)}
                          >
                            Odstrániť
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              {friendRequests.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-slate-400">Žiadne čakajúce žiadosti</p>
                  </CardContent>
                </Card>
              ) : (
                friendRequests.map((request) => (
                  <Card key={request.friendship?.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.profileImageUrl || ""} />
                          <AvatarFallback className="bg-blue-500">
                            {(request.firstName?.[0] || "U").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-white">
                            {request.firstName} {request.lastName}
                          </p>
                          <p className="text-sm text-slate-400">{request.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            acceptMutation.mutate(request.friendship!.id)
                          }
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            rejectMutation.mutate(request.friendship!.id)
                          }
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-4">
              <Input
                placeholder="Hľadaj používateľov..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
              />
              
              {searchQuery.length < 2 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-slate-400">Zadaj aspoň 2 znaky</p>
                  </CardContent>
                </Card>
              ) : isSearching ? (
                <p className="text-slate-400 text-center">Vyhľadávam...</p>
              ) : searchResults.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-slate-400">Žiadni používatelia nenájdení</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <Card key={result.id} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={result.profileImageUrl || ""} />
                            <AvatarFallback className="bg-blue-500">
                              {(result.firstName?.[0] || "U").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-white">
                              {result.firstName} {result.lastName}
                            </p>
                            <p className="text-sm text-slate-400">{result.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => sendRequestMutation.mutate(result.id)}
                          disabled={sendRequestMutation.isPending}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DiaryLayout>
  );
}
