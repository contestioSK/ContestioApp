import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: ReactNode;
  roles?: string[];
  redirectTo?: string;
};

export default function ProtectedRoute({ children, roles, redirectTo }: ProtectedRouteProps) {
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

  // If user is not authenticated, redirect or show landing page
  if (!user) {
    if (redirectTo) {
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/' && currentPath !== redirectTo) {
        localStorage.setItem('contestio_returnTo', currentPath);
      }
      return <Redirect to={redirectTo} />;
    }
    return <Landing />;
  }

  // If roles are specified and user doesn't have required role, show not found
  if (roles && !roles.includes(user.role)) {
    return <NotFound />;
  }

  // User is authenticated and has required role, render children
  return <>{children}</>;
}