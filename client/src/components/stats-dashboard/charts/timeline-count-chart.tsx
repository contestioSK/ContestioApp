import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { getChartColorByIndex } from "@/lib/colors";
import type { TimelineData } from "../types";

interface TimelineCountChartProps {
  data: TimelineData[];
}

const chartConfig = {
  totalCount: {
    label: "Počet úlovkov",
    color: "hsl(var(--chart-2))",
  },
};

// Farby pre jednotlivé dni - using design system
const getDayColor = (dayIndex: number) => {
  return getChartColorByIndex(dayIndex);
};

export function TimelineCountChart({ data }: TimelineCountChartProps) {
  // Format data for display (data is already daily aggregated from API)
  const formattedData = data.map(item => ({
    timeLabel: `Deň ${item.dayIndex + 1}`,
    totalCount: item.totalCount,
    dayIndex: item.dayIndex
  })).sort((a, b) => a.dayIndex - b.dayIndex);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vývoj počtu úlovkov</CardTitle>
        <CardDescription>
          Počet ulovených rýb počas súťaže
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
                label={{ value: 'Počet (ks)', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => [`${value} ks`, "Počet úlovkov"]}
                  />
                }
              />
              <Bar
                dataKey="totalCount"
                radius={[2, 2, 0, 0]}
              >
                {formattedData.map((entry) => (
                  <Cell key={`count-${entry.dayIndex}`} fill={getDayColor(entry.dayIndex)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}