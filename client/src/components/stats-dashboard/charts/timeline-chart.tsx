import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
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
  const formattedData = data.map(item => ({
    ...item,
    timeLabel: `${item.hour}:00`,
  }));

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
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timeLabel" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="weight"
                orientation="left"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="count"
                orientation="right"
                tick={{ fontSize: 12 }}
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
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="totalWeight"
                stroke="var(--color-totalWeight)"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="totalCount"
                stroke="var(--color-totalCount)"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}