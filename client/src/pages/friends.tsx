import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, Search } from "lucide-react";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { useQuery } from "@tanstack/react-query";
import DiaryLayout from "@/components/DiaryLayout";
import FriendsList from "@/components/friends/FriendsList";
import FriendRequests from "@/components/friends/FriendRequests";
import UserSearch from "@/components/friends/UserSearch";
import type { User } from "@shared/schema";

interface FriendshipWithUser extends User {
  friendship?: { id: string; status: string };
}

const formatBadgeCount = (count: number): string => {
  return count > 9 ? "9+" : String(count);
};

export default function Friends() {
  const { user } = useAuth();
  
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['friends', 'requests', 'search'].includes(tab)) {
        return tab;
      }
    }
    return 'friends';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [autoRedirected, setAutoRedirected] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  const { data: myFriends = [] } = useQuery<User[]>({
    queryKey: ['/api/friends'],
    enabled: !!user?.id,
  });

  const { data: friendRequests = [] } = useQuery<FriendshipWithUser[]>({
    queryKey: ['/api/friend-requests'],
    enabled: !!user?.id,
  });

  const isNewUser = myFriends.length === 0 && friendRequests.length === 0;

  // Auto-redirect to search tab when user has no friends and no requests (only once)
  useEffect(() => {
    if (!autoRedirected && isNewUser) {
      setActiveTab("search");
      setAutoRedirected(true);
    }
  }, [autoRedirected, isNewUser]);

  if (!user) {
    return (
      <DiaryLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="space-y-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-px w-16 bg-[#F97316]"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F97316]">Komunita</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-4">
                  <TacticalIcon icon={Users} variant="orange" size="lg" showLabel={false} />
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground leading-none">Priatelia</h1>
                </div>
                <p className="text-sm font-medium text-muted-foreground italic tracking-tight pl-0.5">
                  Pridaj si kamarátov a vyzvi ich na rybársky súboj
                </p>
              </div>
            </div>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted dark:bg-slate-700/50">
              <TabsTrigger value="friends" className="text-foreground dark:text-white data-[state=active]:bg-card data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-600" data-testid="tab-friends">
                <TacticalIconInline icon={Users} variant="orange" size="sm" />
                <span className="ml-2">Priatelia</span>
                <span className="ml-2 text-xs font-bold bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">
                  {formatBadgeCount(myFriends.length)}
                </span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-foreground dark:text-white data-[state=active]:bg-card data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-600" data-testid="tab-requests">
                <TacticalIconInline icon={UserCheck} variant="indigo" size="sm" />
                <span className="ml-2">Žiadosti</span>
                {friendRequests.length > 0 && (
                  <span className="ml-2 text-xs font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">
                    {formatBadgeCount(friendRequests.length)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="search" className="text-foreground dark:text-white data-[state=active]:bg-card data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-600" data-testid="tab-search">
                <TacticalIconInline icon={Search} variant="blue" size="sm" />
                <span className="ml-2">Hľadať</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-4 mt-4">
              <FriendsList userId={user.id} onFindFriends={() => setActiveTab('search')} />
            </TabsContent>

            <TabsContent value="requests" className="space-y-4 mt-4">
              <FriendRequests userId={user.id} />
            </TabsContent>

            <TabsContent value="search" className="space-y-4 mt-4">
              {isNewUser && (
                <div className="p-6 rounded-2xl bg-orange-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-orange-500/10 dark:to-indigo-500/10 border border-orange-200 dark:border-orange-500/20 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-500/20">
                      <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground dark:text-white mb-2">
                        Zatiaľ tu nikoho nemáš
                      </h3>
                      <p className="text-muted-foreground dark:text-slate-300 text-sm mb-3">
                        Pridaj si kamarátov a môžeš:
                      </p>
                      <ul className="text-muted-foreground dark:text-slate-400 text-sm space-y-1">
                        <li>• vyzývať ich na súboje</li>
                        <li>• porovnávať úlovky</li>
                        <li>• sledovať rebríčky</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-4 rounded-xl bg-card border border-slate-200 dark:border-slate-700 mb-4 shadow-sm">
                <p className="text-sm text-muted-foreground dark:text-slate-300">
                  Vyhľadaj kamarátov podľa mena a začni súťažiť.
                </p>
              </div>

              <UserSearch userId={user.id} />
            </TabsContent>
          </Tabs>
      </div>
    </DiaryLayout>
  );
}
