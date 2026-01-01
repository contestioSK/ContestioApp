import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCheck, Search } from "lucide-react";
import { TacticalIconInline } from "@/components/ui/tactical-icon";
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

  if (!user?.id) {
    return (
      <DiaryLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </DiaryLayout>
    );
  }

  return (
    <DiaryLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <TacticalIconInline icon={Users} variant="lime" />
              Priatelia
            </h1>
            <p className="text-slate-400">Spravuj svoje kontakty a vyzývaj ich na súboje</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
              <TabsTrigger value="friends" className="text-white data-[state=active]:bg-slate-600" data-testid="tab-friends">
                <TacticalIconInline icon={Users} variant="lime" size="sm" />
                <span className="ml-2">Priatelia</span>
                <span className="ml-2 text-xs font-bold bg-slate-600 px-2 py-0.5 rounded-full">
                  {formatBadgeCount(myFriends.length)}
                </span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-white data-[state=active]:bg-slate-600" data-testid="tab-requests">
                <TacticalIconInline icon={UserCheck} variant="cyan" size="sm" />
                <span className="ml-2">Žiadosti</span>
                {friendRequests.length > 0 && (
                  <span className="ml-2 text-xs font-bold bg-amber-500 text-black px-2 py-0.5 rounded-full">
                    {formatBadgeCount(friendRequests.length)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="search" className="text-white data-[state=active]:bg-slate-600" data-testid="tab-search">
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
              <UserSearch userId={user.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DiaryLayout>
  );
}
