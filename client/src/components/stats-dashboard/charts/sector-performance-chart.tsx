import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { SectorData } from "../types";

interface SectorPerformanceChartProps {
  data: SectorData[];
}

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

export function SectorPerformanceChart({ data }: SectorPerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Výkonnosť sektorov</CardTitle>
        <CardDescription>
          Porovnanie celkovej váhy a počtu úlovkov v jednotlivých sektoroch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
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
                fill="var(--color-totalWeight)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}