import { Menu, X, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import contestioLogo from "@assets/figma/logo.png";
import starsBackground from "@assets/figma/stars_background.png";
import categoryActive from "@assets/figma/category_active.png";
import categoryUpcoming from "@assets/figma/category_upcoming.png";
import categoryLive from "@assets/figma/category_live.png";
import categoryFinished from "@assets/figma/category_finished.png";
import featureCentrum from "@assets/figma/feature_centrum.png";
import featureDennik from "@assets/figma/feature_dennik.png";

function GradientOrb1() {
  return (
    <div 
      className="w-full h-full rounded-[50%]"
      style={{ 
        backgroundColor: '#102A38',
        filter: 'blur(207px)',
      }}
    />
  );
}

function GradientOrb2() {
  return (
    <div 
      className="w-full h-full rounded-[50%]"
      style={{ 
        background: 'linear-gradient(90deg, #19ADFF 0%, #2E769E 100%)',
        filter: 'blur(207px)',
      }}
    />
  );
}

interface Competition {
  id: string;
  name: string;
  status: 'registration' | 'live' | 'finished';
}

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { data: competitions = [] } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"]
  });

  const navItems = [
    { href: "/about-us", label: "O nás" },
    { href: "/faq", label: "FAQ" },
    { href: "/pricing", label: "Cenník" },
    { href: "/contact", label: "Kontakt" },
    { href: "/organizer/create", label: "Vytvoriť súťaž" },
  ];

  const liveCount = competitions.filter(c => c.status === 'live').length || 1;
  const activeCount = competitions.filter(c => c.status === 'registration').length || 1;
  const finishedCount = competitions.filter(c => c.status === 'finished').length || 1;

  return (
    <div className="bg-[#08101a] min-h-screen relative overflow-x-hidden">
      
      {/* Background Effects - scale factor: min(1, 100vw/1440px) */}
      {/* Orb1: X=192.2, Y=-181.42, W=948.31, H=571.27 */}
      <div 
        className="absolute pointer-events-none"
        style={{ 
          top: 'calc(-181px * min(1, 100vw / 1440px))',
          left: 'calc(192px * min(1, 100vw / 1440px))',
          width: 'calc(948px * min(1, 100vw / 1440px))', 
          height: 'calc(571px * min(1, 100vw / 1440px))' 
        }}
      >
        <GradientOrb1 />
      </div>
      {/* Orb2: X=385.27, Y=297.88, W=948.31, H=303.95 */}
      <div 
        className="absolute pointer-events-none"
        style={{ 
          top: 'calc(298px * min(1, 100vw / 1440px))',
          left: 'calc(385px * min(1, 100vw / 1440px))',
          width: 'calc(948px * min(1, 100vw / 1440px))', 
          height: 'calc(304px * min(1, 100vw / 1440px))' 
        }}
      >
        <GradientOrb2 />
      </div>
      {/* Stars background: 95% width, aspect ratio preserved */}
      <div 
        className="absolute mix-blend-screen pointer-events-none"
        style={{
          top: '-17px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '95%',
          aspectRatio: '1834 / 1200'
        }}
      >
        <img src={starsBackground} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-4 md:px-20 pt-[45px]">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/">
            <img src={contestioLogo} alt="Contestio" className="h-[37px] w-auto" />
          </Link>

          {/* Desktop Nav Pill */}
          <div className="hidden lg:flex items-center gap-6 px-6 py-3 rounded-full border border-white/10 bg-gradient-to-r from-[#08101a]/80 via-[#0e2331]/60 to-[#08121c]/80 backdrop-blur-[12px]">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className="text-white text-sm font-normal cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
          
          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/auth/login">
              <div className="bg-[#fb923c] px-5 py-2.5 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#f97316] transition-colors">
                <span className="text-[#08101b] text-sm font-medium" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                  Prihlásiť sa
                </span>
              </div>
            </Link>
            <Link href="/auth/register">
              <div className="backdrop-blur-[12px] border border-white/10 px-5 py-2.5 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                <span className="text-white text-sm font-normal whitespace-nowrap" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                  Zaregistrovať sa
                </span>
              </div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white p-2"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 p-6 rounded-2xl bg-[#0e1a26]/95 backdrop-blur-xl border border-white/10">
            <div className="space-y-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div 
                    className="px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <Link href="/auth/login">
                  <div className="w-full bg-[#fb923c] text-[#08101b] font-medium py-3 rounded-full text-center cursor-pointer">
                    Prihlásiť sa
                  </div>
                </Link>
                <Link href="/auth/register">
                  <div className="w-full border border-white/10 text-white py-3 rounded-full text-center cursor-pointer">
                    Zaregistrovať sa
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 md:px-20 pt-[67px]">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Left Column - Text */}
            <div className="flex flex-col gap-[37px] max-w-[791px]">
              <div className="flex flex-col gap-[23px]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                <div className="flex flex-col gap-4 tracking-[-4.8px]">
                  <div className="flex gap-5 items-center text-[52px] md:text-[82px] leading-[96px]">
                    <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent opacity-60">
                      Živý rybolov
                    </span>
                    <span className="text-white">
                      Súťaže
                    </span>
                  </div>
                  <p className="text-[32px] md:text-[52px] leading-[96px] text-white font-medium">
                    Skutočné výsledky. Jedna platforma.
                  </p>
                </div>
                <p className="text-xl text-white leading-8 max-w-[728px] font-medium">
                  Zúčastnite sa turnajov v živom rybolove, sledujte svoj pokrok a zostaňte v spojení s rybárskou komunitou
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-5">
                <Link href="/competitions">
                  <div className="bg-[#fb923c] px-[10px] py-[17px] rounded-[28px] w-[195px] flex items-center justify-center cursor-pointer hover:bg-[#f97316] transition-colors">
                    <span className="text-[#08101b] text-base font-normal text-center" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                      Zapojte sa do súťaže
                    </span>
                  </div>
                </Link>
                <Link href="/categories/all">
                  <div className="backdrop-blur-[12px] border border-white/8 h-[50px] rounded-full w-[195px] flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                    <span className="text-white text-base font-normal text-center" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                      Preskúmajte súťaže
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Right Column - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div 
                className="relative w-[280px] md:w-[330px] h-[560px] md:h-[661px]"
                style={{ transform: 'rotate(1.44deg) skewX(-22.42deg) scaleY(0.92)' }}
              >
                <div className="bg-[#09090b] border-[12px] border-[#27272a] rounded-[56px] w-full h-full overflow-hidden shadow-[30px_110px_163px_0px_rgba(0,0,0,0.92)]">
                  <div className="absolute inset-[1px] bg-gradient-to-b from-[#18181b] to-black rounded-[44px] overflow-hidden">
                    
                    {/* Phone Header */}
                    <div className="flex items-center justify-center pt-[60px]">
                      <div className="w-2 h-2 bg-[#10b981] rounded-full shadow-[0px_0px_10px_0px_rgba(16,185,129,0.5)] mr-2" />
                      <span className="text-white text-sm font-semibold tracking-[0.35px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Live Výsledky
                      </span>
                    </div>

                    {/* Total Volume */}
                    <div className="text-center mt-8">
                      <p className="text-[#71717a] text-[10px] uppercase tracking-[1px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Total Volume
                      </p>
                      <p className="text-white text-[48px] font-medium tracking-[-2.4px] mt-1" style={{ fontFamily: "'Geist', sans-serif" }}>
                        $8,245.32
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded px-2 py-1 text-[#10b981] text-[10px] font-semibold">
                          +12.4%
                        </span>
                        <span className="text-[#71717a] text-xs">this week</span>
                      </div>
                    </div>

                    {/* Active Nodes Section */}
                    <div className="absolute bottom-0 left-0 right-0 bg-[rgba(24,24,27,0.6)] backdrop-blur-[6px] border-t border-white/5 rounded-t-[32px] pt-4 px-6 pb-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[#71717a] text-[10px] uppercase tracking-[0.5px] font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
                          Active Nodes
                        </span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-[#52525b] rounded-full" />
                          <div className="w-1 h-1 bg-[#3f3f46] rounded-full" />
                        </div>
                      </div>

                      {/* Team Cards */}
                      <div className="space-y-3">
                        {[
                          { name: 'Tím Alfa', catches: '12 úlovkov', weight: '245 kg' },
                          { name: 'Rybári SK', catches: '9 úlovkov', weight: '198 kg' },
                          { name: 'Kapráři CZ', catches: '9 úlovkov', weight: '8 úlovkov' },
                        ].map((team, i) => (
                          <div 
                            key={i}
                            className="p-3 rounded-xl h-[56px]"
                            style={{ background: 'linear-gradient(169deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)' }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-white text-xs font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                                  {team.name}
                                </span>
                                <span className="text-white/40 text-xs ml-1">{team.catches}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-white/40" />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-1 h-1 bg-[#10b981] rounded-full" />
                              <span className="text-[#10b981] text-[10px] font-medium">{team.weight}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-8 text-white">
            <div className="flex flex-col gap-4 w-[196px]">
              <p className="text-base font-light leading-8" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Počet aktívnych účtov
              </p>
              <p className="text-[32px] font-medium tracking-[-2px] leading-[96px]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                1 200 rybárov
              </p>
            </div>
            <div className="flex flex-col gap-4 w-[196px]">
              <p className="text-base font-light leading-8" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Usporiadané súťaže
              </p>
              <p className="text-[32px] font-medium tracking-[-2px] leading-[96px]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                300+
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Fade */}
      <div className="absolute top-[938px] left-0 right-0 h-[203px] bg-gradient-to-b from-transparent to-[#08101a] pointer-events-none" />

      {/* Categories Section */}
      <section className="relative z-10 px-4 md:px-16 pt-[100px]">
        <div className="max-w-[1440px] mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-[42px] md:text-[52px] font-medium text-white tracking-[-2px] mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Kategórie súťaží
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Vyber si kategóriu súťaží, ktorá ťa zaujíma a preskúmaj dostupné súťaže
            </p>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Active Category */}
            <CategoryCard
              emoji="🔥"
              label="Aktívne"
              count={activeCount}
              image={categoryActive}
              title="Registrácia prebieha"
              description="Prihlás sa do aktuálnych súťaží s otvorenou registráciou"
              href="/categories/registration"
              progressColor="#fb923c"
              progressWidth={65}
            />

            {/* Upcoming Category */}
            <CategoryCard
              emoji="📅"
              label="Budúce"
              count={1}
              image={categoryUpcoming}
              title="Nadchádzajúce súťaže"
              description="Nadchádzajúce súťaže s ukončenou registráciou"
              href="/categories/upcoming"
              progressColor="#60a5fa"
              progressWidth={45}
            />

            {/* Live Category */}
            <CategoryCard
              emoji="🔴"
              label="Live"
              count={liveCount}
              image={categoryLive}
              title="Prebiehajúce preteky"
              description="Sledujte živé súťaže a aktuálne výsledky v reálnom čase"
              href="/categories/live"
              progressColor="#c084fc"
              progressWidth={75}
            />

            {/* Finished Category */}
            <CategoryCard
              emoji="🏆"
              label="Ukončené"
              count={finishedCount}
              image={categoryFinished}
              title="Ukončené preteky"
              description="Pozri si výsledky ukončených súťaží"
              href="/categories/finished"
              progressColor="#fb923c"
              progressWidth={55}
            />

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 md:px-16 py-[120px]">
        <div className="max-w-[1440px] mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-[42px] md:text-[52px] font-medium text-white tracking-[-2px] leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Viac Než Len Aplikácia.<span className="text-white/50">Tvoj</span><br />
              <span className="text-white/50">Partner Pri Vode.</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto mt-6">
              Spojili sme silu živých súťaží s inteligentným osobným denníkom. Všetko na jednom mieste.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-8">
            
            {/* Centrum Súťaží */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="rounded-[26px] overflow-hidden h-[400px] lg:h-[500px]">
                <img src={featureCentrum} alt="Centrum Súťaží" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col gap-6 p-8">
                <h3 className="text-[28px] md:text-[32px] font-semibold text-white tracking-[-0.9px]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Centrum Súťaží
                </h3>
                <p className="text-white/80 text-lg leading-relaxed">
                  Sleduj live výsledky, registruj tímy a spravuj súťaže v reálnom čase. Organizátori majú plnú kontrolu nad registráciami, rozhodcami a živými rebríčkami. Diváci môžu sledovať napínavé momenty priamo na zariadení.
                </p>
                <Link href="/auth/register">
                  <div className="bg-[#fb923c] px-[10px] py-[17px] rounded-[28px] w-fit min-w-[165px] flex items-center justify-center cursor-pointer hover:bg-[#f97316] transition-colors">
                    <span className="text-[#08101b] text-base font-normal text-center" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                      Zaregistrovať sa
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Inteligentný Denník */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="flex flex-col gap-6 p-8 order-2 lg:order-1">
                <h3 className="text-[28px] md:text-[32px] font-semibold text-white tracking-[-0.9px]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Inteligentný Denník
                </h3>
                <p className="text-white/80 text-lg leading-relaxed">
                  Vytvor si osobný rybársky denník s GPS lokalitami, fotografiami úlovkov a pokročilými štatistikami. Sleduj svoj progres, súťaž s priateľmi v Fishing Battle a využívaj predpoveď počasia pre maximálny úspech.
                </p>
                <Link href="/diary">
                  <div className="bg-[#fb923c] px-[10px] py-[17px] rounded-[28px] w-fit min-w-[165px] flex items-center justify-center cursor-pointer hover:bg-[#f97316] transition-colors">
                    <span className="text-[#08101b] text-base font-normal text-center" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                      Preskúmať denník
                    </span>
                  </div>
                </Link>
              </div>
              <div className="rounded-[26px] overflow-hidden h-[400px] lg:h-[500px] order-1 lg:order-2">
                <img src={featureDennik} alt="Inteligentný Denník" className="w-full h-full object-cover" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 md:px-16 py-16 border-t border-white/10">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Logo */}
            <div>
              <img src={contestioLogo} alt="Contestio" className="h-8 mb-4" />
              <p className="text-white/50 text-sm leading-relaxed">
                Moderná platforma pre rybárske súťaže a osobný denník.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/pricing"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Cenník</span></Link></li>
                <li><Link href="/#features"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Funkcie</span></Link></li>
                <li><Link href="/categories/live"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Živé súťaže</span></Link></li>
                <li><Link href="/diary"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Rybársky denník</span></Link></li>
              </ul>
            </div>

            {/* Firma */}
            <div>
              <h4 className="text-white font-semibold mb-4">Firma</h4>
              <ul className="space-y-3">
                <li><Link href="/about-us"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">O nás</span></Link></li>
                <li><Link href="/contact"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Kontakt</span></Link></li>
                <li><Link href="/faq"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">FAQ</span></Link></li>
                <li><Link href="/organizer/create"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Vytvoriť súťaž</span></Link></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-white font-semibold mb-4">Social</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/50 hover:text-white text-sm transition-colors">Instagram</a></li>
                <li><a href="#" className="text-white/50 hover:text-white text-sm transition-colors">LinkedIn</a></li>
                <li><a href="#" className="text-white/50 hover:text-white text-sm transition-colors">YouTube</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">Copyright © C.NTESTIO</p>
            <div className="flex items-center gap-6">
              <Link href="/terms"><span className="text-white/40 hover:text-white text-sm cursor-pointer transition-colors">Terms of Service</span></Link>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
              >
                späť hore
                <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center">
                  <ChevronRight className="w-3 h-3 rotate-[-90deg]" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

// Category Card Component
interface CategoryCardProps {
  emoji: string;
  label: string;
  count: number;
  image: string;
  title: string;
  description: string;
  href: string;
  progressColor: string;
  progressWidth: number;
}

function CategoryCard({ emoji, label, count, image, title, description, href, progressColor, progressWidth }: CategoryCardProps) {
  return (
    <Link href={href}>
      <div 
        className="rounded-[26px] overflow-hidden h-[502px] cursor-pointer hover:scale-[1.02] transition-transform"
        style={{ background: 'linear-gradient(105deg, rgba(255,255,255,0.128) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.064) 100%)' }}
      >
        {/* Image Container */}
        <div className="relative h-[231px] mx-5 mt-[27px] rounded-[20px] overflow-hidden">
          <img src={image} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          
          {/* Badge and Count */}
          <div className="absolute top-[24px] left-[15px] right-[15px] flex items-end justify-between">
            <div className="flex flex-col gap-[125px]">
              <span className="text-white text-sm" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                {emoji} {label}
              </span>
              <div className="flex items-center gap-1.5">
                <div className="relative w-[25px] h-[25px] rounded-full border border-white/30 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {String(count).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-white text-base" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                  súťaží
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 border border-white rounded-[46px] px-2 py-1.5">
              <span className="text-white text-base" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
                Zobraziť
              </span>
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pt-6 pb-4">
          <h3 className="text-white text-[22px] font-semibold tracking-[-0.9px] mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
            {title}
          </h3>
          <p className="text-white text-base leading-[29px] mb-6 h-[58px]" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
            {description}
          </p>
          
          {/* CTA Button */}
          <div className="bg-[#fb923c] px-[10px] py-[17px] rounded-[28px] w-full flex items-center justify-center mb-4">
            <span className="text-[#08101b] text-base font-normal text-center" style={{ fontFamily: "'ABeeZee', sans-serif" }}>
              Preskúmať všetky
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-[5px] bg-[rgba(16,185,129,0.12)] rounded-[40px]">
            <div 
              className="absolute h-full rounded-[40px]"
              style={{ width: `${progressWidth}%`, backgroundColor: progressColor }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
