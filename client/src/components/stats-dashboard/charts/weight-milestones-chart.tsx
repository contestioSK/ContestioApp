import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { WeightMilestoneData } from "../types";

interface WeightMilestonesChartProps {
  data: WeightMilestoneData[];
}

export function WeightMilestonesChart({ data }: WeightMilestonesChartProps) {
  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    return new Date(timeString).toLocaleTimeString('sk-SK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMilestoneStatus = (milestone: string | null) => {
    return milestone ? (
      <div className="flex items-center gap-1">
        <Check className="w-3 h-3 text-green-600" />
        <span className="text-xs text-green-600">{formatTime(milestone)}</span>
      </div>
    ) : (
      <div className="flex items-center gap-1">
        <X className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">-</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Váhové míľniky tímov</CardTitle>
        <CardDescription>
          Kedy ktorý tím dosiahol prvú rybu nad 15kg, 20kg a 25kg
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((team) => (
            <div 
              key={team.teamName}
              className="p-4 border rounded-lg bg-muted/5"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{team.teamName}</h4>
                <Badge variant="outline" className="text-xs">
                  {[team.first15kg, team.first20kg, team.first25kg].filter(Boolean).length}/3
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs font-medium text-muted-foreground mb-1">15+ kg</div>
                  {getMilestoneStatus(team.first15kg)}
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-medium text-muted-foreground mb-1">20+ kg</div>
                  {getMilestoneStatus(team.first20kg)}
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-medium text-muted-foreground mb-1">25+ kg</div>
                  {getMilestoneStatus(team.first25kg)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}