import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { SectorTimelineData } from "../types";

interface SectorActivityChartProps {
  data: Record<string, SectorTimelineData[]>;
}

// Farby pre rôzne sektory
const getSectorColor = (sectorIndex: number) => {
  const colors = [
    'hsl(220, 70%, 60%)',  // modrá - Sektor A
    'hsl(160, 70%, 50%)',  // tyrkysová - Sektor B
    'hsl(120, 70%, 50%)',  // zelená - Sektor C
    'hsl(40, 70%, 60%)',   // oranžová - Sektor D
    'hsl(0, 70%, 60%)',    // červená - Sektor E
    'hsl(280, 70%, 60%)',  // fialová - Sektor F
    'hsl(200, 70%, 60%)',  // svetlá modrá - Sektor G
  ];
  return colors[sectorIndex % colors.length];
};

export function SectorActivityChart({ data }: SectorActivityChartProps) {
  const sectors = Object.keys(data);
  if (sectors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aktivita sektorov v čase</CardTitle>
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
  
  // Transform data to show daily activity (new catches per day, not cumulative)
  const chartData = timelineBase.map(dayData => {
    const result: any = {
      timeLabel: `Deň ${dayData.dayIndex + 1}`,
      dayIndex: dayData.dayIndex
    };
    
    // Calculate daily activity (new catches for each day) for each sector
    sectors.forEach(sector => {
      const sectorData = data[sector];
      const currentDay = sectorData.find(d => d.dayIndex === dayData.dayIndex);
      const previousDay = sectorData.find(d => d.dayIndex === dayData.dayIndex - 1);
      
      // Calculate new catches for this day (difference from previous day)
      const currentCount = currentDay?.totalCount || 0;
      const previousCount = previousDay?.totalCount || 0;
      const dailyActivity = Math.max(0, currentCount - previousCount);
      
      result[`sector_${sector}_activity`] = dailyActivity;
    });
    
    return result;
  });

  // Create chart config for each sector
  const chartConfig: any = {};
  sectors.forEach((sector, index) => {
    chartConfig[`sector_${sector}_activity`] = {
      label: `Sektor ${sector}`,
      color: getSectorColor(index),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivita sektorov v čase</CardTitle>
        <CardDescription>
          Denná aktivita (nové úlovky) v jednotlivých sektoroch
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timeLabel" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Nové úlovky', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => {
                      const sectorCode = name?.toString().replace('sector_', '').replace('_activity', '') || '';
                      return [`${value} nových`, `Sektor ${sectorCode}`];
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              
              {/* Render stacked bars for each sector */}
              {sectors.map((sector, index) => (
                <Bar
                  key={sector}
                  dataKey={`sector_${sector}_activity`}
                  stackId="activity"
                  fill={getSectorColor(index)}
                  radius={index === sectors.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}