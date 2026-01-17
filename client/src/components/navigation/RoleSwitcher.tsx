import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useUserMode, type UserMode } from "@/contexts/UserModeContext";
import { Button } from "@/components/ui/button";
import { ChevronDown, BookOpen, Shield, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { 
    activeMode, 
    setActiveMode, 
    hasMultipleRoles, 
    availableRoles,
    refereeCompetitions,
    organizerCompetitions 
  } = useUserMode();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!hasMultipleRoles) {
    return null;
  }

  const handleModeChange = async (mode: UserMode, competitionId?: string) => {
    await setActiveMode(mode, competitionId);
    setIsOpen(false);
    
    switch (mode) {
      case 'referee':
        setLocation('/referee-interface');
        break;
      case 'organizer':
        setLocation('/organizer');
        break;
      default:
        setLocation('/diary');
    }
  };

  const getModeIcon = (mode: UserMode) => {
    switch (mode) {
      case 'referee':
        return Shield;
      case 'organizer':
        return Building2;
      default:
        return BookOpen;
    }
  };

  const getModeLabel = (mode: UserMode) => {
    switch (mode) {
      case 'referee':
        return 'Rozhodca';
      case 'organizer':
        return 'Organizátor';
      default:
        return 'Denník';
    }
  };

  const getModeColor = (mode: UserMode) => {
    switch (mode) {
      case 'referee':
      case 'organizer':
        return 'text-orange-500';
      default:
        return 'text-cyan-500';
    }
  };

  const ActiveIcon = getModeIcon(activeMode);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "gap-2 border-border/50",
          activeMode !== 'user' && "border-orange-500/50 bg-orange-500/10"
        )}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="role-switcher"
      >
        <ActiveIcon className={cn("h-4 w-4", getModeColor(activeMode))} />
        <span className="hidden lg:inline">{getModeLabel(activeMode)}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </Button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden z-50"
          data-testid="role-switcher-dropdown"
        >
          <div className="p-2">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Prepnúť režim
            </p>

            {/* User Mode */}
            {availableRoles.includes('user') && (
              <button
                onClick={() => handleModeChange('user')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  activeMode === 'user' 
                    ? "bg-cyan-500/10 text-cyan-500" 
                    : "hover:bg-muted"
                )}
              >
                <BookOpen className="h-4 w-4" />
                <span className="flex-1 text-left text-sm">Rybársky denník</span>
                {activeMode === 'user' && <Check className="h-4 w-4" />}
              </button>
            )}

            {/* Referee Mode */}
            {availableRoles.includes('referee') && refereeCompetitions.length > 0 && (
              <>
                <div className="my-2 h-px bg-border/50" />
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Rozhodca
                </p>
                {refereeCompetitions.map((competition) => (
                  <button
                    key={competition.id}
                    onClick={() => handleModeChange('referee', competition.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      activeMode === 'referee'
                        ? "bg-orange-500/10 text-orange-500" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    <div className="flex-1 text-left">
                      <p className="text-sm truncate">{competition.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Sektor: {competition.assignedSector}
                      </p>
                    </div>
                    {activeMode === 'referee' && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </>
            )}

            {/* Organizer Mode */}
            {availableRoles.includes('organizer') && (
              <>
                <div className="my-2 h-px bg-border/50" />
                <button
                  onClick={() => handleModeChange('organizer')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    activeMode === 'organizer'
                      ? "bg-orange-500/10 text-orange-500" 
                      : "hover:bg-muted"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="flex-1 text-left text-sm">Organizátor</span>
                  {activeMode === 'organizer' && <Check className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
