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
  const COLORS = {
    "Common Carp": "hsl(34, 84%, 60%)",  // oranžová pre šupináča
    "Mirror Carp": "hsl(220, 70%, 60%)", // modrá pre lysca
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Druh Ryby:</CardTitle>
        <CardDescription>
          Rozdelenie úlovkov podľa typu kapra (šupináč vs lysec)
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
                  <Cell key={`cell-${index}`} fill={COLORS[entry.type as keyof typeof COLORS]} />
                ))}
              </Pie>
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const entry = payload[0].payload;
                    const label = chartConfig[entry.type as keyof typeof chartConfig]?.label || entry.type;
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <div className="font-medium text-sm mb-2">{label}</div>
                        <div className="space-y-1 text-xs">
                          <div>Váha: {entry.weight.toFixed(1)} kg</div>
                          <div>Počet: {entry.count} ks</div>
                          <div>Podiel: {entry.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
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
                style={{ backgroundColor: COLORS[entry.type as keyof typeof COLORS] }}
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