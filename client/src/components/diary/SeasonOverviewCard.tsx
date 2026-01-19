import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SeasonOverviewCardProps {
  year: number;
  totalCatches: number;
  maxWeight: number;
  daysAtWater: number;
  trendPercentage: number | null;
}

export default function SeasonOverviewCard({ 
  year,
  totalCatches, 
  maxWeight,
  daysAtWater,
  trendPercentage
}: SeasonOverviewCardProps) {
  const isPositive = trendPercentage !== null && trendPercentage >= 0;
  const showTrend = trendPercentage !== null && trendPercentage !== 0;
  
  return (
    <Card 
      className="h-full border border-slate-200 dark:border-white/10 bg-white dark:bg-gradient-to-b dark:from-[#1e293b] dark:to-[#0f172a] overflow-hidden hover:border-emerald-500/30 transition-all shadow-lg dark:shadow-2xl dark:shadow-black/40 relative group" 
      data-testid="card-season-overview"
    >
      {/* Decorative background (Chart line) - dark mode only */}
      <svg className="absolute bottom-0 left-0 w-full h-32 opacity-0 dark:opacity-20 pointer-events-none text-emerald-500" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path d="M0 40 L0 30 Q10 25 20 32 T40 28 T60 20 T80 25 T100 10 L100 40 Z" fill="currentColor" />
      </svg>
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/0 dark:bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

      <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full min-h-[280px]">
        <div>
          <div className="flex justify-between items-start mb-6">
            {/* Badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Sezóna {year}</span>
            </div>
            {/* Trend icon */}
            <div className="w-10 h-10 bg-slate-100 dark:bg-[#0B1120] rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/5 shadow-inner">
              {isPositive ? (
                <TrendingUp className="text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" size={20} />
              ) : (
                <TrendingDown className="text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform" size={20} />
              )}
            </div>
          </div>

          <div className="relative">
            <span className="text-5xl md:text-6xl font-black text-slate-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-emerald-100 dark:to-emerald-400 tracking-tighter drop-shadow-sm" data-testid="text-season-total">
              {totalCatches}
            </span>
            <span className="block text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 ml-1 flex items-center gap-2">
              Úlovkov celkom 
              {showTrend && (
                <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
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
        
        {/* Mini Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
          <div className="bg-slate-50 dark:bg-[#0B1120]/60 dark:backdrop-blur-sm border border-slate-200 dark:border-white/5 rounded-2xl p-3 hover:bg-slate-100 dark:hover:bg-[#0B1120]/80 transition-colors">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Max Váha</p>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-slate-800 dark:text-white text-lg" data-testid="text-season-max-weight">{maxWeight.toFixed(1)}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">kg</span>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-[#0B1120]/60 dark:backdrop-blur-sm border border-slate-200 dark:border-white/5 rounded-2xl p-3 hover:bg-slate-100 dark:hover:bg-[#0B1120]/80 transition-colors">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 uppercase font-bold tracking-wider">Dni pri vode</p>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-slate-800 dark:text-white text-lg" data-testid="text-season-days">{daysAtWater}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">dní</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
