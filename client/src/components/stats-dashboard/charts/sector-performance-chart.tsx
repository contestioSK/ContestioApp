import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Link } from "wouter";
import { ExternalLink, MapPin, Fish, Scale, TrendingUp } from "lucide-react";
import { getChartColorByIndex } from "@/lib/colors";
import type { SectorData } from "../types";

interface SectorPerformanceChartProps {
  data: SectorData[];
  competitionId?: string;
}

// Farby pre rôzne sektory - using design system
const getSectorColor = (index: number) => {
  return getChartColorByIndex(index);
};

const chartConfig = {
  totalWeight: {
    label: "Celková váha (kg)",
    color: "hsl(var(--chart-1))",
  },
  totalCount: {
    label: "Počet úlovkov",
    color: "hsl(var(--chart-2))",
  },
};

export function SectorPerformanceChart({ data, competitionId }: SectorPerformanceChartProps) {
  const [selectedSector, setSelectedSector] = useState<SectorData | null>(null);
  
  // Sort data by total weight descending
  const sortedData = [...data].sort((a, b) => b.totalWeight - a.totalWeight);

  const handleBarClick = (data: any) => {
    if (data && data.payload) {
      setSelectedSector(data.payload);
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Výkonnosť sektorov</CardTitle>
          <CardDescription>
            Porovnanie celkovej váhy a počtu úlovkov v jednotlivých sektoroch. Klikni na stĺpec pre detail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="sector" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="weight"
                  orientation="left"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="count"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name, props) => {
                        const payload = props.payload;
                        return [
                          <div key="content" className="space-y-1">
                            <div className="font-medium">{payload.sector}</div>
                            <div>Celková váha: {payload.totalWeight} kg</div>
                            <div>Počet úlovkov: {payload.totalCount} ks</div>
                            <div>Priemerná váha: {payload.averageWeight} kg</div>
                            <div className="text-xs text-primary mt-1">Klikni pre detail</div>
                          </div>
                        ];
                      }}
                      hideLabel
                    />
                  }
                />
                <Bar
                  yAxisId="weight"
                  dataKey="totalWeight"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                >
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getSectorColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Sector Detail Modal */}
      <Dialog open={!!selectedSector} onOpenChange={() => setSelectedSector(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Sektor {selectedSector?.sector}
            </DialogTitle>
          </DialogHeader>
          {selectedSector && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <Scale className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{selectedSector.totalWeight} kg</p>
                  <p className="text-xs text-muted-foreground">Celková váha</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <Fish className="w-6 h-6 mx-auto mb-2 text-secondary" />
                  <p className="text-2xl font-bold">{selectedSector.totalCount}</p>
                  <p className="text-xs text-muted-foreground">Počet úlovkov</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/20 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-accent" />
                <p className="text-lg font-semibold">{selectedSector.averageWeight} kg</p>
                <p className="text-xs text-muted-foreground">Priemerná váha úlovku</p>
              </div>
              {competitionId && (
                <Link 
                  href={`/competition/${competitionId}/sector/${selectedSector.sector}`}
                  onClick={() => setSelectedSector(null)}
                >
                  <Button className="w-full" variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Zobraziť detail sektora
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
