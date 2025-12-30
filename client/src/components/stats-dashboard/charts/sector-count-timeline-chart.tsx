import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { getChartColorByIndex } from "@/lib/colors";
import type { SectorTimelineData } from "../types";

interface SectorCountTimelineChartProps {
  data: Record<string, SectorTimelineData[]>;
}

// Farby pre rôzne sektory - using design system
const getSectorColor = (sectorIndex: number) => {
  return getChartColorByIndex(sectorIndex);
};

export function SectorCountTimelineChart({ data }: SectorCountTimelineChartProps) {
  // Transform data for chart - combine all sectors into one dataset
  const sectors = Object.keys(data);
  if (sectors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vývoj počtu úlovkov po sektoroch</CardTitle>
          <CardDescription>Žiadne dáta o sektoroch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Žiadne dáta k dispozícii
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get timeline data from first sector to establish days
  const timelineBase = data[sectors[0]] || [];
  
  // Merge data from all sectors
  const chartData = timelineBase.map(dayData => {
    const result: any = {
      timeLabel: `Deň ${dayData.dayIndex + 1}`,
      dayIndex: dayData.dayIndex
    };
    
    // Add each sector's data
    sectors.forEach(sector => {
      const sectorData = data[sector];
      const dayEntry = sectorData.find(d => d.dayIndex === dayData.dayIndex);
      result[`sector_${sector}`] = dayEntry?.totalCount || 0;
    });
    
    return result;
  });

  // Create chart config for each sector
  const chartConfig: any = {};
  sectors.forEach((sector, index) => {
    chartConfig[`sector_${sector}`] = {
      label: `Sektor ${sector}`,
      color: getSectorColor(index),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vývoj počtu úlovkov po sektoroch</CardTitle>
        <CardDescription>
          Počet ulovených rýb v jednotlivých sektoroch počas súťaže
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timeLabel" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Počet (ks)', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => {
                      const sectorCode = name?.toString().replace('sector_', '') || '';
                      return [`${value} ks`, `Sektor ${sectorCode}`];
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              
              {/* Render line for each sector */}
              {sectors.map((sector, index) => (
                <Line
                  key={sector}
                  type="monotone"
                  dataKey={`sector_${sector}`}
                  stroke={getSectorColor(index)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}