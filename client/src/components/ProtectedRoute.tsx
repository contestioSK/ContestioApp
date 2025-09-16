import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: ReactNode;
  roles?: string[];
};

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Načítavam...</span>
      </div>
    );
  }

  // If user is not authenticated, show landing page
  if (!user) {
    return <Landing />;
  }

  // If roles are specified and user doesn't have required role, show not found
  if (roles && !roles.includes(user.role)) {
    return <NotFound />;
  }

  // User is authenticated and has required role, render children
  return <>{children}</>;
}