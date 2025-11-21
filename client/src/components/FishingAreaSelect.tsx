import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FishingArea } from "@shared/schema";

// Simple command-like components since we don't have Command exported
const CommandList = ({ children }: { children: React.ReactNode }) => (
  <div className="max-h-[300px] overflow-y-auto">{children}</div>
);

const CommandEmpty = ({ children }: { children: React.ReactNode }) => (
  <div className="px-3 py-2 text-sm text-muted-foreground text-center">{children}</div>
);

const CommandGroup = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

const CommandItem = ({
  value,
  onSelect,
  children,
  "data-testid": testId,
}: {
  value: string;
  onSelect: (value: string) => void;
  children: React.ReactNode;
  "data-testid"?: string;
}) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    data-testid={testId}
    className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none cursor-pointer"
  >
    {children}
  </button>
);

interface FishingAreaSelectProps {
  value?: string;
  onChange: (value: string) => void;
}

export function FishingAreaSelect({ value, onChange }: FishingAreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: areas = [] } = useQuery<FishingArea[]>({
    queryKey: ["/api/fishing-areas", search],
    queryFn: async () => {
      const response = await fetch(`/api/fishing-areas?search=${encodeURIComponent(search)}`);
      if (!response.ok) throw new Error("Failed to fetch fishing areas");
      return response.json();
    },
    enabled: open || search.length > 0,
  });

  const selectedArea = areas.find(area => area.number === value || area.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid="button-select-fishing-area"
        >
          {selectedArea 
            ? `${selectedArea.number} - ${selectedArea.name.substring(0, 40)}...` 
            : "Vyberte revír..."
          }
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" side="bottom" align="start">
        <Command shouldFilter={false}>
          <div className="p-3 border-b">
            <Input
              placeholder="Hľadať číslo (2-4120-1-1) alebo názov (Váh)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-fishing-area"
              className="h-8"
            />
          </div>
          <CommandList>
            {areas.length === 0 ? (
              <CommandEmpty>Žiadne revíry nenájdené</CommandEmpty>
            ) : (
              <CommandGroup>
                {areas.map((area) => (
                  <CommandItem
                    key={area.id}
                    value={area.number}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                    data-testid={`option-fishing-area-${area.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        (value === area.number || value === area.name) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{area.number}</div>
                      <div className="text-xs text-muted-foreground">{area.name}</div>
                    </div>
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
