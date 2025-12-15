import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Link } from "wouter";
import { ExternalLink, Trophy, Fish, Scale } from "lucide-react";
import type { TeamPerformanceData } from "../types";

interface TeamPerformanceChartProps {
  data: TeamPerformanceData[];
  competitionId?: string;
}

const chartConfig = {
  teams: {
    label: "Tímy",
    color: "hsl(var(--chart-1))",
  },
};

export function TeamPerformanceChart({ data, competitionId }: TeamPerformanceChartProps) {
  const [selectedTeam, setSelectedTeam] = useState<TeamPerformanceData | null>(null);

  const handleScatterClick = (data: any) => {
    if (data && data.payload) {
      setSelectedTeam(data.payload);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Porovnanie váhy a počtu ulovených rýb</CardTitle>
          <CardDescription>
            Scatter plot zobrazujúci vzťah medzi počtom úlovkov a celkovou váhou tímov. Klikni na bod pre detail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number"
                  dataKey="totalCount"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Počet úlovkov', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
                />
                <YAxis 
                  type="number"
                  dataKey="totalWeight"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Celková váha (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name, props) => {
                        const payload = props.payload;
                        return [
                          <div key="content" className="space-y-1">
                            <div className="font-medium">{payload.teamName}</div>
                            <div>Počet úlovkov: {payload.totalCount} ks</div>
                            <div>Celková váha: {payload.totalWeight} kg</div>
                            <div>Priemerná váha: {payload.totalCount > 0 ? (payload.totalWeight / payload.totalCount).toFixed(1) : '–'} kg</div>
                            <div className="text-xs text-primary mt-1">Klikni pre detail</div>
                          </div>
                        ];
                      }}
                      hideLabel
                    />
                  }
                />
                <Scatter
                  dataKey="totalWeight"
                  fill="var(--color-teams)"
                  fillOpacity={0.8}
                  stroke="var(--color-teams)"
                  strokeWidth={2}
                  r={8}
                  cursor="pointer"
                  onClick={handleScatterClick}
                />
              </ScatterChart>
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
                  <Fish className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{selectedTeam.totalCount}</p>
                  <p className="text-xs text-muted-foreground">Počet úlovkov</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <Scale className="w-6 h-6 mx-auto mb-2 text-secondary" />
                  <p className="text-2xl font-bold">{selectedTeam.totalWeight} kg</p>
                  <p className="text-xs text-muted-foreground">Celková váha</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/20 text-center">
                <p className="text-lg font-semibold">
                  {selectedTeam.totalCount > 0 
                    ? (selectedTeam.totalWeight / selectedTeam.totalCount).toFixed(2) 
                    : '0.00'} kg
                </p>
                <p className="text-xs text-muted-foreground">Priemerná váha úlovku</p>
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
