import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TrendCardProps {
  title: string;
  value: number | string;
  trend?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

export function TrendCard({ 
  title, 
  value, 
  trend, 
  icon: Icon,
  iconColor = "text-blue-500",
  iconBgColor = "bg-blue-500/10"
}: TrendCardProps) {
  const isPositiveTrend = trend && trend.value > 0;
  const isNegativeTrend = trend && trend.value < 0;
  const trendColor = isPositiveTrend ? "text-emerald-500" : isNegativeTrend ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className="bg-card border-border p-3 md:p-6 relative overflow-hidden">
      {/* Icon in top right corner */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4">
        <div className={`${iconBgColor} p-2 md:p-3 rounded-full`}>
          <Icon className={`h-4 w-4 md:h-5 md:w-5 ${iconColor}`} />
        </div>
      </div>

      {/* Title */}
      <div className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2 pr-8 md:pr-12">
        {title}
      </div>

      {/* Main value */}
      <div className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-3">
        {value}
      </div>

      {/* Trend indicator */}
      {trend && (
        <div className={`text-xs md:text-sm font-medium ${trendColor}`}>
          {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
        </div>
      )}
    </Card>
  );
}
