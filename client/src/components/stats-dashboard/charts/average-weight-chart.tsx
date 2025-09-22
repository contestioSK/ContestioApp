import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { AverageWeightData } from "../types";

interface AverageWeightChartProps {
  data: AverageWeightData[];
}

const chartConfig = {
  top3Average: {
    label: "Top 3 priemer",
    color: "hsl(var(--chart-1))",
  },
  top5Average: {
    label: "Top 5 priemer",
    color: "hsl(var(--chart-2))",
  },
};

export function AverageWeightChart({ data }: AverageWeightChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    displayName: item.teamName.length > 10 ? `${item.teamName.substring(0, 10)}...` : item.teamName,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Priemerná váha TOP úlovkov</CardTitle>
        <CardDescription>
          Porovnanie priemernej váhy top 3 a top 5 úlovkov jednotlivých tímov
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={formattedData}
              margin={{ bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="displayName" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Váha (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const payload = props.payload;
                      const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                      return [
                        <div key="content" className="space-y-1">
                          <div className="font-medium">{payload.teamName}</div>
                          <div>Top 3 priemer: {payload.top3Average} kg</div>
                          <div>Top 5 priemer: {payload.top5Average} kg</div>
                        </div>
                      ];
                    }}
                    hideLabel
                  />
                }
              />
              <Bar
                dataKey="top3Average"
                fill="var(--color-top3Average)"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="top5Average"
                fill="var(--color-top5Average)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}