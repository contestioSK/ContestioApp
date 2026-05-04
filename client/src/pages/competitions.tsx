import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, 
  Calendar, 
  Timer, 
  Radio, 
  Flag, 
  ChevronRight, 
  Users, 
  Zap, 
  CheckCircle2,
  Lock,
  ExternalLink,
  Waves
} from "lucide-react";
import type { Competition } from "@shared/schema";

function Hero() {
  const [, setLocation] = useLocation();

  return (
    <section className="relative min-h-[500px] md:min-h-[600px] flex flex-col justify-center items-center overflow-hidden pt-16 md:pt-20 border-b border-slate-800">
      <div className="absolute inset-0 bg-[#0B1C2F]">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C2F] via-[#0B1C2F]/80 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full text-center space-y-6 md:space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-500/30 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">Sezóna 2025 Live</span>
        </div>

        <h1 className="text-3xl md:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 leading-tight drop-shadow-xl">
          Ovládni svoj revír
        </h1>

        <p className="max-w-xl mx-auto text-base md:text-lg text-slate-400 font-medium leading-relaxed">
          Profesionálna platforma pre slovenské rybárske súťaže. 
          Sleduj preteky naživo alebo sa staň legendou zväzu.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 md:pt-6">
          <button 
            onClick={() => setLocation('/categories/live')}
            className="px-6 md:px-8 py-3 md:py-4 bg-[#F97316] hover:bg-orange-500 text-white rounded-xl font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20"
          >
            Otvoriť Live Centrum <Radio size={16} />
          </button>
          
          <button 
            onClick={() => setLocation('/categories/registration-open')}
            className="px-6 md:px-8 py-3 md:py-4 bg-transparent hover:bg-slate-800/30 text-slate-400 hover:text-white border border-slate-700/50 hover:border-slate-500 rounded-xl font-black uppercase tracking-[0.1em] text-xs transition-all flex items-center justify-center gap-2"
          >
            Registrovať tím <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function LiveTeaser() {
  const [, setLocation] = useLocation();
  
  const { data: liveCompetitions, isLoading } = useQuery<Competition[]>({
    queryKey: ['/api/competitions/live'],
    staleTime: 30000,
  });

  const liveCompetition = liveCompetitions?.[0];
  const hasLive = !!liveCompetition;

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ['/api/competitions', liveCompetition?.id, 'leaderboard'],
    enabled: hasLive,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const top3 = leaderboard?.slice(0, 3) ?? [];

  const handleClick = () => {
    if (liveCompetition) {
      setLocation(`/competition/${liveCompetition.id}`);
    } else {
      setLocation('/categories/live');
    }
  };

  if (isLoading) {
    return (
      <section className="relative -mt-12 md:-mt-16 z-20 px-4 md:px-6 max-w-5xl mx-auto">
        <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-1 shadow-2xl overflow-hidden">
          <div className="relative bg-[#0B1C2F] rounded-xl p-6 md:p-8 h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative -mt-12 md:-mt-16 z-20 px-4 md:px-6 max-w-5xl mx-auto">
      <div 
        onClick={handleClick}
        className={`group bg-[#0F172A] border ${hasLive ? 'border-slate-700 hover:border-emerald-500/50' : 'border-slate-800 hover:border-slate-600'} rounded-2xl p-1 shadow-2xl overflow-hidden cursor-pointer transition-all hover:translate-y-[-2px]`}
      >
        <div className="relative bg-[#0B1C2F] rounded-xl overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-25 transition-opacity duration-700"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?q=80&w=2070&auto=format&fit=crop')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1C2F] via-[#0B1C2F]/90 to-[#0B1C2F]/80" />

          <div className="relative p-4 md:p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 border border-slate-800/50">
            <div className="text-center md:text-left space-y-2 w-full md:w-auto">
              {hasLive ? (
                <>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 mb-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest">Práve na vode</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black italic uppercase text-white truncate max-w-xs md:max-w-md mx-auto md:mx-0 group-hover:text-emerald-50 transition-colors">
                    {liveCompetition.name}
                    <ExternalLink size={16} className="inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                  </h3>
                  <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5"><Users size={14}/> Preteky</span>
                    <span className="flex items-center gap-1.5 text-orange-400"><Timer size={14}/> Prebieha</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500 mb-2">
                    <Radio size={14} />
                    <span className="text-xs font-black uppercase tracking-widest">Žiadne live preteky</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black italic uppercase text-slate-300 max-w-xs md:max-w-md mx-auto md:mx-0 group-hover:text-white transition-colors">
                    Momentálne žiadna súťaž neprebieha
                  </h3>
                  <p className="text-sm text-slate-500">Pozri si nadchádzajúce preteky alebo výsledky ukončených súťaží.</p>
                </>
              )}
            </div>

            <div className="w-full md:w-auto bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700/50 p-4 min-w-[280px] group-hover:border-emerald-500/20 transition-colors">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700/50">
                <span className="text-[10px] uppercase font-bold text-slate-500">Top 3 Tímy</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Kg</span>
              </div>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between text-white font-bold">
                  <span className="truncate max-w-[140px]">1. {top3[0]?.teamName ?? '---'}</span>
                  <span className={`flex-shrink-0 ${hasLive ? 'text-[#F97316]' : 'text-slate-500'}`}>
                    {top3[0] ? `${parseFloat(top3[0].totalWeight ?? 0).toFixed(2)}` : '---.--'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="truncate max-w-[140px]">2. {top3[1]?.teamName ?? '---'}</span>
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 blur-[3px] select-none opacity-50">
                      {top3[1] ? `${parseFloat(top3[1].totalWeight ?? 0).toFixed(2)}` : '---.--'}
                    </span>
                    <Lock size={10} className="text-slate-500" />
                  </div>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="truncate max-w-[140px]">3. {top3[2]?.teamName ?? '---'}</span>
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 blur-[3px] select-none opacity-50">
                      {top3[2] ? `${parseFloat(top3[2].totalWeight ?? 0).toFixed(2)}` : '---.--'}
                    </span>
                    <Lock size={10} className="text-slate-500" />
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2 text-center flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest border-t border-slate-800/50">
                <span>{hasLive ? 'Klikni pre detail' : 'Čakáme na štart'}</span>
                <span className={`font-bold group-hover:underline flex items-center gap-1 ${hasLive ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {hasLive ? 'Odomknúť' : 'Zobraziť všetky'} <ArrowRight size={10} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ModeCardProps {
  title: string;
  description: string;
  cta: string;
  icon: React.ElementType;
  variant: 'orange' | 'blue' | 'emerald' | 'slate';
  route: string;
  hint?: string;
  isLive?: boolean;
  hasBackground?: boolean;
}

function ModeCard({ title, description, cta, icon: Icon, variant, route, hint, isLive = false, hasBackground = false }: ModeCardProps) {
  const [, setLocation] = useLocation();

  const handleNavigation = () => {
    setLocation(route);
    window.scrollTo(0, 0);
  };

  const borderColors = {
    orange: 'border-slate-800 hover:border-orange-500/50',
    blue: 'border-slate-800 hover:border-blue-500/50',
    emerald: 'border-emerald-500/30 hover:border-emerald-500',
    slate: 'border-slate-800 hover:border-slate-600',
  };

  const iconColors = {
    orange: 'text-orange-500',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    slate: 'text-slate-400',
  };

  const shadowColors = {
    orange: 'hover:shadow-lg hover:shadow-orange-900/10',
    blue: 'hover:shadow-lg hover:shadow-blue-900/10',
    emerald: 'hover:shadow-lg hover:shadow-emerald-900/10',
    slate: '',
  };

  const ctaColors = {
    orange: 'text-slate-500 group-hover:text-white',
    blue: 'text-slate-500 group-hover:text-white',
    emerald: 'text-emerald-500 group-hover:text-emerald-400',
    slate: 'text-slate-500 group-hover:text-white',
  };

  const hintColors = {
    orange: 'text-orange-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    slate: 'text-slate-400',
  };

  if (hasBackground) {
    return (
      <div 
        onClick={handleNavigation}
        className={`group relative bg-[#0F172A] ${borderColors[variant]} rounded-xl overflow-hidden p-6 md:p-8 transition-all duration-300 ${shadowColors[variant]} cursor-pointer h-56 md:h-64 flex flex-col justify-end`}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/60 to-transparent" />
        
        <div className="relative z-10">
          <div className="absolute top-0 right-0 -mt-24 md:-mt-32 w-12 h-12 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700 flex items-center justify-center mb-6">
            <Icon size={24} className={iconColors[variant]} />
          </div>
          <h3 className="text-xl font-black italic uppercase text-white mb-2 flex items-center gap-2">
            {title} 
            {isLive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </h3>
          <p className="text-sm text-slate-300 mb-2 leading-relaxed opacity-80">{description}</p>
          
          {hint && (
            <div className={`flex items-center gap-2 text-[10px] ${hintColors[variant]} font-mono mb-4 opacity-90 group-hover:opacity-100 transition-opacity`}>
              <Zap size={12} /> <span>{hint}</span>
            </div>
          )}

          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${ctaColors[variant]} flex items-center gap-2 transition-colors`}>
            {cta} <ArrowRight size={12} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleNavigation}
      className={`group bg-[#0F172A] ${borderColors[variant]} rounded-xl p-6 md:p-8 transition-all duration-300 ${shadowColors[variant]} cursor-pointer h-56 md:h-64 flex flex-col justify-between`}
    >
      <div>
        <div className={`w-12 h-12 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center mb-6 ${iconColors[variant]} group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        <h3 className="text-xl font-black italic uppercase text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        {hint && (
          <div className={`flex items-center gap-2 text-[10px] ${hintColors[variant]} font-mono mt-2 opacity-80 group-hover:opacity-100 transition-opacity`}>
            <CheckCircle2 size={12} /> <span>{hint}</span>
          </div>
        )}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${ctaColors[variant]} flex items-center gap-2 transition-colors justify-end`}>
        {cta} <ArrowRight size={12} />
      </span>
    </div>
  );
}

function ModeGrid() {
  return (
    <section className="py-16 md:py-24 px-4 md:px-6" style={{
      backgroundImage: `
        linear-gradient(rgba(30, 41, 59, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30, 41, 59, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px'
    }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 md:mb-16 space-y-2">
          <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white">Možnosti súťaženia</h2>
          <p className="text-slate-500">Vyber si, v akej fáze sa chceš zapojiť.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <ModeCard 
            title="Registrácia"
            description="Otvorené výzvy. Zaregistruj svoj tím a rezervuj si miesto na štarte."
            cta="Zobraziť výzvy"
            icon={Calendar}
            variant="orange"
            route="/categories/registration-open"
            hint="Zaberie menej než 2 minúty"
          />

          <ModeCard 
            title="Nadchádzajúce"
            description="Plánované preteky. Pozri si propozície a priprav sa na sezónu."
            cta="Kalendár"
            icon={Timer}
            variant="blue"
            route="/categories/upcoming"
          />

          <ModeCard 
            title="Live"
            description="Sleduj prebiehajúce preteky v reálnom čase. Online výsledky."
            cta="Vstúpiť do diania"
            icon={Radio}
            variant="emerald"
            route="/categories/live"
            hint="Okamžitý prístup"
            isLive={true}
            hasBackground={true}
          />

          <ModeCard 
            title="Výsledky"
            description="Archív ukončených súťaží. Tabuľky, štatistiky a víťazi."
            cta="Prehliadať"
            icon={Flag}
            variant="slate"
            route="/categories/finished"
          />
        </div>
      </div>
    </section>
  );
}

function FooterCTA() {
  const [, setLocation] = useLocation();

  return (
    <section className="py-24 md:py-32 text-center px-4 md:px-6">
      <div className="max-w-2xl mx-auto space-y-6 md:space-y-8">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white">
          Súťaže sú otvorené.
        </h2>
        <p className="text-slate-400 text-base md:text-lg">
          Otázka je, či budeš len sledovať – alebo chytať.
        </p>
        <div className="flex justify-center">
          <button 
            onClick={() => setLocation('/categories/registration-open')}
            className="px-8 md:px-12 py-4 bg-white text-[#0B1C2F] hover:bg-slate-200 rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-transform hover:scale-105"
          >
            Zaregistrovať sa
          </button>
        </div>
        <div className="pt-8 md:pt-12 opacity-30">
          <div className="flex items-center justify-center gap-2 font-black italic text-lg text-white">
            <Waves size={20} /> PRIVODE
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CompetitionsPage() {
  return (
    <div className="min-h-screen bg-[#0B1C2F]">
      <Hero />
      <LiveTeaser />
      <ModeGrid />
      <FooterCTA />
    </div>
  );
}
