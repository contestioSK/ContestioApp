import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid } from "recharts";

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
  title = "Mesačné porovnania"
}: MonthComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
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
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <div className="font-medium text-foreground mb-2">{data.month}</div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Úlovky: <span className="text-foreground font-medium">{data.catches} ks</span></div>
                      <div>Výpravy: <span className="text-foreground font-medium">{data.trips} ks</span></div>
                      <div>Celková váha: <span className="text-foreground font-medium">{data.totalWeight.toFixed(1)} kg</span></div>
                      <div>Priemerná váha: <span className="text-foreground font-medium">{data.averageWeight.toFixed(1)} kg</span></div>
                      <div className="pt-1 border-t border-border mt-1">
                        Efektívnosť: <span className="text-foreground font-medium">{data.efficiency.toFixed(1)} úlovkov/výpravu</span>
                      </div>
                    </div>
                  </div>
                );
              }}
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