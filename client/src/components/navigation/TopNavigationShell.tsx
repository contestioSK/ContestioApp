import { ReactNode } from "react";
import TopBar from "./TopBar";
import { useAuth } from "@/hooks/useAuth";

interface TopNavigationShellProps {
  children: ReactNode;
}

export default function TopNavigationShell({ children }: TopNavigationShellProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
