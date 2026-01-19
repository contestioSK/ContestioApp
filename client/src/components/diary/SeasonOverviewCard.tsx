import { Card, CardContent } from "@/components/ui/card";

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
    <Card 
      className="h-full border border-slate-200/50 dark:border-[hsl(192,30%,20%)] bg-white dark:bg-[hsl(192,40%,14%)]" 
      data-testid="card-season-overview"
    >
      <CardContent className="p-5 md:p-6 flex flex-col justify-center h-full">
        <div className="text-xs font-medium text-slate-500 dark:text-[hsl(192,20%,70%)] uppercase tracking-wider mb-3">
          Sezóna {year}
        </div>
        
        <div className="text-5xl md:text-6xl font-bold text-slate-800 dark:text-[hsl(0,0%,98%)] leading-none mb-1" data-testid="text-season-total">
          {totalCatches}
        </div>
        <div className="text-sm text-slate-500 dark:text-[hsl(192,20%,70%)] mb-4">
          úlovkov celkom
        </div>
        
        <div className="text-xs text-slate-400 dark:text-[hsl(192,20%,55%)]" data-testid="text-season-secondary">
          Max: {maxWeight.toFixed(1)} kg · {daysAtWater} dní
        </div>
      </CardContent>
    </Card>
  );
}
