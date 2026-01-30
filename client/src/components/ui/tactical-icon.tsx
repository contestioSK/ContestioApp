import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// --- COLOR LOGIC (v1.4 Meaning over Theme) ---
// SYSTEM VARIANTS (Používať pre UI prvky, navigáciu a akcie)
// - neutral: Default stav pre objekty (Ryba, Mapa, Nastavenia)
// - active: Aktívny tab, vybraný prvok
// - action: Primárna akcia (CTA)
// - danger: Destruktívna akcia alebo kritická chyba
// - slate: Alternatívny neutrál (Disabled/Ghost)

// SEMANTIC ACCENTS (Používať LEN pre Data Viz, Badges a Statusy)
// - amber/orange/yellow: Warning, Gold Tier
// - emerald/lime: Success, Safe status
// - blue/cyan: Info, Processing
// - rose/red: Error, High Alert

export type TacticalIconVariant = 
  | "neutral" | "active" | "action" | "danger" | "slate"
  | "lime" | "blue" | "amber" | "purple" | "rose" | "cyan" | "emerald" | "orange" | "indigo" | "fuchsia";

// --- GEOMETRY LOCK (v1.2) ---
// rounded-lg (8px) pre prvky do 56px (sm, md)
// rounded-xl (12px) pre prvky nad 56px (lg, xl)

const sizeClasses = {
  sm: {
    container: "w-9 h-9",
    icon: "w-4 h-4",
    label: "text-[7px]",
    radius: "rounded-lg",
    stroke: 2
  },
  md: {
    container: "w-12 h-12",
    icon: "w-5 h-5",
    label: "text-[8px]",
    radius: "rounded-lg",
    stroke: 1.75
  },
  lg: {
    container: "w-16 h-16",
    icon: "w-7 h-7",
    label: "text-[9px]",
    radius: "rounded-xl",
    stroke: 1.5
  },
  xl: {
    container: "w-24 h-24",
    icon: "w-10 h-10",
    label: "text-[10px]",
    radius: "rounded-xl",
    stroke: 1.25
  }
};

const variantClasses: Record<TacticalIconVariant, string> = {
  // SYSTEM
  neutral: "text-slate-400 border-slate-700 bg-slate-800/50",
  active: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.1)]",
  action: "text-white border-slate-600 bg-slate-700 hover:border-slate-500 shadow-sm",
  danger: "text-red-400 border-red-500/30 bg-red-500/10",
  slate: "text-slate-500 border-slate-800 bg-slate-900/50",

  // SEMANTIC (Data Only)
  lime: "text-lime-400 border-lime-500/30 bg-lime-500/10",
  blue: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  purple: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  rose: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  orange: "text-[#F97316] border-[#F97316]/30 bg-[#F97316]/10",
  indigo: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
  fuchsia: "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10",
};

const variantIconColors: Record<TacticalIconVariant, string> = {
  neutral: "text-slate-400 group-hover:text-slate-200",
  active: "text-cyan-400",
  action: "text-white",
  danger: "text-red-400",
  slate: "text-slate-500 group-hover:text-slate-300",
  lime: "text-lime-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  purple: "text-purple-400",
  rose: "text-rose-400",
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  orange: "text-[#F97316]",
  indigo: "text-indigo-400",
  fuchsia: "text-fuchsia-400",
};

export interface TacticalIconProps {
  icon: LucideIcon;
  label?: string;
  variant?: TacticalIconVariant;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showLabel?: boolean;
  withMarkers?: boolean;
}

export function TacticalIcon({ 
  icon: Icon, 
  label, 
  variant = "neutral",
  size = "md",
  className,
  showLabel = true,
  withMarkers = true
}: TacticalIconProps) {
  const sizeConfig = sizeClasses[size];

  return (
    <div className={cn("flex flex-col items-center gap-2 group", className)}>
      <div className={cn(
        "relative flex items-center justify-center transition-all duration-300",
        sizeConfig.container
      )}>
        {/* Container Shape (Strict Radius) */}
        <div 
          className={cn(
            "absolute inset-0 border transition-all duration-300 group-hover:bg-opacity-20",
            sizeConfig.radius,
            variantClasses[variant]
          )}
        />
        
        {/* Technical Markers (Optional) */}
        {withMarkers && (
          <div className={cn(
            "absolute inset-0 opacity-30 pointer-events-none transition-transform duration-500",
            variant === "neutral" || variant === "slate" ? "text-slate-500" : "text-current"
          )}>
            <div className={cn("absolute left-1/2 -translate-x-1/2 w-0.5 h-1 bg-current", size === "sm" ? "top-0.5" : "top-1")} />
            <div className={cn("absolute left-1/2 -translate-x-1/2 w-0.5 h-1 bg-current", size === "sm" ? "bottom-0.5" : "bottom-1")} />
            <div className={cn("absolute top-1/2 -translate-y-1/2 h-0.5 w-1 bg-current", size === "sm" ? "left-0.5" : "left-1")} />
            <div className={cn("absolute top-1/2 -translate-y-1/2 h-0.5 w-1 bg-current", size === "sm" ? "right-0.5" : "right-1")} />
          </div>
        )}

        {/* Icon */}
        <Icon 
          className={cn(
            "relative z-10 transition-transform duration-300 group-hover:scale-110",
            variantIconColors[variant],
            sizeConfig.icon
          )} 
          strokeWidth={sizeConfig.stroke}
        />
      </div>
      
      {label && showLabel && (
        <span className={cn(
          "font-black uppercase tracking-[0.15em] transition-colors text-center leading-tight truncate w-full",
          "text-slate-500 group-hover:text-slate-300",
          sizeConfig.label
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

// Inline version for use in text, badges, etc.
export function TacticalIconInline({ 
  icon: Icon, 
  variant = "neutral",
  size = "sm",
  className
}: Omit<TacticalIconProps, 'label' | 'showLabel' | 'withMarkers'>) {
  const inlineSizes = {
    sm: { icon: "w-4 h-4", stroke: 2 },
    md: { icon: "w-5 h-5", stroke: 1.75 },
    lg: { icon: "w-6 h-6", stroke: 1.5 },
    xl: { icon: "w-8 h-8", stroke: 1.25 }
  };

  const config = inlineSizes[size];

  return (
    <Icon 
      className={cn(
        "transition-colors",
        variantIconColors[variant],
        config.icon,
        className
      )} 
      strokeWidth={config.stroke}
    />
  );
}
