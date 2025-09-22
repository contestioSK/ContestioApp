import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
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

// Farby pre jednotlivé dni - počet (zladené s weight grafom)
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