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
import CompetitionCatches from "@/pages/competition-catches";
import TeamDetail from "@/pages/team-detail";
import SectorDetail from "@/pages/sector-detail";
import AdminPanel from "@/pages/admin-panel";
import RefereeInterface from "@/pages/referee-interface";
import RegisterCompetition from "@/pages/register-competition";
import RegisterTeam from "@/pages/register-team";
import AboutUs from "@/pages/about-us";
import Pricing from "@/pages/pricing";
import FAQ from "@/pages/faq";
import Contact from "@/pages/contact";
import RegistrationOpenPage from "@/pages/registration-open";
import UpcomingPage from "@/pages/upcoming";
import LivePage from "@/pages/live";
import FinishedPage from "@/pages/finished";
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  const { isLoading, user } = useAuth();

  return (
    <Switch>
      <Route path="/" component={user ? Home : Landing} />
      <Route path="/register-competition" component={RegisterCompetition} />
      <Route path="/register-team" component={RegisterTeam} />
      <Route path="/about-us" component={AboutUs} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />
      <Route path="/categories/registration-open" component={RegistrationOpenPage} />
      <Route path="/categories/upcoming" component={UpcomingPage} />
      <Route path="/categories/live" component={LivePage} />
      <Route path="/categories/finished" component={FinishedPage} />
      <Route path="/competition/:id" component={CompetitionDetail} />
      <Route path="/competition/:id/catches" component={CompetitionCatches} />
      <Route path="/competition/:competitionId/sector/:sector" component={SectorDetail} />
      <Route path="/team/:teamId" component={TeamDetail} />
      <Route path="/admin-panel">
        <ProtectedRoute roles={["organizer"]}>
          <AdminPanel />
        </ProtectedRoute>
      </Route>
      <Route path="/referee-interface" component={RefereeInterface} />
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
