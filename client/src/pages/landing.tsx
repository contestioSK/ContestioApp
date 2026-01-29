import { Button } from "@/components/ui/button";
import { Trophy, BookOpen, Menu, X, ChevronRight, MapPin, Fish } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import contestioLogo from "@assets/contestio logo_1760283270014.png";

interface Competition {
  id: string;
  name: string;
  description: string;
  location: string;
  status: 'registration' | 'live' | 'finished';
  startDate: string;
  endDate: string;
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

  const liveCount = competitions.filter(c => c.status === 'live').length;
  const activeCount = competitions.filter(c => c.status === 'registration').length;
  const finishedCount = competitions.filter(c => c.status === 'finished').length;

  return (
    <div className="min-h-screen bg-[#08101a]">
      
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-[-180px] left-[13%] w-[948px] h-[571px] bg-gradient-radial from-cyan-500/20 via-cyan-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-[298px] left-[27%] w-[948px] h-[304px] bg-gradient-radial from-emerald-500/15 via-emerald-500/5 to-transparent rounded-full blur-2xl" />
          <div className="absolute top-0 left-0 right-0 h-[800px] bg-[url('https://images.unsplash.com/photo-1504309092620-4d0ec726efa4?w=1920')] bg-cover bg-center opacity-20 mix-blend-screen" />
        </div>

        {/* Navigation */}
        <nav className="relative z-50 pt-6 px-4 md:px-8 lg:px-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            
            {/* Logo */}
            <Link href="/">
              <img src={contestioLogo} alt="Contestio" className="h-8 md:h-9" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              <div className="flex items-center gap-1 px-6 py-3 rounded-full border border-white/10 bg-gradient-to-r from-[#08101a] via-[#0e2331] to-[#08121c] backdrop-blur-xl">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <span className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors cursor-pointer">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
              
              <div className="flex items-center gap-3">
                <Button asChild className="bg-orange-400 hover:bg-orange-500 text-[#08101b] font-medium px-6 rounded-full">
                  <Link href="/auth/login">Prihlásiť sa</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10 rounded-full backdrop-blur-xl">
                  <Link href="/auth/register">Zaregistrovať sa</Link>
                </Button>
              </div>
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
                  <Button asChild className="w-full bg-orange-400 hover:bg-orange-500 text-[#08101b] font-medium rounded-full">
                    <Link href="/auth/login">Prihlásiť sa</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-white/10 text-white hover:bg-white/10 rounded-full">
                    <Link href="/auth/register">Zaregistrovať sa</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-20 pt-16 md:pt-24 lg:pt-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">
            
            {/* Left Column - Text */}
            <div className="max-w-xl">
              <h1 className="font-medium tracking-tight">
                <span className="block text-5xl md:text-6xl lg:text-[82px] leading-[1.1] text-white/60">Živý rybolov</span>
                <span className="block text-5xl md:text-6xl lg:text-[82px] leading-[1.1] text-white">Súťaže</span>
              </h1>
              
              <p className="mt-4 text-3xl md:text-4xl lg:text-[52px] leading-[1.1] text-white font-medium tracking-tight">
                Skutočné výsledky. Jedna platforma.
              </p>
              
              <p className="mt-6 text-lg md:text-xl text-white/70 leading-relaxed max-w-lg">
                Zúčastnite sa turnajov v živom rybolove, sledujte svoj pokrok a zostaňte v spojení s rybárskou komunitou
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild className="bg-orange-400 hover:bg-orange-500 text-[#08101b] font-medium px-8 py-6 text-base rounded-full">
                  <Link href="/competitions">Zapojte sa do súťaže</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10 px-8 py-6 text-base rounded-full backdrop-blur-xl">
                  <Link href="/categories/all">Preskúmajte súťaže</Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="mt-12 flex gap-12">
                <div>
                  <p className="text-sm text-white/60 font-light">Počet aktívnych účtov</p>
                  <p className="mt-2 text-2xl md:text-3xl text-white font-medium tracking-tight">1 200 rybárov</p>
                </div>
                <div>
                  <p className="text-sm text-white/60 font-light">Usporiadané súťaže</p>
                  <p className="mt-2 text-2xl md:text-3xl text-white font-medium tracking-tight">300+</p>
                </div>
              </div>
            </div>

            {/* Right Column - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div 
                className="relative w-[280px] md:w-[330px] h-[560px] md:h-[660px] bg-[#09090b] rounded-[40px] md:rounded-[56px] border-[8px] md:border-[12px] border-[#27272a] shadow-2xl overflow-hidden"
                style={{ transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)' }}
              >
                {/* Phone Screen */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#18181b] to-black overflow-hidden rounded-[32px] md:rounded-[44px]">
                  
                  {/* Status Bar */}
                  <div className="flex items-center justify-between px-6 py-3">
                    <span className="text-white text-xs font-semibold">9:41</span>
                    <div className="w-20 h-6 bg-black rounded-full" />
                    <div className="flex gap-1">
                      <div className="w-4 h-2 bg-white/60 rounded-sm" />
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="px-4 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                        <Fish className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" />
                        <span className="text-white font-semibold text-sm">Live Výsledky</span>
                      </div>
                    </div>
                  </div>

                  {/* Competition Stats */}
                  <div className="px-4 pt-8 pb-4">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Celková váha</p>
                    <p className="text-white text-4xl md:text-5xl font-medium tracking-tight mt-1">619 kg</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-500 text-xs font-semibold">29 úlovkov</span>
                      <span className="text-zinc-500 text-xs">3 tímy</span>
                    </div>
                  </div>

                  {/* Leaderboard */}
                  <div className="bg-zinc-900/60 backdrop-blur-xl border-t border-white/5 rounded-t-3xl mt-4 pt-4 px-4 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Rebríček tímov</span>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-zinc-600 rounded-full" />
                        <div className="w-1 h-1 bg-zinc-700 rounded-full" />
                      </div>
                    </div>

                    {/* Team Cards */}
                    <div className="space-y-3">
                      {[
                        { name: 'Tím Alfa', catches: 12, weight: '245 kg' },
                        { name: 'Rybári SK', catches: 9, weight: '198 kg' },
                        { name: 'Kapráři CZ', catches: 8, weight: '176 kg' },
                      ].map((team, i) => (
                        <div 
                          key={i}
                          className="p-3 rounded-xl"
                          style={{ background: 'linear-gradient(169deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)' }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-white text-sm font-semibold">{team.name}</span>
                              <span className="text-white/40 text-sm ml-2">{team.catches} úlovkov</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40" />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                            <span className="text-emerald-500 text-xs font-medium">{team.weight}</span>
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

        {/* Gradient fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#08101a] to-transparent" />
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 md:py-32 px-4 md:px-8 lg:px-20">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-white leading-tight">
              Viac Než Len Aplikácia.<br />
              <span className="text-white/50">Tvoj Partner Pri Vode.</span>
            </h2>
            <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto">
              Spojili sme silu živých súťaží s inteligentným osobným denníkom. Všetko na jednom mieste.
            </p>
          </div>

          {/* Feature Block 1: Centrum Súťaží */}
          <div className="relative rounded-3xl overflow-hidden mb-8" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12">
              <div className="flex flex-col justify-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mb-6">
                  <Trophy className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-medium text-white mb-4">
                  Centrum Súťaží
                </h3>
                <p className="text-white/60 leading-relaxed mb-6">
                  Sleduj live výsledky, registruj tímy a spravuj súťaže v reálnom čase. Organizátori majú plnú kontrolu nad registráciami, rozhodcami a živými rebríčkami. Diváci môžu sledovať napínavé momenty priamo na zariadení.
                </p>
                <Button asChild className="w-fit bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full">
                  <Link href="/auth/register">Zaregistrovať sa</Link>
                </Button>
              </div>
              <div className="relative h-64 md:h-80 lg:h-auto rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/30 to-cyan-900/30">
                <img 
                  src="https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=800" 
                  alt="Rybárska súťaž" 
                  className="w-full h-full object-cover opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Feature Block 2: Inteligentný Denník */}
          <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-12">
              <div className="relative h-64 md:h-80 lg:h-auto rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-900/30 to-teal-900/30 order-2 lg:order-1">
                <img 
                  src="https://images.unsplash.com/photo-1504309092620-4d0ec726efa4?w=800" 
                  alt="Rybársky denník" 
                  className="w-full h-full object-cover opacity-60"
                />
                {/* Floating UI Cards */}
                <div className="absolute top-4 left-4 p-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">GPS Lokalita</p>
                      <p className="text-white/50 text-[10px]">49.2121°N, 16.6366°E</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center order-1 lg:order-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center mb-6">
                  <BookOpen className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-medium text-white mb-4">
                  Inteligentný Denník
                </h3>
                <p className="text-white/60 leading-relaxed mb-6">
                  Vytvor si osobný rybársky denník s GPS lokalitami, fotkami úlovkov a pokročilými štatistikami. Sleduj svoj progres, súťaž s priateľmi v Fishing Battle a využívaj predpoveď počasia pre maximálny úspech.
                </p>
                <Button asChild className="w-fit bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full">
                  <Link href="/diary">Preskúmať denník</Link>
                </Button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Categories Section */}
      <section className="relative py-24 md:py-32 px-4 md:px-8 lg:px-20">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-white mb-4">
              Kategórie súťaží
            </h2>
            <p className="text-lg text-white/60">
              Vyberte si kategóriu súťaží, ktorá vás zaujíma a preskúmajte dostupné súťaže
            </p>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Active */}
            <Link href="/categories/registration">
              <div className="group relative rounded-2xl overflow-hidden bg-[#111827] border border-white/10 hover:border-orange-400/50 transition-all duration-300 cursor-pointer">
                <div className="h-48 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1504309092620-4d0ec726efa4?w=400" 
                    alt="Aktívne súťaže"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-medium text-white">🔥 Aktívne</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-400/20 flex items-center justify-center text-[10px] text-orange-400 font-bold">
                        {activeCount > 0 ? String(activeCount).padStart(2, '0') : '01'}
                      </div>
                      <span className="text-white/50 text-sm">súťaží</span>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 mb-4">Prihláste sa do aktuálnych súťaží s otvorenou registráciou</p>
                  <Button variant="outline" className="w-full border-orange-400/50 text-orange-400 hover:bg-orange-400/10 rounded-full">
                    Preskúmať všetky
                  </Button>
                </div>
              </div>
            </Link>

            {/* Upcoming */}
            <Link href="/categories/upcoming">
              <div className="group relative rounded-2xl overflow-hidden bg-[#111827] border border-white/10 hover:border-blue-400/50 transition-all duration-300 cursor-pointer">
                <div className="h-48 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=400" 
                    alt="Nadchádzajúce súťaže"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-medium text-white">📅 Nadchádzajúce</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-400/20 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                        01
                      </div>
                      <span className="text-white/50 text-sm">súťaží</span>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 mb-4">Nadchádzajúce súťaže s ukončenou registráciou</p>
                  <Button variant="outline" className="w-full border-blue-400/50 text-blue-400 hover:bg-blue-400/10 rounded-full">
                    Preskúmať všetky
                  </Button>
                </div>
              </div>
            </Link>

            {/* Live */}
            <Link href="/categories/live">
              <div className="group relative rounded-2xl overflow-hidden bg-[#111827] border border-white/10 hover:border-red-400/50 transition-all duration-300 cursor-pointer">
                <div className="h-48 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1532015917327-4575aed32e63?w=400" 
                    alt="Live súťaže"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-medium text-white">🔴 Live</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-red-400/20 flex items-center justify-center text-[10px] text-red-400 font-bold">
                        {liveCount > 0 ? String(liveCount).padStart(2, '0') : '01'}
                      </div>
                      <span className="text-white/50 text-sm">súťaží</span>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 mb-4">Sledujte živé súťaže a aktuálne výsledky v reálnom čase</p>
                  <Button variant="outline" className="w-full border-red-400/50 text-red-400 hover:bg-red-400/10 rounded-full">
                    Preskúmať všetky
                  </Button>
                </div>
              </div>
            </Link>

            {/* Finished */}
            <Link href="/categories/finished">
              <div className="group relative rounded-2xl overflow-hidden bg-[#111827] border border-white/10 hover:border-amber-400/50 transition-all duration-300 cursor-pointer">
                <div className="h-48 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400" 
                    alt="Ukončené súťaže"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-medium text-white">🏆 Ukončené</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                        {finishedCount > 0 ? String(finishedCount).padStart(2, '0') : '01'}
                      </div>
                      <span className="text-white/50 text-sm">súťaží</span>
                    </div>
                  </div>
                  <p className="text-sm text-white/50 mb-4">Prihláste sa do aktuálnych súťaží s otvorenou registráciou</p>
                  <Button variant="outline" className="w-full border-amber-400/50 text-amber-400 hover:bg-amber-400/10 rounded-full">
                    Preskúmať všetky
                  </Button>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-16 px-4 md:px-8 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Logo & Description */}
            <div className="lg:col-span-1">
              <img src={contestioLogo} alt="Contestio" className="h-8 mb-4" />
              <p className="text-white/50 text-sm leading-relaxed">
                Moderná platforma pre rybárske súťaže a osobný denník.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-medium mb-4">Produkt</h4>
              <ul className="space-y-3">
                <li><Link href="/pricing"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Cenník</span></Link></li>
                <li><Link href="/#features"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Funkcie</span></Link></li>
                <li><Link href="/categories/live"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Živé súťaže</span></Link></li>
                <li><Link href="/diary"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Rybársky denník</span></Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-medium mb-4">Firma</h4>
              <ul className="space-y-3">
                <li><Link href="/about-us"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">O nás</span></Link></li>
                <li><Link href="/contact"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Kontakt</span></Link></li>
                <li><Link href="/faq"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">FAQ</span></Link></li>
                <li><Link href="/organizer/create"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Vytvoriť súťaž</span></Link></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-white font-medium mb-4">Sociálne siete</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-white/50 hover:text-white text-sm flex items-center gap-2 transition-colors">Instagram</a></li>
                <li><a href="#" className="text-white/50 hover:text-white text-sm flex items-center gap-2 transition-colors">LinkedIn</a></li>
                <li><a href="#" className="text-white/50 hover:text-white text-sm flex items-center gap-2 transition-colors">YouTube</a></li>
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
