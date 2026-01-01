import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TacticalIconVariant = 
  | "neutral" 
  | "active" 
  | "action" 
  | "danger"
  | "lime"
  | "blue"
  | "amber"
  | "purple"
  | "rose"
  | "cyan"
  | "emerald"
  | "orange"
  | "indigo"
  | "fuchsia"
  | "slate";

export interface TacticalIconProps {
  icon: LucideIcon;
  label?: string;
  variant?: TacticalIconVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}

const sizeClasses = {
  sm: {
    container: "w-10 h-10",
    icon: "w-4 h-4",
    label: "text-[7px]",
  },
  md: {
    container: "w-14 h-14",
    icon: "w-5 h-5",
    label: "text-[8px]",
  },
  lg: {
    container: "w-20 h-20",
    icon: "w-7 h-7",
    label: "text-[10px]",
  }
};

const variantClasses: Record<TacticalIconVariant, string> = {
  neutral: cn(
    "text-slate-400 border-slate-200 bg-white shadow-sm",
    "dark:text-slate-600 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-none"
  ),
  active: cn(
    "text-cyan-600 border-cyan-200 bg-cyan-50 shadow-[0_0_15px_rgba(8,145,178,0.1)]",
    "dark:text-cyan-500 dark:border-cyan-500/30 dark:bg-cyan-500/5 dark:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
  ),
  action: cn(
    "text-slate-900 border-slate-900 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)]",
    "dark:text-white dark:border-white/20 dark:bg-slate-800 dark:shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
  ),
  danger: cn(
    "text-red-600 border-red-200 bg-red-50",
    "dark:text-red-500 dark:border-red-900/30 dark:bg-red-950/20"
  ),
  lime: cn(
    "text-lime-600 border-lime-200 bg-lime-50 shadow-[0_0_15px_rgba(101,163,13,0.1)]",
    "dark:text-lime-500 dark:border-lime-500/30 dark:bg-lime-500/10 dark:shadow-[0_0_15px_rgba(132,204,22,0.15)]"
  ),
  blue: cn(
    "text-blue-600 border-blue-200 bg-blue-50 shadow-[0_0_15px_rgba(37,99,235,0.1)]",
    "dark:text-blue-500 dark:border-blue-500/30 dark:bg-blue-500/10 dark:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
  ),
  amber: cn(
    "text-amber-600 border-amber-200 bg-amber-50 shadow-[0_0_15px_rgba(217,119,6,0.1)]",
    "dark:text-amber-500 dark:border-amber-500/30 dark:bg-amber-500/10 dark:shadow-[0_0_15px_rgba(245,158,11,0.15)]"
  ),
  purple: cn(
    "text-purple-600 border-purple-200 bg-purple-50 shadow-[0_0_15px_rgba(147,51,234,0.1)]",
    "dark:text-purple-500 dark:border-purple-500/30 dark:bg-purple-500/10 dark:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
  ),
  rose: cn(
    "text-rose-600 border-rose-200 bg-rose-50 shadow-[0_0_15px_rgba(225,29,72,0.1)]",
    "dark:text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10 dark:shadow-[0_0_15px_rgba(244,63,94,0.15)]"
  ),
  cyan: cn(
    "text-cyan-600 border-cyan-200 bg-cyan-50 shadow-[0_0_15px_rgba(8,145,178,0.1)]",
    "dark:text-cyan-500 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
  ),
  emerald: cn(
    "text-emerald-600 border-emerald-200 bg-emerald-50 shadow-[0_0_15px_rgba(5,150,105,0.1)]",
    "dark:text-emerald-500 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:shadow-[0_0_15px_rgba(16,185,129,0.15)]"
  ),
  orange: cn(
    "text-orange-600 border-orange-200 bg-orange-50 shadow-[0_0_15px_rgba(234,88,12,0.1)]",
    "dark:text-orange-500 dark:border-orange-500/30 dark:bg-orange-500/10 dark:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
  ),
  indigo: cn(
    "text-indigo-600 border-indigo-200 bg-indigo-50 shadow-[0_0_15px_rgba(79,70,229,0.1)]",
    "dark:text-indigo-500 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
  ),
  fuchsia: cn(
    "text-fuchsia-600 border-fuchsia-200 bg-fuchsia-50 shadow-[0_0_15px_rgba(192,38,211,0.1)]",
    "dark:text-fuchsia-500 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:shadow-[0_0_15px_rgba(217,70,239,0.15)]"
  ),
  slate: cn(
    "text-slate-500 border-slate-200 bg-slate-50 shadow-sm",
    "dark:text-slate-400 dark:border-slate-600/30 dark:bg-slate-700/10 dark:shadow-none"
  )
};

const variantIconColors: Record<TacticalIconVariant, string> = {
  neutral: "text-slate-400 dark:text-slate-500",
  active: "text-cyan-600 dark:text-cyan-500",
  action: "text-slate-900 dark:text-white",
  danger: "text-red-600 dark:text-red-500",
  lime: "text-lime-600 dark:text-lime-500",
  blue: "text-blue-600 dark:text-blue-500",
  amber: "text-amber-600 dark:text-amber-500",
  purple: "text-purple-600 dark:text-purple-500",
  rose: "text-rose-600 dark:text-rose-500",
  cyan: "text-cyan-600 dark:text-cyan-500",
  emerald: "text-emerald-600 dark:text-emerald-500",
  orange: "text-orange-600 dark:text-orange-500",
  indigo: "text-indigo-600 dark:text-indigo-500",
  fuchsia: "text-fuchsia-600 dark:text-fuchsia-500",
  slate: "text-slate-500 dark:text-slate-400"
};

export function TacticalIcon({ 
  icon: Icon, 
  label, 
  variant = "neutral",
  size = "md",
  className,
  showLabel = true
}: TacticalIconProps) {
  const sizeConfig = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center gap-3 group", className)}>
      <div className={cn(
        "relative flex items-center justify-center transition-all duration-300",
        sizeConfig.container
      )}>
        <div 
          className={cn(
            "absolute inset-0 border-2 transition-transform duration-500 group-hover:rotate-45",
            variantClasses[variant]
          )}
          style={{ clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" }} 
        />
        
        <div className={cn(
          "absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none",
          variantIconColors[variant]
        )}>
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 w-px h-1 bg-current",
            size === "sm" ? "top-1" : size === "lg" ? "top-2" : "top-1.5"
          )} />
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 w-px h-1 bg-current",
            size === "sm" ? "bottom-1" : size === "lg" ? "bottom-2" : "bottom-1.5"
          )} />
        </div>

        <Icon className={cn(
          "relative z-10 transition-transform duration-300 group-hover:scale-110",
          "stroke-[2] dark:stroke-[1.5]",
          variantIconColors[variant],
          sizeConfig.icon
        )} />
      </div>
      
      {label && showLabel && (
        <span className={cn(
          "font-black uppercase tracking-[0.2em] transition-colors text-center max-w-[80px] leading-tight",
          "text-slate-400 group-hover:text-slate-900",
          "dark:text-slate-700 dark:group-hover:text-slate-400",
          sizeConfig.label
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

export function TacticalIconInline({ 
  icon: Icon, 
  variant = "neutral",
  size = "sm",
  className
}: Omit<TacticalIconProps, 'label' | 'showLabel'>) {
  const inlineSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6"
  };

  return (
    <Icon className={cn(
      "stroke-[2] dark:stroke-[1.5] transition-colors",
      variantIconColors[variant],
      inlineSizes[size],
      className
    )} />
  );
}
