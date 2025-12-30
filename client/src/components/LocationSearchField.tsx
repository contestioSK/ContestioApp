import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { MapPin, Search } from "lucide-react";
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
  placeholder = "Začnite písať názov revíru...",
  testId = "input-location"
}: LocationSearchFieldProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: suggestions = [], isLoading } = useQuery<FishingArea[]>({
    queryKey: [`/api/fishing-areas?search=${encodeURIComponent(search)}`],
    enabled: search.length >= 2,
    staleTime: 30000,
  });

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
              placeholder="Hľadať revír..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList>
            {search.length < 2 ? (
              <CommandEmpty>Zadajte aspoň 2 znaky...</CommandEmpty>
            ) : isLoading ? (
              <CommandEmpty>Načítavam...</CommandEmpty>
            ) : suggestions.length === 0 ? (
              <CommandEmpty>
                Žiadne výsledky. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto ml-1"
                  onClick={() => {
                    onChange(search);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  Použiť "{search}"
                </Button>
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Revíry">
                {suggestions.slice(0, 10).map((area) => (
                  <CommandItem
                    key={area.id}
                    value={area.number}
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
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
