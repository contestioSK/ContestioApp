import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ExternalLink, Trophy, Eye } from "lucide-react";
import type { TeamTopAverageData } from "../types";

interface TeamAverageTableProps {
  data: TeamTopAverageData[];
  title: string;
  description: string;
  competitionId?: string;
}

export function TeamAverageTable({ data, title, description, competitionId }: TeamAverageTableProps) {
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamTopAverageData | null>(null);

  const displayedTeams = data.slice(0, 10);
  const hasMoreTeams = data.length > 10;

  // This is a table component, not a chart
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">Poradie</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tím</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Priemerná váha</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Počet rýb</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Akcia</th>
                </tr>
              </thead>
              <tbody>
                {displayedTeams.map((team, index) => (
                  <tr 
                    key={index}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedTeam(team)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2 font-bold">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-medium text-foreground">{team.teamName}</td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-primary">{team.averageWeight} kg</span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {team.fishCount} / {team.maxFish}
                    </td>
                    <td className="p-3 text-center">
                      {team.teamId && competitionId && (
                        <Link href={`/team/${team.teamId}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMoreTeams && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowAllTeams(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Zobraziť všetky tímy ({data.length} celkem)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Table Dialog */}
      <Dialog open={showAllTeams} onOpenChange={setShowAllTeams}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              {title} - Všetky tímy
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">Poradie</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Tím</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Priemerná váha</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Počet rýb</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Akcia</th>
                </tr>
              </thead>
              <tbody>
                {data.map((team, index) => (
                  <tr 
                    key={index}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2 font-bold">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-medium text-foreground">{team.teamName}</td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-primary">{team.averageWeight} kg</span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {team.fishCount} / {team.maxFish}
                    </td>
                    <td className="p-3 text-center">
                      {team.teamId && competitionId && (
                        <Link href={`/team/${team.teamId}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Team Detail Modal */}
      <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              {selectedTeam?.teamName}
            </DialogTitle>
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Priemerná váha</p>
                  <p className="text-2xl font-bold text-primary">{selectedTeam.averageWeight} kg</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Počet rýb</p>
                  <p className="text-2xl font-bold">{selectedTeam.fishCount} / {selectedTeam.maxFish}</p>
                </div>
              </div>
              {selectedTeam.teamId && competitionId && (
                <Link 
                  href={`/team/${selectedTeam.teamId}`}
                  onClick={() => setSelectedTeam(null)}
                >
                  <Button className="w-full" variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Zobraziť detail tímu
                  </Button>
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
