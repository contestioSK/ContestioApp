import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { RecordProgressionData } from "../types";

interface RecordProgressionChartProps {
  data: RecordProgressionData[];
}

const chartConfig = {
  bigFishOverall: {
    label: "Najväčší úlovok celkovo",
    color: "hsl(var(--chart-1))",
  },
  bigCommonCarp: {
    label: "Najväčší šupináč",
    color: "hsl(var(--chart-2))",
  },
  bigMirrorCarp: {
    label: "Najväčší lysec",
    color: "hsl(var(--chart-3))",
  },
};

export function RecordProgressionChart({ data }: RecordProgressionChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    timeLabel: `${Math.floor(item.hour)}:${String(Math.round((item.hour % 1) * 60)).padStart(2, '0')}`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vývoj rekordov súťaže</CardTitle>
        <CardDescription>
          Ako sa zlepšovali rekordy v jednotlivých kategóriách počas súťaže
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
                tick={{ fontSize: 12 }}
                label={{ value: 'Váha (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [
                      `${value} kg`,
                      chartConfig[name as keyof typeof chartConfig]?.label || name
                    ]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `Čas: ${label}` : label;
                    }}
                  />
                }
              />
              <Line
                type="stepAfter"
                dataKey="bigFishOverall"
                stroke="var(--color-bigFishOverall)"
                strokeWidth={3}
                dot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                type="stepAfter"
                dataKey="bigCommonCarp"
                stroke="var(--color-bigCommonCarp)"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="5 5"
                connectNulls={false}
              />
              <Line
                type="stepAfter"
                dataKey="bigMirrorCarp"
                stroke="var(--color-bigMirrorCarp)"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="8 3"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}