import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import CompetitionDetail from "@/pages/competition-detail";
import TeamDetail from "@/pages/team-detail";
import AdminPanel from "@/pages/admin-panel";
import RefereeInterface from "@/pages/referee-interface";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  const { isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/competition/:id" component={CompetitionDetail} />
      <Route path="/team/:teamId" component={TeamDetail} />
      <Route path="/admin-panel">
        <ProtectedRoute roles={["organizer"]}>
          <AdminPanel />
        </ProtectedRoute>
      </Route>
      <Route path="/referee-interface">
        <ProtectedRoute roles={["referee", "organizer"]}>
          <RefereeInterface />
        </ProtectedRoute>
      </Route>
      {!isLoading && <Route component={NotFound} />}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
