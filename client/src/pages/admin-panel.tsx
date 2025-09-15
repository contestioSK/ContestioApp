import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Edit, Eye, Users, UserCheck, UserX } from "lucide-react";
import type { Competition, Team, TeamMember } from "@shared/schema";

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [selectedCompetition, setSelectedCompetition] = useState<string>("");

  // Redirect if not authenticated or not organizer
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'organizer')) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: competitions, isLoading: competitionsLoading, error } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
    enabled: isAuthenticated && user?.role === 'organizer',
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<(Team & { members: TeamMember[] })[]>({
    queryKey: ["/api/competitions", selectedCompetition, "teams"],
    enabled: isAuthenticated && !!selectedCompetition,
  });

  const updateTeamStatusMutation = useMutation({
    mutationFn: async ({ teamId, status, sector }: { teamId: string; status: string; sector?: string }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/status`, { status, sector });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Team status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", selectedCompetition, "teams"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update team status",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  const handleApproveTeam = (teamId: string, sector: string) => {
    updateTeamStatusMutation.mutate({ teamId, status: 'approved', sector });
  };

  const handleRejectTeam = (teamId: string) => {
    updateTeamStatusMutation.mutate({ teamId, status: 'rejected' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-secondary text-secondary-foreground">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-accent text-accent-foreground">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive text-destructive-foreground">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="overflow-hidden">
          
          {/* Admin Header */}
          <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <p className="text-white/80">Competition Management</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-white/80">Organizer Dashboard</span>
                <Button variant="outline" className="border-white/20 hover:bg-white/20 text-white">
                  Export Data
                </Button>
              </div>
            </div>
          </div>

          {/* Competition Selector */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-foreground">Select Competition:</label>
              <Select value={selectedCompetition} onValueChange={setSelectedCompetition}>
                <SelectTrigger className="w-64" data-testid="select-competition">
                  <SelectValue placeholder="Choose a competition" />
                </SelectTrigger>
                <SelectContent>
                  {competitions?.map((competition: Competition) => (
                    <SelectItem key={competition.id} value={competition.id}>
                      {competition.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedCompetition && (
            <Tabs defaultValue="teams" className="w-full">
              
              {/* Tab Navigation */}
              <div className="border-b border-border">
                <TabsList className="flex space-x-8 px-6 bg-transparent">
                  <TabsTrigger value="teams" className="py-4 border-b-2 border-primary text-primary font-medium text-sm">
                    Teams
                  </TabsTrigger>
                  <TabsTrigger value="referees" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                    Referees
                  </TabsTrigger>
                  <TabsTrigger value="sponsors" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                    Sponsors
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="py-4 text-muted-foreground hover:text-foreground font-medium text-sm">
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Team Management Tab */}
              <TabsContent value="teams" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Team Management</h2>
                    <p className="text-muted-foreground">Approve registrations and assign sectors</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        <SelectItem value="pending">Pending Approval</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Teams Table */}
                {teamsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : teams?.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">No teams registered yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Team Name</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Members</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sector</th>
                          <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams?.map((team: Team & { members: TeamMember[] }) => (
                          <tr key={team.id} className="border-b border-border" data-testid={`row-team-${team.id}`}>
                            <td className="p-4">
                              <div className="font-medium text-foreground">{team.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Registered {new Date(team.createdAt!).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-foreground">
                                {team.members.map(m => m.name).join(', ')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                              </div>
                            </td>
                            <td className="p-4">
                              {getStatusBadge(team.status)}
                            </td>
                            <td className="p-4">
                              {team.status === 'approved' ? (
                                <Select 
                                  value={team.sector || ''} 
                                  onValueChange={(sector) => handleApproveTeam(team.id, sector)}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Assign" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">Sector A</SelectItem>
                                    <SelectItem value="B">Sector B</SelectItem>
                                    <SelectItem value="C">Sector C</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not assigned</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {team.status === 'pending' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                      onClick={() => handleApproveTeam(team.id, 'A')}
                                      disabled={updateTeamStatusMutation.isPending}
                                      data-testid={`button-approve-${team.id}`}
                                    >
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRejectTeam(team.id)}
                                      disabled={updateTeamStatusMutation.isPending}
                                      data-testid={`button-reject-${team.id}`}
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" data-testid={`button-edit-${team.id}`}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" data-testid={`button-view-${team.id}`}>
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Other tabs would be implemented similarly */}
              <TabsContent value="referees" className="p-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Referee management coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="sponsors" className="p-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Sponsor management coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="p-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Competition settings coming soon</p>
                </div>
              </TabsContent>

            </Tabs>
          )}

          {!selectedCompetition && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground text-lg">Please select a competition to manage</p>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}
