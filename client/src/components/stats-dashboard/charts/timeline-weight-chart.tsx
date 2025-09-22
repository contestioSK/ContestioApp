import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
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

// Farby pre jednotlivé dni - váha
const getDayColor = (dayIndex: number) => {
  const colors = [
    'hsl(220, 70%, 60%)',  // modrá - Deň 1
    'hsl(160, 70%, 50%)',  // tyrkysová - Deň 2  
    'hsl(120, 70%, 50%)',  // zelená - Deň 3
    'hsl(80, 70%, 55%)',   // svetlo zelená - Deň 4
    'hsl(40, 70%, 60%)',   // oranžová - Deň 5
    'hsl(0, 70%, 60%)',    // červená - Deň 6
    'hsl(280, 70%, 60%)',  // fialová - Deň 7
  ];
  return colors[dayIndex % 7];
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