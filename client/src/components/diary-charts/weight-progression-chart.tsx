import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface WeightProgressionData {
  date: string; // ISO date for calculations
  dateLabel: string; // Display label
  averageWeight: number;
  totalWeight: number;
  catchCount: number;
  biggestCatch: number;
}

interface WeightProgressionChartProps {
  data: WeightProgressionData[];
}

const chartConfig = {
  averageWeight: {
    label: "Priemerná váha",
    color: "hsl(var(--chart-1))",
  },
  biggestCatch: {
    label: "Najväčší úlovok",
    color: "hsl(var(--chart-2))",
  },
};

export function WeightProgressionChart({ data }: WeightProgressionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vývoj váhy úlovkov</CardTitle>
          <CardDescription>Žiadne dáta o úlovkoch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Žiadne dáta k dispozícii
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map(item => ({
    ...item,
    // Use pre-formatted display label instead of parsing date
    displayLabel: item.dateLabel,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vývoj váhy úlovkov v čase</CardTitle>
        <CardDescription>
          Sledovanie pokroku v priemernej váhe a najväčších úlovkoch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="displayLabel" 
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
                      return item ? (
                        <div className="space-y-1">
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.catchCount} úlovkov • {item.totalWeight.toFixed(1)} kg celkom
                          </div>
                        </div>
                      ) : label;
                    }}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="averageWeight"
                stroke="var(--color-averageWeight)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="biggestCatch"
                stroke="var(--color-biggestCatch)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}