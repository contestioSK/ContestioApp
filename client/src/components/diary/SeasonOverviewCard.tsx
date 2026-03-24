import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "wouter";

interface SeasonOverviewCardProps {
  year: number;
  totalCatches: number;
  maxWeight: number;
  daysAtWater: number;
  trendPercentage: number | null;
  biggestCatchId: string | null;
}

export default function SeasonOverviewCard({ 
  year,
  totalCatches, 
  maxWeight,
  daysAtWater,
  trendPercentage,
  biggestCatchId
}: SeasonOverviewCardProps) {
  const isPositive = trendPercentage !== null && trendPercentage >= 0;
  const showTrend = trendPercentage !== null && trendPercentage !== 0;
  
  return (
    <Card 
      className="h-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-lg relative group rounded-xl" 
      data-testid="card-season-overview"
    >

      <CardContent className="p-4 md:p-6 flex flex-col justify-between h-full min-h-[200px] md:min-h-[280px]">
        <div>
          <div className="flex justify-between items-start mb-2 md:mb-6">
            {/* Badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Sezóna {year}</span>
            </div>
            {/* Trend icon */}
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
              {isPositive ? (
                <TrendingUp className="text-muted-foreground group-hover:scale-110 transition-transform h-5 w-5" strokeWidth={1.75} />
              ) : (
                <TrendingDown className="text-muted-foreground group-hover:scale-110 transition-transform h-5 w-5" strokeWidth={1.75} />
              )}
            </div>
          </div>

          <div className="relative">
            {/* Mobile: number + label on same line, Desktop: stacked */}
            <div className="flex items-baseline gap-2 md:block">
              <span className="text-4xl md:text-6xl font-mono font-medium text-[#F97316] tracking-tighter" data-testid="text-season-total">
                {totalCatches}
              </span>
              <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium md:block md:mt-1 md:ml-1 flex items-center gap-2">
                Úlovkov celkom 
                {showTrend && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 font-mono font-medium ${
                    isPositive 
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
                      : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                  }`}>
                    {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {isPositive ? '+' : ''}{trendPercentage}%
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        
        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 mt-4 md:mt-6 relative z-10">
          {biggestCatchId ? (
            <Link href={`/diary/catches/${biggestCatchId}`}>
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 md:p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 md:mb-1 uppercase font-bold tracking-wider">Naj Ryba</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono font-medium text-[#F97316] text-base md:text-lg" data-testid="text-season-max-weight">{maxWeight.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">kg</span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 md:p-3">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 md:mb-1 uppercase font-bold tracking-wider">Naj Ryba</p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono font-medium text-[#F97316] text-base md:text-lg" data-testid="text-season-max-weight">{maxWeight.toFixed(2)}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">kg</span>
              </div>
            </div>
          )}
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 md:p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 md:mb-1 uppercase font-bold tracking-wider">Dni pri vode</p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono font-medium text-[#F97316] text-base md:text-lg" data-testid="text-season-days">{daysAtWater}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">dní</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
