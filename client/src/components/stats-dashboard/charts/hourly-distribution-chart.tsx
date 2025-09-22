import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import type { HourlyDistributionData } from "../types";

interface HourlyDistributionChartProps {
  data: HourlyDistributionData[];
}

// Farebná schéma pre jednotlivé hodiny dňa
const getHourColor = (hour: number) => {
  // Skoré ráno (0-5): Tmavo modrá
  if (hour >= 0 && hour <= 5) {
    return 'hsl(220, 70%, 60%)';
  }
  // Ráno a dopoludnie (6-11): Svetlo modrá → tyrkysová
  if (hour >= 6 && hour <= 11) {
    const progress = (hour - 6) / 5;
    const hue = 220 - (60 * progress); // 220 → 160
    return `hsl(${hue}, 70%, 55%)`;
  }
  // Popoludnie (12-17): Zelená → žlto-zelená
  if (hour >= 12 && hour <= 17) {
    const progress = (hour - 12) / 5;
    const hue = 160 - (80 * progress); // 160 → 80
    return `hsl(${hue}, 70%, 50%)`;
  }
  // Večer a noc (18-23): Oranžová → červená
  if (hour >= 18 && hour <= 23) {
    const progress = (hour - 18) / 5;
    const hue = 40 - (40 * progress); // 40 → 0
    return `hsl(${hue}, 70%, 60%)`;
  }
  
  return 'hsl(220, 70%, 60%)'; // fallback
};

const chartConfig = {
  count: {
    label: "Počet úlovkov",
    color: "hsl(var(--chart-1))",
  },
};

export function HourlyDistributionChart({ data }: HourlyDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Úlovky podľa hodín</CardTitle>
          <CardDescription>Žiadne dáta o hodinových úlovkoch</CardDescription>
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
        <CardTitle>Úlovky podľa hodín</CardTitle>
        <CardDescription>
          Rozdelenie úlovkov podľa hodín dňa s farebným označením časových období
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={data}
              margin={{ bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                tickFormatter={(hour) => String(hour).padStart(2, '0') + ':00'}
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
                      if (name === 'count') {
                        return [
                          <div key="content" className="space-y-1">
                            <div className="font-medium">{payload.hourLabel}</div>
                            <div className="text-sm">
                              Počet úlovkov: {payload.count} ks
                            </div>
                            <div className="text-sm">
                              Celková váha: {payload.totalWeight} kg
                            </div>
                          </div>
                        ];
                      }
                      return [`${value}`, name];
                    }}
                    hideLabel
                  />
                }
              />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getHourColor(entry.hour)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}