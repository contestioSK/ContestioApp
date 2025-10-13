import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Search, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserSearchResult {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface UserSearchProps {
  battleId?: string;
  selectedUsers: string[];
  onSelectUser: (userId: string) => void;
  onRemoveUser: (userId: string) => void;
}

export function UserSearch({ battleId, selectedUsers, onSelectUser, onRemoveUser }: UserSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Build query URL with proper encoding
  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    params.append('q', searchQuery);
    if (battleId) {
      params.append('battleId', battleId);
    }
    return `/api/users/search?${params.toString()}`;
  };

  const { data: users = [], isLoading } = useQuery<UserSearchResult[]>({
    queryKey: [buildQueryUrl()],
    enabled: searchQuery.length >= 2,
  });

  const handleSelect = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onRemoveUser(userId);
    } else {
      onSelectUser(userId);
    }
  };

  const getUserDisplay = (user: UserSearchResult) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid="button-user-search"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Hľadať používateľov
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Zadajte meno alebo email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            data-testid="input-user-search"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Vyhľadávanie..." : searchQuery.length < 2 ? "Zadajte aspoň 2 znaky" : "Žiadni používatelia"}
            </CommandEmpty>
            {users.length > 0 && (
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelect(user.id)}
                    data-testid={`user-item-${user.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {user.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt={getUserDisplay(user)}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{getUserDisplay(user)}</span>
                        {user.firstName && <span className="text-sm text-muted-foreground">{user.email}</span>}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedUsers.includes(user.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
