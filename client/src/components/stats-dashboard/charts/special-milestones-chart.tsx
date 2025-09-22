import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { SpecialMilestoneData } from "../types";

interface SpecialMilestonesChartProps {
  data: SpecialMilestoneData[];
}

const chartConfig = {
  milestones: {
    label: "Míľniky",
    color: "hsl(var(--chart-3))",
  },
};

const getMilestoneColor = (milestone: string) => {
  switch (milestone) {
    case 'Prvá ryba súťaže': return 'hsl(var(--chart-1))';
    case 'Prvá ryba nad 15 kg': return 'hsl(var(--chart-2))';
    case 'Prvá ryba nad 20 kg': return 'hsl(var(--chart-3))';
    case 'Prvá ryba nad 25 kg': return 'hsl(var(--chart-4))';
    default: return 'hsl(var(--chart-5))';
  }
};

export function SpecialMilestonesChart({ data }: SpecialMilestonesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline špeciálnych míľnikov</CardTitle>
        <CardDescription>
          Časová os dosiahnutia špeciálnych míľnikov (prvá ryba, váhové hranice)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                dataKey="hour"
                domain={[6, 24]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Hodina', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
              />
              <YAxis 
                type="number"
                dataKey="weight"
                tick={{ fontSize: 12 }}
                label={{ value: 'Váha (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const payload = props.payload;
                      return [
                        <div key="content" className="space-y-1">
                          <div className="font-medium">{payload.milestone}</div>
                          <div>Tím: {payload.teamName}</div>
                          <div>Váha: {payload.weight} kg</div>
                          <div>Čas: {new Date(payload.time).toLocaleTimeString('sk-SK')}</div>
                        </div>
                      ];
                    }}
                    hideLabel
                  />
                }
              />
              <Scatter
                dataKey="weight"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.8}
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                r={10}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
            <span>Prvá ryba súťaže</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span>Prvá ryba nad 15 kg</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
            <span>Prvá ryba nad 20 kg</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
            <span>Prvá ryba nad 25 kg</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}