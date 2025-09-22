import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { DailyBigFishData } from "../types";

interface DailyBigFishChartProps {
  data: DailyBigFishData[];
}

const chartConfig = {
  weight: {
    label: "Váha (kg)",
    color: "hsl(var(--chart-1))",
  },
};

export function DailyBigFishChart({ data }: DailyBigFishChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    dayLabel: new Date(item.day).toLocaleDateString('sk-SK', { 
      month: 'short', 
      day: 'numeric' 
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Najväčšie úlovky dňa</CardTitle>
        <CardDescription>
          Najťažšia ryba ulovená v každom dni súťaže
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dayLabel" 
                tick={{ fontSize: 12 }}
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
                      return [
                        <div key="content" className="space-y-1">
                          <div className="font-medium">Najväčšia ryba dňa</div>
                          <div>Tím: {payload.teamName}</div>
                          <div>Váha: {payload.weight} kg</div>
                          <div>Typ: {payload.fishType}</div>
                          <div>Dátum: {new Date(payload.day).toLocaleDateString('sk-SK')}</div>
                        </div>
                      ];
                    }}
                    hideLabel
                  />
                }
              />
              <Bar
                dataKey="weight"
                fill="var(--color-weight)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}