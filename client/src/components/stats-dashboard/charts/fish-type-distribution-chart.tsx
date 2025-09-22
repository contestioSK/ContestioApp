import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { FishTypeData } from "../types";

interface FishTypeDistributionChartProps {
  data: FishTypeData[];
}

const chartConfig = {
  "Common Carp": {
    label: "Šupináč",
    color: "hsl(var(--chart-1))",
  },
  "Mirror Carp": {
    label: "Lysec", 
    color: "hsl(var(--chart-2))",
  },
};

export function FishTypeDistributionChart({ data }: FishTypeDistributionChartProps) {
  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribúcia typov rýb</CardTitle>
        <CardDescription>
          Podiel šupináčov a lysčekov na celkovej váhe úlovkov
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="weight"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const entry = props.payload;
                      const label = chartConfig[entry.type as keyof typeof chartConfig]?.label || entry.type;
                      return [
                        <div key="content" className="space-y-1">
                          <div className="font-medium">{label}</div>
                          <div>Váha: {entry.weight} kg</div>
                          <div>Počet: {entry.count} ks</div>
                          <div>Podiel: {entry.percentage.toFixed(1)}%</div>
                        </div>
                      ];
                    }}
                    hideLabel
                  />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          {data.map((entry, index) => (
            <div key={entry.type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index] }}
              />
              <span className="text-sm">
                {chartConfig[entry.type as keyof typeof chartConfig]?.label || entry.type} 
                ({entry.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}