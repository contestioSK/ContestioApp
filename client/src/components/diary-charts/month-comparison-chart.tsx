import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface MonthComparisonData {
  month: string;
  catches: number;
  totalWeight: number;
  trips: number;
  averageWeight: number;
  efficiency: number;
}

interface MonthComparisonChartProps {
  data: MonthComparisonData[];
  title?: string;
  period?: string;
}

const chartConfig = {
  catches: {
    label: "Počet úlovkov",
    color: "hsl(var(--chart-1))",
  },
  totalWeight: {
    label: "Celková váha (kg)",
    color: "hsl(var(--chart-2))",
  },
  averageWeight: {
    label: "Priemerná váha (kg)",
    color: "hsl(var(--chart-3))",
  },
};

export function MonthComparisonChart({ 
  data, 
  title = "Mesačné porovnania", 
  period = "posledných mesiacov" 
}: MonthComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Detailné porovnanie aktivity a úspešnosti za {period}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              yAxisId="count"
              orientation="left"
              tick={{ fontSize: 12 }}
              label={{ value: 'Počet', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            <YAxis 
              yAxisId="weight"
              orientation="right"
              tick={{ fontSize: 12 }}
              label={{ value: 'Váha (kg)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name, props) => {
                    const payload = props.payload;
                    return [
                      <div key="content" className="space-y-1">
                        <div className="font-medium">{payload.month}</div>
                        <div>Úlovky: {payload.catches} ks</div>
                        <div>Výpravy: {payload.trips} ks</div>
                        <div>Celková váha: {payload.totalWeight.toFixed(1)} kg</div>
                        <div>Priemerná váha: {payload.averageWeight.toFixed(1)} kg</div>
                        <div className="font-medium">
                          Efektívnosť: {payload.efficiency.toFixed(1)} úlovkov/výpravu
                        </div>
                      </div>
                    ];
                  }}
                  hideLabel
                />
              }
            />
            <Bar
              yAxisId="count"
              dataKey="catches"
              fill="var(--color-catches)"
              radius={[4, 4, 0, 0]}
              fillOpacity={0.8}
            />
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="averageWeight"
              stroke="var(--color-averageWeight)"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}