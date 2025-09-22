import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { SectorFishTypeData } from "../types";

interface SectorFishTypeChartProps {
  data: SectorFishTypeData[];
}

const chartConfig = {
  scaly: {
    label: "Šupináč",
    color: "hsl(220, 70%, 50%)",
  },
  mirror: {
    label: "Lysec", 
    color: "hsl(160, 70%, 45%)",
  },
};

export function SectorFishTypeChart({ data }: SectorFishTypeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Druhy rýby v jednotlivých sektoroch</CardTitle>
          <CardDescription>Žiadne dáta o druhoch rýb</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Žiadne dáta k dispozícii
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = data.map(item => ({
    sector: item.sector,
    scaly: item.scaly,
    mirror: item.mirror,
    totalCount: item.scaly + item.mirror,
    scalyWeight: item.scalyWeight,
    mirrorWeight: item.mirrorWeight,
    totalWeight: item.scalyWeight + item.mirrorWeight
  })).sort((a, b) => b.totalCount - a.totalCount); // Sort by total count descending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Druhy rýby v jednotlivých sektoroch</CardTitle>
        <CardDescription>
          Aký typ kapra prevláda v jednotlivých sektoroch?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="sector" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Počet rýb', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const payload = props.payload;
                      if (name === 'scaly') {
                        return [
                          `${value} ks (${payload.scalyWeight} kg)`, 
                          "Šupináč"
                        ];
                      } else if (name === 'mirror') {
                        return [
                          `${value} ks (${payload.mirrorWeight} kg)`, 
                          "Lysec"
                        ];
                      }
                      return [`${value}`, name];
                    }}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      if (item) {
                        return (
                          <div className="space-y-1">
                            <div className="font-medium">{item.sector}</div>
                            <div className="text-xs text-muted-foreground">
                              Spolu: {item.totalCount} rýb ({item.totalWeight} kg)
                            </div>
                          </div>
                        );
                      }
                      return label;
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="scaly"
                stackId="fishType"
                fill={chartConfig.scaly.color}
                radius={[0, 0, 4, 4]}
              />
              <Bar
                dataKey="mirror"
                stackId="fishType"
                fill={chartConfig.mirror.color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}