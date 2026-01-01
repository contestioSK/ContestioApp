import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TacticalIconVariant = "neutral" | "active" | "action" | "danger";

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

const variantClasses = {
  neutral: cn(
    "text-slate-400 border-slate-200 bg-white shadow-sm",
    "dark:text-slate-600 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-none"
  ),
  active: cn(
    "text-cyan-600 border-cyan-200 bg-cyan-50 shadow-[0_0_15px_rgba(8,145,178,0.1)]",
    "dark:text-cyan-400 dark:border-cyan-500/30 dark:bg-cyan-500/5 dark:shadow-[0_0_15px_rgba(34,211,238,0.1)]"
  ),
  action: cn(
    "text-slate-900 border-slate-900 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)]",
    "dark:text-white dark:border-white/20 dark:bg-slate-800 dark:shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
  ),
  danger: cn(
    "text-red-600 border-red-200 bg-red-50",
    "dark:text-red-500 dark:border-red-900/30 dark:bg-red-950/20"
  )
};

const variantIconColors = {
  neutral: "text-slate-400 dark:text-slate-500",
  active: "text-cyan-600 dark:text-cyan-400",
  action: "text-slate-900 dark:text-white",
  danger: "text-red-600 dark:text-red-500"
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
