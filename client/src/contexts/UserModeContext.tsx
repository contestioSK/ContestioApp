import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

export type UserMode = 'user' | 'referee' | 'organizer';

interface RefereeCompetition {
  id: string;
  name: string;
  assignedSector: string;
  startDate: Date;
  endDate: Date;
}

interface OrganizerCompetition {
  id: string;
  name: string;
  status: string;
  startDate: Date;
  endDate: Date;
}

interface UserContextData {
  userId: string;
  email: string;
  availableRoles: string[];
  needsRoleSelection: boolean;
  refereeCompetitions: RefereeCompetition[];
  organizerCompetitions: {
    active: OrganizerCompetition[];
    completed: OrganizerCompetition[];
  };
  sessionMode: UserMode | null;
  sessionCompetitionId: string | null;
}

interface UserModeContextType {
  activeMode: UserMode;
  activeCompetitionId: string | null;
  setActiveMode: (mode: UserMode, competitionId?: string) => Promise<void>;
  contextData: UserContextData | null;
  isLoading: boolean;
  needsRoleSelection: boolean;
  hasMultipleRoles: boolean;
  availableRoles: string[];
  refereeCompetitions: RefereeCompetition[];
  organizerCompetitions: {
    active: OrganizerCompetition[];
    completed: OrganizerCompetition[];
  };
  resetMode: () => void;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: ReactNode }) {
  const [activeMode, setActiveModeState] = useState<UserMode>('user');
  const [activeCompetitionId, setActiveCompetitionId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: contextData, isLoading } = useQuery<UserContextData>({
    queryKey: ["/api/me/context"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const setActiveMode = useCallback(async (mode: UserMode, competitionId?: string) => {
    setActiveModeState(mode);
    setActiveCompetitionId(competitionId || null);
    
    sessionStorage.setItem('activeMode', mode);
    if (competitionId) {
      sessionStorage.setItem('activeCompetitionId', competitionId);
    } else {
      sessionStorage.removeItem('activeCompetitionId');
    }
    
    try {
      await apiRequest('POST', '/api/me/mode', { mode, competitionId });
    } catch (error) {
      console.error('[UserMode] Failed to persist mode to backend:', error);
    }
  }, []);

  const resetMode = useCallback(() => {
    setActiveModeState('user');
    setActiveCompetitionId(null);
    sessionStorage.removeItem('activeMode');
    sessionStorage.removeItem('activeCompetitionId');
    setInitialized(false);
  }, []);

  useEffect(() => {
    if (!initialized && !isLoading && contextData) {
      // Priority: backend session mode > sessionStorage > default 'user'
      const backendMode = contextData.sessionMode;
      const backendCompetitionId = contextData.sessionCompetitionId;
      const savedMode = sessionStorage.getItem('activeMode') as UserMode | null;
      const savedCompetitionId = sessionStorage.getItem('activeCompetitionId');
      
      // Use backend session if available and valid
      if (backendMode && contextData.availableRoles.includes(backendMode)) {
        setActiveModeState(backendMode);
        setActiveCompetitionId(backendCompetitionId);
        sessionStorage.setItem('activeMode', backendMode);
        if (backendCompetitionId) {
          sessionStorage.setItem('activeCompetitionId', backendCompetitionId);
        }
      }
      // Fallback to sessionStorage
      else if (savedMode && contextData.availableRoles.includes(savedMode)) {
        if (savedMode === 'referee' && savedCompetitionId) {
          const validCompetition = contextData.refereeCompetitions.some(c => c.id === savedCompetitionId);
          if (validCompetition) {
            setActiveModeState(savedMode);
            setActiveCompetitionId(savedCompetitionId);
          }
        } else if (savedMode === 'organizer' && savedCompetitionId) {
          const validCompetition = [...contextData.organizerCompetitions.active, ...contextData.organizerCompetitions.completed]
            .some(c => c.id === savedCompetitionId);
          if (validCompetition) {
            setActiveModeState(savedMode);
            setActiveCompetitionId(savedCompetitionId);
          }
        } else if (savedMode === 'user') {
          setActiveModeState('user');
        }
      }
      setInitialized(true);
    }
  }, [contextData, isLoading, initialized]);

  const availableRoles = contextData?.availableRoles || ['user'];
  const hasMultipleRoles = availableRoles.length > 1;
  const needsRoleSelection = contextData?.needsRoleSelection || false;

  return (
    <UserModeContext.Provider
      value={{
        activeMode,
        activeCompetitionId,
        setActiveMode,
        contextData: contextData || null,
        isLoading,
        needsRoleSelection,
        hasMultipleRoles,
        availableRoles,
        refereeCompetitions: contextData?.refereeCompetitions || [],
        organizerCompetitions: contextData?.organizerCompetitions || { active: [], completed: [] },
        resetMode,
      }}
    >
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error("useUserMode must be used within a UserModeProvider");
  }
  return context;
}
