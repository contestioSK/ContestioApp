import { useState } from "react";
import { useLocation } from "wouter";
import { Fish, Scale, Settings, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserMode, type UserMode } from "@/contexts/UserModeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const modeConfig: Record<UserMode, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  user: { icon: Fish, label: "Rybár", color: "text-teal-400" },
  referee: { icon: Scale, label: "Rozhodca", color: "text-cyan-400" },
  organizer: { icon: Settings, label: "Organizátor", color: "text-purple-400" },
};

export function ModeSwitcher() {
  const [, setLocation] = useLocation();
  const {
    activeMode,
    activeCompetitionId,
    setActiveMode,
    hasMultipleRoles,
    availableRoles,
    refereeCompetitions,
    organizerCompetitions,
  } = useUserMode();

  const [isOpen, setIsOpen] = useState(false);

  if (!hasMultipleRoles) {
    return null;
  }

  const currentConfig = modeConfig[activeMode];
  const CurrentIcon = currentConfig.icon;

  const handleModeChange = (mode: UserMode, competitionId?: string) => {
    setActiveMode(mode, competitionId);
    setIsOpen(false);
    
    switch (mode) {
      case 'user':
        setLocation("/diary");
        break;
      case 'referee':
        setLocation("/referee-interface");
        break;
      case 'organizer':
        if (competitionId) {
          setLocation(`/organizer/competition/${competitionId}`);
        } else {
          setLocation("/organizer");
        }
        break;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10"
        >
          <CurrentIcon className={`w-4 h-4 ${currentConfig.color}`} />
          <span className="text-sm font-medium hidden sm:inline">{currentConfig.label}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-slate-900 border-slate-700">
        <DropdownMenuLabel className="text-slate-400 text-xs">
          Prepnúť režim
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        
        {availableRoles.includes('user') && (
          <DropdownMenuItem
            onClick={() => handleModeChange('user')}
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-800"
          >
            <Fish className="w-4 h-4 text-teal-400" />
            <div className="flex-1">
              <p className="font-medium">Rybár</p>
              <p className="text-xs text-slate-400">Denník úlovkov</p>
            </div>
            {activeMode === 'user' && <Check className="w-4 h-4 text-teal-400" />}
          </DropdownMenuItem>
        )}

        {availableRoles.includes('referee') && refereeCompetitions.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuLabel className="text-slate-400 text-xs">
              Rozhodca
            </DropdownMenuLabel>
            {refereeCompetitions.map((comp) => (
              <DropdownMenuItem
                key={comp.id}
                onClick={() => handleModeChange('referee', comp.id)}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-800"
              >
                <Scale className="w-4 h-4 text-cyan-400" />
                <div className="flex-1">
                  <p className="font-medium truncate">{comp.name}</p>
                  <p className="text-xs text-slate-400">Sektor: {comp.assignedSector}</p>
                </div>
                {activeMode === 'referee' && activeCompetitionId === comp.id && (
                  <Check className="w-4 h-4 text-cyan-400" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {availableRoles.includes('organizer') && organizerCompetitions.active.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuLabel className="text-slate-400 text-xs">
              Organizátor
            </DropdownMenuLabel>
            {organizerCompetitions.active.map((comp) => (
              <DropdownMenuItem
                key={comp.id}
                onClick={() => handleModeChange('organizer', comp.id)}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-800"
              >
                <Settings className="w-4 h-4 text-purple-400" />
                <div className="flex-1">
                  <p className="font-medium truncate">{comp.name}</p>
                  <p className="text-xs text-slate-400">Aktívna súťaž</p>
                </div>
                {activeMode === 'organizer' && activeCompetitionId === comp.id && (
                  <Check className="w-4 h-4 text-purple-400" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ModeSwitcher;
