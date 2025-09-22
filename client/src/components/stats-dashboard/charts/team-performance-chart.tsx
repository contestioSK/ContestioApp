import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { TeamPerformanceData } from "../types";

interface TeamPerformanceChartProps {
  data: TeamPerformanceData[];
}

const chartConfig = {
  teams: {
    label: "Tímy",
    color: "hsl(var(--chart-1))",
  },
};

export function TeamPerformanceChart({ data }: TeamPerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Porovnanie váhy a počtu ulovených rýb</CardTitle>
        <CardDescription>
          Scatter plot zobrazujúci vzťah medzi počtom úlovkov a celkovou váhou tímov
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
                          <div>Priemerná váha: {(payload.totalWeight / payload.totalCount).toFixed(1)} kg</div>
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
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}