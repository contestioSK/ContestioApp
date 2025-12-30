import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { getChartColorByIndex } from "@/lib/colors";
import type { SectorData } from "../types";

interface SectorAverageWeightChartProps {
  data: SectorData[];
}

const chartConfig = {
  averageWeight: {
    label: "Priemerná váha (kg)",
    color: "hsl(var(--chart-3))",
  },
};

// Farby pre rôzne sektory - using design system
const getSectorColor = (sectorIndex: number) => {
  return getChartColorByIndex(sectorIndex);
};

export function SectorAverageWeightChart({ data }: SectorAverageWeightChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Priemerná váha po sektoroch</CardTitle>
          <CardDescription>Žiadne dáta o sektoroch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Žiadne dáta k dispozícii
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by average weight descending
  const sortedData = data
    .filter(item => item.averageWeight > 0)
    .sort((a, b) => b.averageWeight - a.averageWeight)
    .map((item, index) => ({
      ...item,
      colorIndex: index
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Priemerná váha po sektoroch</CardTitle>
        <CardDescription>
          Priemerná váha úlovkov v jednotlivých sektoroch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="sector" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
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
                          <div className="font-medium">{item.sector}</div>
                          <div className="text-xs text-muted-foreground">
                            Priemerná váha: {item.averageWeight} kg
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Celkovo: {item.totalCount} rýb ({item.totalWeight} kg)
                          </div>
                        </div>
                      ) : label;
                    }}
                  />
                }
              />
              <Bar
                dataKey="averageWeight"
                radius={[4, 4, 0, 0]}
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
  );
}