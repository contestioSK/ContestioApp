import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
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
                fill="var(--color-commonCarp)"
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="mirrorCarp"
                stackId="fish"
                fill="var(--color-mirrorCarp)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}