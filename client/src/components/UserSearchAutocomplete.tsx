import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronsUpDown, UserPlus, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface UserSearchAutocompleteProps {
  onSelect: (user: SearchedUser | null, newEmail?: string) => void;
  placeholder?: string;
  allowNewEmail?: boolean;
  excludeUserIds?: string[];
}

export function UserSearchAutocomplete({
  onSelect,
  placeholder = "Vyhľadajte používateľa...",
  allowNewEmail = true,
  excludeUserIds = [],
}: UserSearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: users = [], isLoading } = useQuery<SearchedUser[]>({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const filteredUsers = users.filter(user => !excludeUserIds.includes(user.id));

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSelect = (user: SearchedUser) => {
    setSelectedUser(user);
    setSearchQuery("");
    setOpen(false);
    onSelect(user);
  };

  const handleInviteNew = () => {
    if (isValidEmail(searchQuery)) {
      setOpen(false);
      onSelect(null, searchQuery);
      setSearchQuery("");
    }
  };

  const getUserDisplayName = (user: SearchedUser) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email;
  };

  const getInitials = (user: SearchedUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) return user.firstName[0].toUpperCase();
    return user.email[0].toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedUser.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{getInitials(selectedUser)}</AvatarFallback>
              </Avatar>
              <span>{getUserDisplayName(selectedUser)}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Zadajte meno alebo email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Vyhľadávam...</span>
              </div>
            )}

            {!isLoading && searchQuery.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Zadajte aspoň 2 znaky pre vyhľadávanie
              </div>
            )}

            {!isLoading && searchQuery.length >= 2 && filteredUsers.length === 0 && (
              <CommandEmpty>
                <div className="py-2">
                  <p className="text-muted-foreground">Žiadni používatelia nenájdení</p>
                  {allowNewEmail && isValidEmail(searchQuery) && (
                    <Button
                      variant="ghost"
                      className="mt-2 w-full justify-start"
                      onClick={handleInviteNew}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Pozvať: {searchQuery}
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            )}

            {!isLoading && filteredUsers.length > 0 && (
              <CommandGroup heading="Výsledky vyhľadávania">
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => handleSelect(user)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profileImageUrl || undefined} />
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getUserDisplayName(user)}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {selectedUser?.id === user.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {allowNewEmail && !isLoading && filteredUsers.length > 0 && isValidEmail(searchQuery) && (
              <CommandGroup heading="Alebo pozvite nového">
                <CommandItem
                  onSelect={handleInviteNew}
                  className="cursor-pointer"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Pozvať: {searchQuery}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
