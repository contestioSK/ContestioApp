import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserResult {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface UserAutocompleteProps {
  value: string;
  selectedUserId?: string | null;
  onChange: (name: string, userId?: string | null) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function UserAutocomplete({
  value,
  selectedUserId,
  onChange,
  onClear,
  placeholder = "Začnite písať meno...",
  disabled = false,
  className,
  "data-testid": testId,
}: UserAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<UserResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchUsers = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setIsOpen(data.length > 0);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue, null);
    setSelectedUser(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchUsers(newValue);
    }, 300);
  };

  const handleSelectUser = (user: UserResult) => {
    const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
    setQuery(displayName);
    setSelectedUser(user);
    onChange(displayName, user.id);
    setIsOpen(false);
    setResults([]);
  };

  const handleClearSelection = () => {
    setQuery("");
    setSelectedUser(null);
    onChange("", null);
    if (onClear) onClear();
  };

  const getInitials = (user: UserResult) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled || !!selectedUserId}
          className={cn(
            selectedUserId && "pr-20 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
          )}
          data-testid={testId}
        />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {selectedUserId && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              PriVode
            </span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="py-1">
            {results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  PriVode
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedUserId && query.length >= 2 && !isLoading && results.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Používateľ nebude dostávať notifikácie (nemá účet v PriVode)
        </p>
      )}
    </div>
  );
}
