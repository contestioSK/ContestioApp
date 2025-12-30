import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Link } from "wouter";
import { ExternalLink, Trophy, Fish, Scale } from "lucide-react";
import { getChartColorByIndex } from "@/lib/colors";
import type { TeamTopAverageData } from "../types";

interface TeamAverageChartProps {
  data: TeamTopAverageData[];
  title: string;
  description: string;
  competitionId?: string;
}

const chartConfig = {
  averageWeight: {
    label: "Priemerná váha",
    color: "hsl(var(--chart-1))",
  },
};

// Farby pre jednotlivé tímy - using design system
const getTeamColor = (index: number) => {
  return getChartColorByIndex(index);
};

export function TeamAverageChart({ data, title, description, competitionId }: TeamAverageChartProps) {
  const [selectedTeam, setSelectedTeam] = useState<TeamTopAverageData | null>(null);

  const formattedData = data.map(item => ({
    ...item,
    displayName: item.teamName.length > 12 ? `${item.teamName.substring(0, 12)}...` : item.teamName,
  }));

  const handleBarClick = (data: any) => {
    if (data && data.payload) {
      setSelectedTeam(data.payload);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}. Klikni na stĺpec pre detail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={600}>
              <BarChart 
                data={formattedData} 
                margin={{ left: 20, right: 20, top: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="category"
                  dataKey="displayName"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  height={80}
                />
                <YAxis 
                  type="number"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Priemerná váha (kg)', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={() => []} 
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? (
                          <div className="space-y-1">
                            <div className="font-medium">{item.teamName}</div>
                            <div className="text-xs text-muted-foreground">
                              Priemerná váha: {item.averageWeight} kg
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Počet rýb: {item.fishCount} z {item.maxFish}
                            </div>
                            <div className="text-xs text-primary mt-1">Klikni pre detail</div>
                          </div>
                        ) : label;
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="averageWeight"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                >
                  {formattedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getTeamColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Team Detail Modal */}
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
                  <Scale className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{selectedTeam.averageWeight} kg</p>
                  <p className="text-xs text-muted-foreground">Priemerná váha</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <Fish className="w-6 h-6 mx-auto mb-2 text-secondary" />
                  <p className="text-2xl font-bold">{selectedTeam.fishCount} / {selectedTeam.maxFish}</p>
                  <p className="text-xs text-muted-foreground">Počet rýb v priemere</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/20 text-center">
                <p className="text-sm text-muted-foreground">
                  Tento priemer je vypočítaný z <span className="font-semibold text-foreground">top {selectedTeam.maxFish}</span> najťažších úlovkov tímu
                </p>
              </div>
              {selectedTeam.teamId && (
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
