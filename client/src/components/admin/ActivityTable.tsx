import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
}

interface ActivityTableProps {
  users: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
  allUsers?: User[];
  onViewAll?: () => void;
  onUserClick?: (user: User) => void;
}

// Role colors
const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30';
    case 'organizer':
      return 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-cyan-500/30';
    case 'rozhodca':
      return 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30';
    case 'verejnost':
    default:
      return 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/30';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'organizer':
      return 'Organizátor';
    case 'referee':
      return 'Rozhodca';
    case 'public':
    default:
      return 'Verejnosť';
  }
};

export function ActivityTable({ users, allUsers = [], onViewAll, onUserClick }: ActivityTableProps) {
  // Transliterate Slovak diacritics to ASCII
  const transliterate = (text: string): string => {
    const diacriticsMap: { [key: string]: string } = {
      'á': 'a', 'ä': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e',
      'í': 'i', 'ľ': 'l', 'ĺ': 'l', 'ň': 'n', 'ó': 'o', 'ô': 'o',
      'ŕ': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y',
      'ž': 'z', 'Á': 'A', 'Ä': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E',
      'Ě': 'E', 'Í': 'I', 'Ľ': 'L', 'Ĺ': 'L', 'Ň': 'N', 'Ó': 'O',
      'Ô': 'O', 'Ŕ': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ů': 'U',
      'Ý': 'Y', 'Ž': 'Z'
    };
    return text.replace(/[^\w\s@.-]/g, char => diacriticsMap[char] || '');
  };

  // Get user details by matching user name from activity
  const enrichedUsers = users.slice(0, 5).map(activity => {
    const fullUser = allUsers?.find(u => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      return fullName === (activity.user || '') || u.email === (activity.user || '');
    });
    
    const userName = activity.user || 'Neznámy používateľ';
    const nameParts = userName.split(' ');
    const uniqueId = `${activity.id}-${activity.timestamp}`;
    
    // Create safe email from username
    let safeEmail: string;
    if (userName.includes('@')) {
      safeEmail = userName;
    } else {
      const slug = transliterate(userName)
        .toLowerCase()
        .replace(/[^\w-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      safeEmail = slug.length > 0 ? `${slug}@system.local` : 'neznamy-pouzivatel@system.local';
    }
    
    return {
      ...activity,
      uniqueKey: uniqueId,
      fullUser: fullUser || {
        id: uniqueId,
        email: safeEmail,
        firstName: nameParts[0] || 'Neznámy',
        lastName: nameParts[1] || 'používateľ',
        role: 'public',
        active: true,
        createdAt: new Date(activity.timestamp),
      }
    };
  });

  // Get initials from name
  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  return (
    <Card className="bg-card border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Posledné Registrácie</h3>
        {onViewAll && (
          <Button
            variant="link"
            className="text-blue-400 hover:text-blue-300 p-0 h-auto"
            onClick={onViewAll}
          >
            Zobraziť všetkých
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                Meno
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                Email
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                Rola
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                Dátum
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                Status
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-2">
                Akcia
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {enrichedUsers.map((item) => (
              <tr key={item.uniqueKey || item.id} className="hover:bg-accent/5 transition-colors">
                <td className="py-4 px-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-primary/20 text-primary">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                        {getInitials(item.fullUser.firstName, item.fullUser.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium text-foreground">
                      {item.fullUser.firstName || item.fullUser.lastName 
                        ? `${item.fullUser.firstName || ''} ${item.fullUser.lastName || ''}`.trim()
                        : item.fullUser.email.split('@')[0]
                      }
                    </div>
                  </div>
                </td>
                <td className="py-4 px-2 text-sm text-muted-foreground">
                  {item.fullUser.email.includes('@') ? item.fullUser.email : `${item.fullUser.email}@system`}
                </td>
                <td className="py-4 px-2">
                  <Badge 
                    variant="outline" 
                    className={`${getRoleBadgeColor(item.fullUser.role)} text-xs px-2 py-1`}
                  >
                    {getRoleLabel(item.fullUser.role)}
                  </Badge>
                </td>
                <td className="py-4 px-2 text-sm text-muted-foreground">
                  {format(new Date(item.timestamp), "d.M., HH:mm", { locale: sk })}
                </td>
                <td className="py-4 px-2">
                  <Badge 
                    variant="outline"
                    className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30 text-xs px-2 py-1"
                  >
                    Aktívny
                  </Badge>
                </td>
                <td className="py-4 px-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    onClick={() => {
                      // Try to find the real user by name from activity
                      const realUser = item.user ? allUsers?.find((u: User) => {
                        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
                        const searchName = item.user?.toLowerCase() || '';
                        return fullName === searchName || u.email?.toLowerCase() === searchName;
                      }) : null;
                      // Use real user if found, otherwise use the enriched fallback
                      onUserClick?.(realUser || item.fullUser);
                    }}
                  >
                    Detail
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {enrichedUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Žiadne registrácie
          </div>
        )}
      </div>
    </Card>
  );
}
