import { useLocation } from "wouter";
import { ClipboardList, CalendarClock, Radio, Flag, ArrowRight, Zap } from "lucide-react";
import { TacticalIcon, TacticalIconVariant } from "@/components/ui/tactical-icon";
import type { LucideIcon } from "lucide-react";

interface ModeCardProps {
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  variant: TacticalIconVariant;
  route: string;
  isPriority?: boolean;
}

function ModeCard({ title, description, cta, icon, variant, route, isPriority = false }: ModeCardProps) {
  const [, setLocation] = useLocation();

  const handleNavigation = () => {
    setLocation(route);
    window.scrollTo(0, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigation();
    }
  };

  return (
    <div 
      onClick={handleNavigation}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      className={`
        group relative flex flex-col justify-between p-6 md:p-8 h-56 md:h-64
        bg-card border rounded-xl transition-all duration-300 cursor-pointer overflow-hidden outline-none 
        focus:ring-2 focus:ring-[#F97316]/50 focus:border-[#F97316]
        ${isPriority 
          ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_30px_-10px_rgba(16,185,129,0.1)]' 
          : 'border-border hover:border-slate-600 hover:shadow-xl'}
      `}
    >
      <div className={`
        absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none
        ${variant === 'orange' ? 'from-orange-500 to-transparent' : ''}
        ${variant === 'blue' ? 'from-blue-500 to-transparent' : ''}
        ${variant === 'emerald' ? 'from-emerald-500 to-transparent' : ''}
        ${variant === 'slate' ? 'from-slate-500 to-transparent' : ''}
      `} />

      <div>
        <div className="flex justify-between items-start mb-4 md:mb-6">
          <TacticalIcon icon={icon} variant={variant} size="md" showLabel={false} />
          {isPriority && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">On Air</span>
            </div>
          )}
        </div>

        <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-foreground mb-2 group-hover:translate-x-1 transition-transform duration-300">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-[240px]">
          {description}
        </p>
      </div>

      <div className="flex justify-end">
        <span className={`
          flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all
          ${isPriority ? 'text-emerald-400 group-hover:text-emerald-300' : 'text-muted-foreground group-hover:text-foreground'}
        `}>
          {cta} 
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  );
}

export default function CompetitionsPage() {
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-12 pb-32 flex flex-col" style={{
      backgroundImage: `
        linear-gradient(rgba(30, 41, 59, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30, 41, 59, 0.02) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px'
    }}>
      
      <header className="max-w-5xl mx-auto w-full mb-8 md:mb-16 space-y-4 pt-4 md:pt-8">
        <div className="flex items-center gap-3">
          <span className="h-0.5 w-8 bg-[#F97316]"></span>
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#F97316]">Súťaže</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black italic tracking-tighter uppercase text-foreground leading-none">
            Rybárske súťaže
          </h1>
          <p className="text-sm md:text-lg font-bold text-muted-foreground italic tracking-tight opacity-80 pl-1 max-w-xl">
            Registrácia, priebeh a výsledky.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        <ModeCard 
          title="Registrácia"
          description="Otvorené súťaže, do ktorých sa môžeš prihlásiť."
          cta="Zobraziť"
          icon={ClipboardList}
          variant="orange"
          route="/categories/registration-open"
        />

        <ModeCard 
          title="Nadchádzajúce"
          description="Súťaže, ktoré začnú v najbližšom období."
          cta="Zobraziť"
          icon={CalendarClock}
          variant="blue"
          route="/categories/upcoming"
        />

        <ModeCard 
          title="Live súťaže"
          description="Súťaže, ktoré práve prebiehajú."
          cta="Vstúpiť"
          icon={Radio}
          variant="emerald"
          route="/categories/live"
          isPriority={true}
        />

        <ModeCard 
          title="Ukončené"
          description="Dokončené súťaže a výsledky."
          cta="Prehliadať"
          icon={Flag}
          variant="slate"
          route="/categories/finished"
        />

      </main>

      <footer className="max-w-5xl mx-auto w-full mt-auto pt-16 md:pt-24 flex items-center gap-4 opacity-20">
        <Zap size={14} className="text-[#F97316]" />
      </footer>

    </div>
  );
}
