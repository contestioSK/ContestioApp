import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, Fish, MapPin, BookOpen, X } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface SearchResult {
  catches: Array<{
    id: string;
    fishType: string;
    weight: string;
    spot: string | null;
    capturedAt: string;
  }>;
  trips: Array<{
    id: string;
    name: string;
    location: string;
    startDate: string;
  }>;
  areas: Array<{
    name: string;
    count: number;
  }>;
}

interface DiarySearchProps {
  className?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function DiarySearch({ className = "", isMobile = false, onClose }: DiarySearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Search query
  const { data: results, isLoading } = useQuery<SearchResult>({
    queryKey: ['/api/diary/search', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/diary/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown when results are available
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  const handleResultClick = (type: 'catch' | 'trip', id: string) => {
    setQuery("");
    setIsOpen(false);
    onClose?.();
    
    if (type === 'catch') {
      setLocation(`/diary/catch/${id}`);
    } else {
      setLocation(`/diary/trip/${id}`);
    }
  };

  const hasResults = results && (
    results.catches.length > 0 || 
    results.trips.length > 0 || 
    results.areas.length > 0
  );

  const showDropdown = isOpen && debouncedQuery.length >= 2;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Hľadať v mojom denníku..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>
        
        <div className="p-4 overflow-auto max-h-[calc(100vh-80px)]">
          {isLoading && debouncedQuery.length >= 2 && (
            <p className="text-sm text-muted-foreground text-center py-4">Hľadám...</p>
          )}
          
          {!isLoading && debouncedQuery.length >= 2 && !hasResults && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">V tvojom denníku sa nič nenašlo.</p>
              <p className="text-xs text-muted-foreground mt-2">
                Tip: Skontroluj názov revíru alebo dátum úlovku.
              </p>
            </div>
          )}
          
          {hasResults && (
            <div className="space-y-6">
              {results.catches.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Úlovky
                  </h3>
                  <div className="space-y-1">
                    {results.catches.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleResultClick('catch', c.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-left"
                      >
                        <Fish className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {c.fishType === 'mirror' ? 'Lysec' : c.fishType === 'scaly' ? 'Šupináč' : c.fishType} – {parseFloat(c.weight).toFixed(1)} kg
                          </p>
                          {c.spot && (
                            <p className="text-xs text-muted-foreground truncate">{c.spot}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {results.trips.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Výpravy
                  </h3>
                  <div className="space-y-1">
                    {results.trips.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleResultClick('trip', t.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-left"
                      >
                        <BookOpen className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t.location} • {format(new Date(t.startDate), 'd. MMM yyyy', { locale: sk })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {results.areas.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Revíry
                  </h3>
                  <div className="space-y-1">
                    {results.areas.map((a, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.count} úlovkov</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {debouncedQuery.length < 2 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Napíš aspoň 2 znaky pre vyhľadávanie
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        placeholder="Hľadať v mojom denníku..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => debouncedQuery.length >= 2 && setIsOpen(true)}
        className="pl-10 bg-muted border-border focus:border-primary h-10 text-foreground placeholder:text-muted-foreground"
        data-testid="topbar-search"
      />
      
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
        >
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">Hľadám...</p>
          )}
          
          {!isLoading && !hasResults && (
            <div className="text-center py-6 px-4">
              <p className="text-sm text-muted-foreground">V tvojom denníku sa nič nenašlo.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Skontroluj názov revíru alebo dátum úlovku.
              </p>
            </div>
          )}
          
          {hasResults && (
            <div className="max-h-80 overflow-auto">
              {results.catches.length > 0 && (
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Úlovky
                  </h3>
                  {results.catches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleResultClick('catch', c.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-left"
                    >
                      <Fish className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.fishType === 'mirror' ? 'Lysec' : c.fishType === 'scaly' ? 'Šupináč' : c.fishType} – {parseFloat(c.weight).toFixed(1)} kg
                        </p>
                        {c.spot && (
                          <p className="text-xs text-muted-foreground truncate">{c.spot}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {results.trips.length > 0 && (
                <div className="p-2 border-t border-border">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Výpravy
                  </h3>
                  {results.trips.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleResultClick('trip', t.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-left"
                    >
                      <BookOpen className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.location} • {format(new Date(t.startDate), 'd. MMM', { locale: sk })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {results.areas.length > 0 && (
                <div className="p-2 border-t border-border">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Revíry
                  </h3>
                  {results.areas.map((a, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-2 py-2 rounded-md"
                    >
                      <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.count} úlovkov</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
