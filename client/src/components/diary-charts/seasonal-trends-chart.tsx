import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

interface SeasonalData {
  season: string;
  catches: number;
  averageWeight: number;
  trips: number;
  efficiency: number;
  label: string;
}

interface SeasonalTrendsChartProps {
  data: SeasonalData[];
}

const chartConfig = {
  catches: {
    label: "Počet úlovkov",
    color: "hsl(var(--chart-1))",
  },
  averageWeight: {
    label: "Priemerná váha",
    color: "hsl(var(--chart-2))",
  },
};

// Seasonal colors
const getSeasonColor = (season: string) => {
  const colors = {
    spring: 'hsl(120, 70%, 50%)',  // Green for spring
    summer: 'hsl(60, 80%, 60%)',   // Yellow for summer  
    autumn: 'hsl(30, 70%, 50%)',   // Orange for autumn
    winter: 'hsl(220, 70%, 60%)',  // Blue for winter
  };
  return colors[season as keyof typeof colors] || 'hsl(var(--chart-1))';
};

export function SeasonalTrendsChart({ data }: SeasonalTrendsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sezónne trendy</CardTitle>
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
        <CardTitle>Sezónne trendy úlovkov</CardTitle>
        <CardDescription>
          Porovnanie úspešnosti rybačky v jednotlivých ročných obdobiach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Počet úlovkov', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const payload = props.payload;
                      return [
                        <div key="content" className="space-y-1">
                          <div className="font-medium">{payload.label}</div>
                          <div>Úlovky: {payload.catches} ks</div>
                          <div>Výpravy: {payload.trips} ks</div>
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
                dataKey="catches"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSeasonColor(entry.season)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}