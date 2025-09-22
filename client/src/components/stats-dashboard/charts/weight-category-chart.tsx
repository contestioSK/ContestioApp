import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import type { WeightCategoryData } from "../types";

interface WeightCategoryChartProps {
  data: WeightCategoryData[];
}

const chartConfig = {
  commonCarp: {
    label: "Šupináč",
    color: "hsl(var(--chart-1))",
  },
  mirrorCarp: {
    label: "Lysec",
    color: "hsl(var(--chart-2))",
  },
};

// Farby pre jednotlivé váhové kategórie
const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    '< 5 kg': 'hsl(220, 70%, 60%)',     // modrá
    '5-10 kg': 'hsl(200, 70%, 55%)',   // svetlá modrá
    '10-15 kg': 'hsl(160, 70%, 50%)',  // tyrkysová
    '15-20 kg': 'hsl(120, 70%, 50%)',  // zelená
    '20-25 kg': 'hsl(80, 70%, 55%)',   // svetlo zelená
    '25-30 kg': 'hsl(40, 70%, 60%)',   // oranžová
    '30+ kg': 'hsl(0, 70%, 60%)',      // červená
  };
  return colorMap[category] || 'hsl(var(--chart-1))';
};

export function WeightCategoryChart({ data }: WeightCategoryChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rozdelenie úlovkov podľa váhových kategórií</CardTitle>
        <CardDescription>
          Počet úlovkov v jednotlivých váhových kategóriách rozdelený podľa typu rýb
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="category" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [
                      `${value} ks`,
                      chartConfig[name as keyof typeof chartConfig]?.label || name
                    ]}
                  />
                }
              />
              <Bar
                dataKey="commonCarp"
                stackId="fish"
                radius={[0, 0, 4, 4]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-common-${index}`} fill={getCategoryColor(entry.category)} />
                ))}
              </Bar>
              <Bar
                dataKey="mirrorCarp"
                stackId="fish"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-mirror-${index}`} 
                    fill={`${getCategoryColor(entry.category)}CC`} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}