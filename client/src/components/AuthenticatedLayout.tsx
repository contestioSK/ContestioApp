import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import TopNavigationShell from "@/components/navigation/TopNavigationShell";

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return <TopNavigationShell>{children}</TopNavigationShell>;
}
