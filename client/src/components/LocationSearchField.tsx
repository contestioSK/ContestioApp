import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { MapPin, Search, Plus } from "lucide-react";
import type { FishingArea } from "@shared/schema";

interface LocationSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
}

export function LocationSearchField({ 
  value, 
  onChange,
  placeholder = "Vyber revír alebo zadaj vlastnú lokalitu...",
  testId = "input-location"
}: LocationSearchFieldProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const normalized = search.trim();
  const canUseCustom = normalized.length >= 2;
  
  const { data: suggestions = [], isLoading } = useQuery<FishingArea[]>({
    queryKey: [`/api/fishing-areas?search=${encodeURIComponent(normalized)}`],
    enabled: canUseCustom,
    staleTime: 30000,
  });

  const useCustomLocation = () => {
    if (!canUseCustom) return;
    onChange(normalized);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={`w-full justify-between font-normal ${!value && "text-muted-foreground"}`}
          data-testid={testId}
        >
          <span className="truncate">{value || placeholder}</span>
          <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Hľadať revír alebo zadať vlastnú lokalitu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              data-testid="input-location-search"
            />
          </div>
          <CommandList>
            {isLoading && canUseCustom ? (
              <CommandEmpty>Načítavam...</CommandEmpty>
            ) : (
              <>
                {canUseCustom && suggestions.length > 0 && (
                  <>
                    <CommandGroup heading="Revíry">
                      {suggestions.slice(0, 10).map((area) => (
                        <CommandItem
                          key={area.id}
                          value={area.id}
                          onSelect={() => {
                            onChange(`${area.number} - ${area.name}`);
                            setSearch("");
                            setIsOpen(false);
                          }}
                          className="flex flex-col items-start gap-1 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">{area.number}</Badge>
                            <span className="font-medium text-sm">{area.name}</span>
                          </div>
                          {area.notes && (
                            <span className="text-xs text-muted-foreground line-clamp-1 pl-1">
                              {area.notes}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}
                <CommandGroup heading={suggestions.length === 0 || !canUseCustom ? "Vlastná lokalita" : "Alebo"}>
                  <CommandItem
                    value="__custom__"
                    onSelect={useCustomLocation}
                    disabled={!canUseCustom}
                    className="flex items-center gap-2 py-2"
                    data-testid="button-use-custom-location"
                  >
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-teal-500/10 text-teal-500 shrink-0">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      {canUseCustom ? (
                        <>
                          <span className="text-sm font-medium truncate">Použiť „{normalized}"</span>
                          <span className="text-xs text-muted-foreground">Súkromný rybník alebo iné miesto</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-muted-foreground">Vlastná lokalita</span>
                          <span className="text-xs text-muted-foreground">Zadaj aspoň 2 znaky pre súkromný rybník</span>
                        </>
                      )}
                    </div>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
