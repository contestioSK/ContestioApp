import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Fish, Scale, Trophy, TrendingUp, Medal, Timer, Calculator, Target, Award, Crown, X } from "lucide-react";
import { getSideCompetitionLabel } from "@/lib/utils";
import { Link } from "wouter";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { Catch, Team, Competition } from "@shared/schema";
import { TeamFlag } from "@/components/team-flag";
import SideCompetitionExport from "./side-competition-export";

function getCompetitionFishTypeLabel(fishType: string): string {
  switch (fishType) {
    case 'scaly': return 'Šupináč';
    case 'mirror': return 'Lysec';
    default: return fishType;
  }
}

interface SideCompetitionStatsBarProps {
  catches: (Catch & { team?: Team })[];
  teams: Team[];
  competition: Competition;
  isLoading?: boolean;
  isOrganizer?: boolean;
  userTeamId?: string | null;
}

export default function SideCompetitionStatsBar({ 
  catches, 
  teams, 
  competition, 
  isLoading,
  isOrganizer = false,
  userTeamId = null
}: SideCompetitionStatsBarProps) {
  const [selectedCatch, setSelectedCatch] = useState<(Catch & { team?: Team }) | null>(null);
  const [selectedCompetitionLabel, setSelectedCompetitionLabel] = useState<string>("");

  // Don't show if no side competitions
  if (!competition.sideCompetitions || competition.sideCompetitions.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-background to-muted/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(Math.min(getOrganizedSideCompetitions(competition.sideCompetitions).length, 4))].map((_, i) => (
              <div key={i} className="text-center">
                <div className="w-8 h-8 bg-muted rounded-full mx-auto mb-2 animate-pulse"></div>
                <div className="h-3 bg-muted rounded w-12 mx-auto mb-1 animate-pulse"></div>
                <div className="h-5 bg-muted rounded w-16 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!catches || catches.length === 0) {
    return (
      <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-background to-muted/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {getOrganizedSideCompetitions(competition.sideCompetitions).map((sideCompetitionId, index) => (
              <div key={sideCompetitionId} className="text-center" data-testid={`side-competition-${sideCompetitionId}`}>
                <div className="w-8 h-8 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  {getSideCompetitionIcon(sideCompetitionId)}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{getSideCompetitionLabel(sideCompetitionId)}</p>
                <p className="text-lg font-bold text-foreground">-</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter and reorganize side competitions according to user requirements
  const organizedSideCompetitions = getOrganizedSideCompetitions(competition.sideCompetitions);
  const sideCompetitionResults = calculateSideCompetitions(catches, teams, organizedSideCompetitions);

  return (
    <Card className="mb-6 border-0 shadow-md bg-gradient-to-r from-background to-muted/20" data-testid="side-competition-stats-bar">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {organizedSideCompetitions.map((sideCompetitionId) => {
            const result = sideCompetitionResults[sideCompetitionId];
            if (!result) return null;

            const hasClickableCatch = !!result.winningCatch;
            const effectiveTeamId = result.winningCatch?.teamId || result.teamId;

            return (
              <div key={sideCompetitionId} className="text-center" data-testid={`side-competition-${sideCompetitionId}`}>
                <div className="w-8 h-8 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                  {getSideCompetitionIcon(sideCompetitionId)}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{getSideCompetitionLabel(sideCompetitionId)}</p>
                {hasClickableCatch ? (
                  <button
                    onClick={() => {
                      setSelectedCatch(result.winningCatch!);
                      setSelectedCompetitionLabel(getSideCompetitionLabel(sideCompetitionId));
                    }}
                    className="text-lg font-bold text-foreground hover:text-secondary transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                    data-testid={`value-${sideCompetitionId}`}
                  >
                    {result.value}
                  </button>
                ) : (
                  <p className="text-lg font-bold text-foreground" data-testid={`value-${sideCompetitionId}`}>
                    {result.value}
                  </p>
                )}
                {result.teamName && effectiveTeamId ? (
                  <Link 
                    href={`/team/${effectiveTeamId}`}
                    className="text-xs text-muted-foreground mt-0.5 hover:text-secondary transition-colors cursor-pointer underline decoration-dotted underline-offset-2 flex items-center gap-1"
                    data-testid={`team-${sideCompetitionId}`}
                  >
                    <TeamFlag country={result.winningCatch?.team?.country} size="xs" />{result.teamName}
                  </Link>
                ) : result.teamName && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1" data-testid={`team-${sideCompetitionId}`}>
                    <TeamFlag country={result.winningCatch?.team?.country} size="xs" />{result.teamName}
                  </p>
                )}
                {result.winningCatch && (isOrganizer || (userTeamId && result.winningCatch.teamId === userTeamId)) && (
                  <SideCompetitionExport
                    competition={competition}
                    sideCompetitionId={sideCompetitionId}
                    winningCatch={result.winningCatch}
                    canExport={true}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={!!selectedCatch} onOpenChange={(open) => !open && setSelectedCatch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-secondary" />
              {selectedCompetitionLabel}
            </DialogTitle>
          </DialogHeader>
          {selectedCatch && (
            <div className="space-y-4">
              {selectedCatch.photoUrl && (
                <div className="relative rounded-lg overflow-hidden">
                  <img 
                    src={selectedCatch.photoUrl} 
                    alt="Víťazný úlovok"
                    className="w-full h-auto max-h-80 object-contain bg-muted"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Váha</p>
                  <p className="font-bold text-lg">{parseFloat(selectedCatch.weight).toFixed(2)} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Typ ryby</p>
                  <p className="font-semibold">{getCompetitionFishTypeLabel(selectedCatch.fishType)}</p>
                </div>
                {selectedCatch.team?.name && (
                  <div>
                    <p className="text-muted-foreground">Tím</p>
                    <Link 
                      href={`/team/${selectedCatch.teamId}`}
                      className="font-semibold text-secondary hover:underline flex items-center gap-1"
                      onClick={() => setSelectedCatch(null)}
                    >
                      <TeamFlag country={selectedCatch.team.country} size="xs" />{selectedCatch.team.name}
                    </Link>
                  </div>
                )}
                {selectedCatch.submittedAt && (
                  <div>
                    <p className="text-muted-foreground">Dátum</p>
                    <p className="font-semibold">
                      {format(new Date(selectedCatch.submittedAt), "d. MMMM yyyy, HH:mm", { locale: sk })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function getSideCompetitionIcon(sideCompetitionId: string) {
  const iconClass = "w-4 h-4 text-secondary";
  
  switch (sideCompetitionId) {
    case 'big-fish-overall':
      return <Trophy className={iconClass} />;
    case 'big-common-carp':
    case 'big-mirror-carp':
      return <Fish className={iconClass} />;
    case 'first-catch':
    case 'last-catch':
      return <Timer className={iconClass} />;
    case 'most-fish-caught':
      return <Award className={iconClass} />;
    case 'best-5-fish':
    case 'best-3-fish':
      return <Calculator className={iconClass} />;
    case 'daily-big-fish':
    case 'dailyBigFish':
      return <Crown className={iconClass} />;
    case 'first-fish-over-15kg':
    case 'first-fish-over-20kg':
    case 'first-fish-over-25kg':
    case 'firstOver20':
    case 'firstOver25':
    case 'firstOver30':
      return <Target className={iconClass} />;
    case 'biggestFish':
      return <Trophy className={iconClass} />;
    case 'biggestScaly':
    case 'biggestMirror':
      return <Fish className={iconClass} />;
    default:
      return <Medal className={iconClass} />;
  }
}

function calculateSideCompetitions(
  catches: (Catch & { team?: Team })[], 
  teams: Team[], 
  sideCompetitions: string[]
): Record<string, { value: string; teamName?: string; teamId?: string; winningCatch?: Catch & { team?: Team } }> {
  const results: Record<string, { value: string; teamName?: string; teamId?: string; winningCatch?: Catch & { team?: Team } }> = {};

  for (const sideCompetitionId of sideCompetitions) {
    switch (sideCompetitionId) {
      case 'big-fish-overall':
        const biggestCatch = catches.reduce((max, current) => 
          parseFloat(current.weight) > parseFloat(max.weight) ? current : max
        );
        results[sideCompetitionId] = {
          value: `${parseFloat(biggestCatch.weight).toFixed(2)} kg`,
          teamName: biggestCatch.team?.name,
          winningCatch: biggestCatch
        };
        break;

      case 'big-common-carp':
        const scalyCatches = catches.filter(c => c.fishType === 'scaly');
        if (scalyCatches.length > 0) {
          const biggestScaly = scalyCatches.reduce((max, current) => 
            parseFloat(current.weight) > parseFloat(max.weight) ? current : max
          );
          results[sideCompetitionId] = {
            value: `${parseFloat(biggestScaly.weight).toFixed(2)} kg`,
            teamName: biggestScaly.team?.name,
            winningCatch: biggestScaly
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'big-mirror-carp':
        const mirrorCatches = catches.filter(c => c.fishType === 'mirror');
        if (mirrorCatches.length > 0) {
          const biggestMirror = mirrorCatches.reduce((max, current) => 
            parseFloat(current.weight) > parseFloat(max.weight) ? current : max
          );
          results[sideCompetitionId] = {
            value: `${parseFloat(biggestMirror.weight).toFixed(2)} kg`,
            teamName: biggestMirror.team?.name,
            winningCatch: biggestMirror
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'first-catch':
        const catchesWithTime = catches.filter(c => c.submittedAt);
        if (catchesWithTime.length > 0) {
          const sortedByTime = catchesWithTime.sort((a, b) => 
            new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime()
          );
          const firstCatch = sortedByTime[0];
          results[sideCompetitionId] = {
            value: `${parseFloat(firstCatch.weight).toFixed(2)} kg`,
            teamName: firstCatch.team?.name,
            winningCatch: firstCatch
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'last-catch':
        const catchesWithTimeDesc = catches.filter(c => c.submittedAt);
        if (catchesWithTimeDesc.length > 0) {
          const sortedByTimeDesc = catchesWithTimeDesc.sort((a, b) => 
            new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime()
          );
          const lastCatch = sortedByTimeDesc[0];
          results[sideCompetitionId] = {
            value: `${parseFloat(lastCatch.weight).toFixed(2)} kg`,
            teamName: lastCatch.team?.name,
            winningCatch: lastCatch
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'most-fish-caught':
        const teamCatchCounts = teams.map(team => ({
          team,
          count: catches.filter(c => c.teamId === team.id).length
        }));
        const mostFishTeam = teamCatchCounts.reduce((max, current) => 
          current.count > max.count ? current : max, { team: null as Team | null, count: 0 }
        );
        results[sideCompetitionId] = {
          value: mostFishTeam.count.toString(),
          teamName: mostFishTeam.team?.name,
          teamId: mostFishTeam.team?.id
        };
        break;

      case 'best-5-fish':
        const teamSum5 = teams.map(team => {
          const teamCatches = catches
            .filter(c => c.teamId === team.id)
            .map(c => parseFloat(c.weight))
            .sort((a, b) => b - a)
            .slice(0, 5);
          
          const sum = teamCatches.length >= 5 ? 
            teamCatches.reduce((sum, weight) => sum + weight, 0) : 0;
          
          return { team, sum, count: teamCatches.length };
        }).filter(t => t.count >= 5);

        const bestSum5Team = teamSum5.reduce((max, current) => 
          current.sum > max.sum ? current : max, { team: null as Team | null, sum: 0, count: 0 }
        );
        
        results[sideCompetitionId] = {
          value: bestSum5Team.team ? `${bestSum5Team.sum.toFixed(2)} kg` : "0 kg",
          teamName: bestSum5Team.team?.name,
          teamId: bestSum5Team.team?.id
        };
        break;

      case 'best-3-fish':
        const teamSum3 = teams.map(team => {
          const teamCatches = catches
            .filter(c => c.teamId === team.id)
            .map(c => parseFloat(c.weight))
            .sort((a, b) => b - a)
            .slice(0, 3);
          
          const sum = teamCatches.length >= 3 ? 
            teamCatches.reduce((sum, weight) => sum + weight, 0) : 0;
          
          return { team, sum, count: teamCatches.length };
        }).filter(t => t.count >= 3);

        const bestSum3Team = teamSum3.reduce((max, current) => 
          current.sum > max.sum ? current : max, { team: null as Team | null, sum: 0, count: 0 }
        );
        
        results[sideCompetitionId] = {
          value: bestSum3Team.team ? `${bestSum3Team.sum.toFixed(2)} kg` : "0 kg",
          teamName: bestSum3Team.team?.name,
          teamId: bestSum3Team.team?.id
        };
        break;

      case 'daily-big-fish':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayCatches = catches.filter(c => {
          if (!c.submittedAt) return false;
          const catchDate = new Date(c.submittedAt);
          return catchDate >= today && catchDate < tomorrow;
        });

        if (todayCatches.length > 0) {
          const dailyBiggest = todayCatches.reduce((max, current) => 
            parseFloat(current.weight) > parseFloat(max.weight) ? current : max
          );
          results[sideCompetitionId] = {
            value: `${parseFloat(dailyBiggest.weight).toFixed(2)} kg`,
            teamName: dailyBiggest.team?.name,
            winningCatch: dailyBiggest
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'first-fish-over-15kg':
      case 'first-fish-over-20kg':
      case 'first-fish-over-25kg':
      case 'firstOver20':
      case 'firstOver25':
      case 'firstOver30':
        const targetWeight = 
          sideCompetitionId === 'first-fish-over-15kg' ? 15 :
          sideCompetitionId === 'first-fish-over-20kg' || sideCompetitionId === 'firstOver20' ? 20 :
          sideCompetitionId === 'first-fish-over-25kg' || sideCompetitionId === 'firstOver25' ? 25 :
          sideCompetitionId === 'firstOver30' ? 30 : 20;
        
        const overWeightCatches = catches
          .filter(c => parseFloat(c.weight) >= targetWeight && c.submittedAt)
          .sort((a, b) => new Date(a.submittedAt!).getTime() - new Date(b.submittedAt!).getTime());

        if (overWeightCatches.length > 0) {
          const firstOverWeight = overWeightCatches[0];
          results[sideCompetitionId] = {
            value: `${parseFloat(firstOverWeight.weight).toFixed(2)} kg`,
            teamName: firstOverWeight.team?.name,
            winningCatch: firstOverWeight
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'biggestFish':
        if (catches.length > 0) {
          const biggestFishCatch = catches.reduce((max, current) => 
            parseFloat(current.weight) > parseFloat(max.weight) ? current : max
          );
          results[sideCompetitionId] = {
            value: `${parseFloat(biggestFishCatch.weight).toFixed(2)} kg`,
            teamName: biggestFishCatch.team?.name,
            winningCatch: biggestFishCatch
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'biggestScaly':
        const scalyCatchesNew = catches.filter(c => c.fishType === 'scaly');
        if (scalyCatchesNew.length > 0) {
          const biggestScalyNew = scalyCatchesNew.reduce((max, current) => 
            parseFloat(current.weight) > parseFloat(max.weight) ? current : max
          );
          results[sideCompetitionId] = {
            value: `${parseFloat(biggestScalyNew.weight).toFixed(2)} kg`,
            teamName: biggestScalyNew.team?.name,
            winningCatch: biggestScalyNew
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'biggestMirror':
        const mirrorCatchesNew = catches.filter(c => c.fishType === 'mirror');
        if (mirrorCatchesNew.length > 0) {
          const biggestMirrorNew = mirrorCatchesNew.reduce((max, current) => 
            parseFloat(current.weight) > parseFloat(max.weight) ? current : max
          );
          results[sideCompetitionId] = {
            value: `${parseFloat(biggestMirrorNew.weight).toFixed(2)} kg`,
            teamName: biggestMirrorNew.team?.name,
            winningCatch: biggestMirrorNew
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      case 'dailyBigFish':
        const todayNew = new Date();
        todayNew.setHours(0, 0, 0, 0);
        const tomorrowNew = new Date(todayNew);
        tomorrowNew.setDate(tomorrowNew.getDate() + 1);
        
        const todayCatchesNew = catches.filter(c => {
          if (!c.submittedAt) return false;
          const catchDate = new Date(c.submittedAt);
          return catchDate >= todayNew && catchDate < tomorrowNew;
        });

        if (todayCatchesNew.length > 0) {
          const dailyBiggestNew = todayCatchesNew.reduce((max, current) => 
            parseFloat(current.weight) > parseFloat(max.weight) ? current : max
          );
          results[sideCompetitionId] = {
            value: `${parseFloat(dailyBiggestNew.weight).toFixed(2)} kg`,
            teamName: dailyBiggestNew.team?.name,
            winningCatch: dailyBiggestNew
          };
        } else {
          results[sideCompetitionId] = { value: "0 kg" };
        }
        break;

      default:
        results[sideCompetitionId] = { value: "-" };
    }
  }

  return results;
}

function getOrganizedSideCompetitions(sideCompetitions: string[]): string[] {
  const organized: string[] = [];
  
  // Group 1: Fish types (big-common-carp, big-mirror-carp)
  if (sideCompetitions.includes('big-common-carp')) {
    organized.push('big-common-carp');
  }
  if (sideCompetitions.includes('big-mirror-carp')) {
    organized.push('big-mirror-carp');
  }
  
  // Group 2: Time-based (first-catch, last-catch)  
  if (sideCompetitions.includes('first-catch')) {
    organized.push('first-catch');
  }
  if (sideCompetitions.includes('last-catch')) {
    organized.push('last-catch');
  }
  
  // Group 3: Weight milestones (15kg, 20kg, 25kg in order)
  if (sideCompetitions.includes('first-fish-over-15kg')) {
    organized.push('first-fish-over-15kg');
  }
  if (sideCompetitions.includes('first-fish-over-20kg')) {
    organized.push('first-fish-over-20kg');
  }
  if (sideCompetitions.includes('first-fish-over-25kg')) {
    organized.push('first-fish-over-25kg');
  }
  
  // Add any other side competitions that are not excluded
  const excludedIds = ['big-fish-overall', 'daily-big-fish'];
  const otherCompetitions = sideCompetitions.filter(id => 
    !organized.includes(id) && !excludedIds.includes(id)
  );
  organized.push(...otherCompetitions);
  
  return organized;
}