import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";
import { sk } from "date-fns/locale";

interface CatchFrequencyData {
  date: string; // ISO date for calculations
  dateLabel: string; // Display label
  catches: number;
  trips: number;
  efficiency: number; // catches per trip
}

interface CatchFrequencyChartProps {
  data: CatchFrequencyData[];
}

const chartConfig = {
  catches: {
    label: "Počet úlovkov",
    color: "hsl(var(--chart-1))",
  },
  trips: {
    label: "Počet výprav",
    color: "hsl(var(--chart-2))",
  },
};

// Color gradient based on efficiency
const getEfficiencyColor = (efficiency: number) => {
  if (efficiency >= 5) return 'hsl(120, 70%, 50%)';  // Green - high efficiency
  if (efficiency >= 3) return 'hsl(60, 70%, 50%)';   // Yellow - medium efficiency  
  if (efficiency >= 1) return 'hsl(30, 70%, 50%)';   // Orange - low efficiency
  return 'hsl(0, 70%, 50%)';  // Red - very low efficiency
};

export function CatchFrequencyChart({ data }: CatchFrequencyChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Frekvencia úlovkov</CardTitle>
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
        <CardTitle>Frekvencia úlovkov v čase</CardTitle>
        <CardDescription>
          Počet úlovkov a výprav s efektívnosťou (farba označuje úspešnosť)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="displayLabel" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Počet', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const payload = props.payload;
                      return [
                        <div key="content" className="space-y-1">
                          <div className="font-medium">{payload.displayLabel}</div>
                          <div>Úlovky: {payload.catches} ks</div>
                          <div>Výpravy: {payload.trips} ks</div>
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
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getEfficiencyColor(entry.efficiency)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}