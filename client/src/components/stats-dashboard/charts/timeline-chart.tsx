import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { TimelineData } from "../types";

interface TimelineChartProps {
  data: TimelineData[];
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

export function TimelineChart({ data }: TimelineChartProps) {
  // Group data by day and take the latest cumulative value per day
  interface DailyPoint {
    timeLabel: string;
    totalWeight: number;
    totalCount: number;
    day: number;
  }
  
  const dailyData = data.reduce((acc, item) => {
    const day = Math.floor(item.hour / 24) + 1;
    const dayKey = `Deň ${day}`;
    
    // Since data is cumulative, take the latest (highest) value for each day
    if (!acc[dayKey] || item.hour > acc[dayKey].hour) {
      acc[dayKey] = {
        timeLabel: dayKey,
        totalWeight: item.totalWeight,
        totalCount: item.totalCount,
        day: day,
        hour: item.hour
      };
    }
    
    return acc;
  }, {} as Record<string, DailyPoint & { hour: number }>);
  
  // Sort by day number to ensure correct ordering
  const formattedData = Object.values(dailyData)
    .map(({ hour, ...rest }) => rest) // Remove the temporary hour field
    .sort((a, b) => a.day - b.day);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vývoj celkovej váhy a počtu úlovkov</CardTitle>
        <CardDescription>
          Sledovanie postupu súťaže v čase - celková váha a počet ulovených rýb
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timeLabel" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="weight"
                orientation="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Váha (kg)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="count"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Počet (ks)', angle: 90, position: 'insideRight' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [
                      `${value}${name === 'totalWeight' ? ' kg' : ' ks'}`,
                      chartConfig[name as keyof typeof chartConfig]?.label || name
                    ]}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="weight"
                dataKey="totalWeight"
                fill="var(--color-totalWeight)"
                name="totalWeight"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                yAxisId="count"
                dataKey="totalCount"
                fill="var(--color-totalCount)"
                name="totalCount"
                radius={[2, 2, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}