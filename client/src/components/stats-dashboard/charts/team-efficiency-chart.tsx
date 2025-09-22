import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { TeamEfficiencyData } from "../types";

interface TeamEfficiencyChartProps {
  data: TeamEfficiencyData[];
}

const chartConfig = {
  efficiency: {
    label: "Efektívnosť",
    color: "hsl(var(--chart-1))",
  },
};

export function TeamEfficiencyChart({ data }: TeamEfficiencyChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Efektívnosť tímov</CardTitle>
        <CardDescription>
          Vzťah medzi časom stráveným lovením a počtom úlovkov (veľkosť bubliny = celková váha)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                dataKey="timeSpentHours"
                tick={{ fontSize: 12 }}
                label={{ value: 'Čas strávený lovením (h)', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
              />
              <YAxis 
                type="number"
                dataKey="totalCatches"
                tick={{ fontSize: 12 }}
                label={{ value: 'Počet úlovkov', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const payload = props.payload;
                      return [
                        <div key="content" className="space-y-1">
                          <div className="font-medium">{payload.teamName}</div>
                          <div>Čas lovenia: {payload.timeSpentHours} hodín</div>
                          <div>Počet úlovkov: {payload.totalCatches} ks</div>
                          <div>Celková váha: {payload.totalWeight} kg</div>
                          <div>Efektívnosť: {payload.efficiency.toFixed(1)} kg/h</div>
                        </div>
                      ];
                    }}
                    hideLabel
                  />
                }
              />
              <Scatter
                dataKey="totalCatches"
                fill="var(--color-efficiency)"
                fillOpacity={0.6}
                stroke="var(--color-efficiency)"
                strokeWidth={2}
                r={12}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        <div className="mt-4 text-xs text-muted-foreground">
          💡 Veľkosť bubliny reprezentuje celkovú váhu úlovkov tímu
        </div>
      </CardContent>
    </Card>
  );
}