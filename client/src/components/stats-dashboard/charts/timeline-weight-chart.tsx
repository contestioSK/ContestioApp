import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { getChartColorByIndex } from "@/lib/colors";
import type { TimelineData } from "../types";

interface TimelineWeightChartProps {
  data: TimelineData[];
}

const chartConfig = {
  totalWeight: {
    label: "Celková váha (kg)",
    color: "hsl(var(--chart-1))",
  },
};

// Farby pre jednotlivé dni - using design system
const getDayColor = (dayIndex: number) => {
  return getChartColorByIndex(dayIndex);
};

export function TimelineWeightChart({ data }: TimelineWeightChartProps) {
  // Format data for display (data is already daily aggregated from API)
  const formattedData = data.map(item => ({
    timeLabel: `Deň ${item.dayIndex + 1}`,
    totalWeight: item.totalWeight,
    dayIndex: item.dayIndex
  })).sort((a, b) => a.dayIndex - b.dayIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vývoj celkovej váhy</CardTitle>
        <CardDescription>
          Celková váha ulovených rýb počas súťaže
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timeLabel" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Váha (kg)', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => [`${value} kg`, "Celková váha"]}
                  />
                }
              />
              <Bar
                dataKey="totalWeight"
                radius={[2, 2, 0, 0]}
              >
                {formattedData.map((entry) => (
                  <Cell key={`weight-${entry.dayIndex}`} fill={getDayColor(entry.dayIndex)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}