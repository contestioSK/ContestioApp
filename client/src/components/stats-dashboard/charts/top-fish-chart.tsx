import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { TopFishData } from "../types";

interface TopFishChartProps {
  data: TopFishData[];
}

const chartConfig = {
  weight: {
    label: "Váha",
    color: "hsl(var(--chart-1))",
  },
};

export function TopFishChart({ data }: TopFishChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    displayName: item.teamName.length > 12 ? `${item.teamName.substring(0, 12)}...` : item.teamName,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>TOP 5 najväčších rýb</CardTitle>
        <CardDescription>
          Rebríček najťažších úlovkov v súťaži s váhou a typom ryby
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={formattedData} 
              layout="horizontal"
              margin={{ left: 60, right: 20, top: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                type="category"
                dataKey="displayName"
                tick={{ fontSize: 11 }}
                width={80}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => [`${value} kg`, "Váha"]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? (
                        <div className="space-y-1">
                          <div className="font-medium">{item.teamName}</div>
                          <div className="text-sm text-muted-foreground">{item.fishType}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(item.catchTime).toLocaleString('sk-SK')}
                          </div>
                        </div>
                      ) : label;
                    }}
                  />
                }
              />
              <Bar
                dataKey="weight"
                fill="var(--color-weight)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}