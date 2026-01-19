import { Card, CardContent } from "@/components/ui/card";
import { Fish, Weight, CalendarDays } from "lucide-react";

interface SeasonOverviewCardProps {
  year: number;
  totalCatches: number;
  maxWeight: number;
  daysAtWater: number;
}

export default function SeasonOverviewCard({ 
  year,
  totalCatches, 
  maxWeight,
  daysAtWater 
}: SeasonOverviewCardProps) {
  return (
    <Card className="bg-card border border-slate-200 shadow-sm dark:bg-slate-800/50 dark:border-slate-700/50 h-full" data-testid="card-season-overview">
      <CardContent className="p-5 md:p-6">
        <h2 className="text-sm font-medium text-muted-foreground dark:text-slate-400 mb-4">
          Sezóna {year}
        </h2>
        
        <div className="flex items-start gap-6">
          {/* Main Value - Total Catches */}
          <div className="flex items-center gap-3">
            <Fish className="w-8 h-8 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <div>
              <div className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-white" data-testid="text-season-total">
                {totalCatches}
              </div>
              <div className="text-sm text-muted-foreground dark:text-slate-400">
                úlovkov celkom
              </div>
            </div>
          </div>
          
          {/* Secondary Metrics */}
          <div className="flex flex-col gap-3 ml-auto">
            <div className="flex items-center gap-2 text-sm">
              <Weight className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-muted-foreground dark:text-slate-400">Max váha</span>
              <span className="font-semibold text-slate-800 dark:text-white ml-1" data-testid="text-season-max-weight">
                {maxWeight.toFixed(1)} kg
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="text-muted-foreground dark:text-slate-400">Dni pri vode</span>
              <span className="font-semibold text-slate-800 dark:text-white ml-1" data-testid="text-season-days">
                {daysAtWater}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
