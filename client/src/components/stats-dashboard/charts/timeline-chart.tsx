import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
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

// Farby pre jednotlivé dni
const getDayColors = (dayIndex: number) => ({
  weight: [
    'hsl(220, 70%, 60%)',  // modrá - Deň 1
    'hsl(160, 70%, 50%)',  // tyrkysová - Deň 2  
    'hsl(120, 70%, 50%)',  // zelená - Deň 3
    'hsl(80, 70%, 55%)',   // svetlo zelená - Deň 4
    'hsl(40, 70%, 60%)',   // oranžová - Deň 5
    'hsl(0, 70%, 60%)',    // červená - Deň 6
    'hsl(280, 70%, 60%)',  // fialová - Deň 7
  ][dayIndex % 7],
  count: [
    'hsl(220, 50%, 75%)',  // svetlá modrá - Deň 1
    'hsl(160, 50%, 65%)',  // svetlá tyrkysová - Deň 2
    'hsl(120, 50%, 65%)',  // svetlá zelená - Deň 3
    'hsl(80, 50%, 70%)',   // svetlo svetlo zelená - Deň 4
    'hsl(40, 50%, 75%)',   // svetlá oranžová - Deň 5
    'hsl(0, 50%, 75%)',    // svetlá červená - Deň 6
    'hsl(280, 50%, 75%)',  // svetlá fialová - Deň 7
  ][dayIndex % 7]
});

export function TimelineChart({ data }: TimelineChartProps) {
  // Format data for display (data is already daily aggregated from API)
  const formattedData = data.map(item => ({
    timeLabel: `Deň ${item.dayIndex + 1}`,
    totalWeight: item.totalWeight,
    totalCount: item.totalCount,
    dayIndex: item.dayIndex
  })).sort((a, b) => a.dayIndex - b.dayIndex);

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
                name="totalWeight"
                radius={[2, 2, 0, 0]}
              >
                {formattedData.map((entry) => (
                  <Cell key={`weight-${entry.dayIndex}`} fill={getDayColors(entry.dayIndex).weight} />
                ))}
              </Bar>
              <Bar
                yAxisId="count"
                dataKey="totalCount"
                name="totalCount"
                radius={[2, 2, 0, 0]}
              >
                {formattedData.map((entry) => (
                  <Cell key={`count-${entry.dayIndex}`} fill={getDayColors(entry.dayIndex).count} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}