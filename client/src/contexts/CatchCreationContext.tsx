import { createContext, useContext, useState, ReactNode } from "react";

interface CatchCreationContextType {
  isCreateOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
}

const CatchCreationContext = createContext<CatchCreationContextType | undefined>(undefined);

export function CatchCreationProvider({ children }: { children: ReactNode }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const openCreate = () => setIsCreateOpen(true);
  const closeCreate = () => setIsCreateOpen(false);

  return (
    <CatchCreationContext.Provider value={{ isCreateOpen, openCreate, closeCreate }}>
      {children}
    </CatchCreationContext.Provider>
  );
}

export function useCatchCreation() {
  const context = useContext(CatchCreationContext);
  if (context === undefined) {
    throw new Error("useCatchCreation must be used within a CatchCreationProvider");
  }
  return context;
}
