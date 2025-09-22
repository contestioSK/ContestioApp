import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { TeamTopAverageData } from "../types";

interface TeamAverageChartProps {
  data: TeamTopAverageData[];
  title: string;
  description: string;
}

const chartConfig = {
  averageWeight: {
    label: "Priemerná váha",
    color: "hsl(var(--chart-1))",
  },
};

export function TeamAverageChart({ data, title, description }: TeamAverageChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    displayName: item.teamName.length > 12 ? `${item.teamName.substring(0, 12)}...` : item.teamName,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={formattedData} 
              margin={{ left: 20, right: 20, top: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="category"
                dataKey="displayName"
                tick={{ fontSize: 11 }}
                interval={0}
                height={80}
              />
              <YAxis 
                type="number"
                tick={{ fontSize: 12 }}
                label={{ value: 'Priemerná váha (kg)', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => [`${value} kg`, "Priemerná váha"]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? (
                        <div className="space-y-1">
                          <div className="font-medium">{item.teamName}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.fishCount} z {item.maxFish} úlovkov
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Priemerná váha: {item.averageWeight} kg
                          </div>
                        </div>
                      ) : label;
                    }}
                  />
                }
              />
              <Bar
                dataKey="averageWeight"
                fill="var(--color-averageWeight)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}