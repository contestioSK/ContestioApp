import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Clock, Fish, Scale, Sunrise, Sun, Sunset, Moon } from "lucide-react";
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

const getTimeOfDayIcon = (hour: number) => {
  if (hour >= 0 && hour <= 5) return <Moon className="w-6 h-6 text-blue-400" />;
  if (hour >= 6 && hour <= 11) return <Sunrise className="w-6 h-6 text-yellow-500" />;
  if (hour >= 12 && hour <= 17) return <Sun className="w-6 h-6 text-cyan-500" />;
  return <Sunset className="w-6 h-6 text-red-400" />;
};

const getTimeOfDayLabel = (hour: number) => {
  if (hour >= 0 && hour <= 5) return 'Noc';
  if (hour >= 6 && hour <= 11) return 'Ráno';
  if (hour >= 12 && hour <= 17) return 'Popoludnie';
  return 'Večer';
};

const chartConfig = {
  count: {
    label: "Počet úlovkov",
    color: "hsl(var(--chart-1))",
  },
};

export function HourlyDistributionChart({ data }: HourlyDistributionChartProps) {
  const [selectedHour, setSelectedHour] = useState<HourlyDistributionData | null>(null);

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

  const handleBarClick = (data: any) => {
    if (data && data.payload) {
      setSelectedHour(data.payload);
    }
  };

  // Calculate statistics
  const totalCatches = data.reduce((sum, d) => sum + d.count, 0);
  const peakHour = data.reduce((max, d) => d.count > max.count ? d : max, data[0]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Úlovky podľa hodín</CardTitle>
          <CardDescription>
            Rozdelenie úlovkov podľa hodín dňa. Klikni na stĺpec pre detail.
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
                              <div className="text-xs text-primary mt-1">Klikni pre detail</div>
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
                  cursor="pointer"
                  onClick={handleBarClick}
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

      {/* Hour Detail Modal */}
      <Dialog open={!!selectedHour} onOpenChange={() => setSelectedHour(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {selectedHour?.hourLabel}
            </DialogTitle>
          </DialogHeader>
          {selectedHour && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/20">
                {getTimeOfDayIcon(selectedHour.hour)}
                <span className="text-lg font-medium">{getTimeOfDayLabel(selectedHour.hour)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <Fish className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{selectedHour.count}</p>
                  <p className="text-xs text-muted-foreground">Počet úlovkov</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <Scale className="w-6 h-6 mx-auto mb-2 text-secondary" />
                  <p className="text-2xl font-bold">{selectedHour.totalWeight} kg</p>
                  <p className="text-xs text-muted-foreground">Celková váha</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/10 text-center text-sm">
                <p className="text-muted-foreground">
                  Podiel na celkovom počte: <span className="font-semibold text-foreground">
                    {totalCatches > 0 ? ((selectedHour.count / totalCatches) * 100).toFixed(1) : 0}%
                  </span>
                </p>
                {selectedHour.hour === peakHour.hour && (
                  <p className="text-primary font-medium mt-1">⭐ Najproduktívnejšia hodina</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
