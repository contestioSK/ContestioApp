import { Button } from "@/components/ui/button";
import { Fish, Trophy, BookOpen, Menu, X, Info, DollarSign, HelpCircle, Phone } from "lucide-react";
import { ContestCategories } from "@/components/contest-categories";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [activeTab, setActiveTab] = useState<'competitions' | 'diary'>('competitions');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  
  // Fetch real competitions from API
  const { data: competitions = [], isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"]
  });

  // Main navigation items
  const navItems = [
    { href: "/about-us", label: "O nás", icon: Info },
    { href: "/faq", label: "FAQ", icon: HelpCircle },
    { href: "/pricing", label: "Cenník", icon: DollarSign },
    { href: "/contact", label: "Kontakt", icon: Phone },
    { href: "/register-competition", label: "Zaregistrovať súťaž", icon: Trophy },
  ];

  // Sample contests data to showcase different categories
  const sampleContests = [
    {
      id: "1",
      name: "Lake Michigan Championship",
      description: "Prestížna súťaž na jednom z najväčších jazier v Severnej Amerike. Súťaž je otvorená pre všetky kategórie rybárov.",
      status: "live" as const,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Michigan, USA"
    },
    {
      id: "2", 
      name: "Rocky Mountain Trophy Hunt",
      description: "Horská súťaž v nádhernom prostredí Rocky Mountains. Registrácia je stále otvorená pre všetky tímy.",
      status: "registration" as const,
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Colorado, USA"
    },
    {
      id: "3",
      name: "Atlantic Coast Masters", 
      description: "Završená súťaž na atlantickom pobreží s vysokou účasťou profesionálnych rybárov z celého sveta.",
      status: "finished" as const,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      location: "North Carolina, USA"
    },
    {
      id: "4",
      name: "European Carp Masters",
      description: "Európska súťaž zameraná na chytanie kaprov. Registrácia je uzavretá, súťaž sa blíži.",
      status: "registration" as const,
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Maďarsko"
    },
    {
      id: "5",
      name: "Northern Pike Challenge",
      description: "Špecializovaná súťaž na chytanie štík v severských jazerách s bohatými cenami.",
      status: "registration" as const,
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Fínsko"
    },
    {
      id: "6",
      name: "Mediterranean Bass Tournament",
      description: "Ukončená súťaž na Stredozemnom mori s účasťou najlepších európskych rybárov.",
      status: "finished" as const,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Španielsko"
    }
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Section */}
      <section 
        ref={heroRef} 
        className="relative min-h-[600px] md:h-[700px] overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at top, #1e3a5f 0%, #011a24 70%)'
        }}
      >
        
        {/* Integrated Navigation */}
        <div className="relative z-20 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/">
                <div className="flex items-center space-x-2 text-white">
                  <Fish className="text-2xl" />
                  <span className="text-xl font-bold">Contestio</span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                {/* Main Navigation */}
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors cursor-pointer" data-testid={`nav-${item.href.slice(1) || 'home'}`}>
                        <IconComponent className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
                
                {/* CTA Buttons */}
                <div className="flex items-center space-x-3">
                  <Button asChild
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                    size="sm"
                    data-testid="button-register"
                  >
                    <Link href="/auth/register">
                      Zaregistrovať sa
                    </Link>
                  </Button>
                  <Button asChild
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    size="sm"
                    data-testid="button-login"
                  >
                    <Link href="/auth/login">
                      Prihlásiť sa
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-white hover:bg-white/10"
                  data-testid="button-mobile-menu"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden border-t border-white/20 mt-2 pt-4 pb-6">
                <div className="space-y-2">
                  {/* Main Navigation */}
                  {navItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Link key={item.href} href={item.href}>
                        <div 
                          className="flex items-center space-x-3 px-3 py-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-200"
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`mobile-nav-${item.href.slice(1) || 'home'}`}
                        >
                          <IconComponent className="w-5 h-5" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                  
                  <div className="border-t border-white/20 my-4"></div>
                  
                  {/* CTA Buttons */}
                  <div className="space-y-2">
                    <Button asChild
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                      data-testid="mobile-button-register"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link href="/auth/register">
                        Zaregistrovať sa
                      </Link>
                    </Button>
                    <Button asChild
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      data-testid="mobile-button-login"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link href="/auth/login">
                        Prihlásiť sa
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              
              {/* Left Column - Text Content */}
              <div className="text-center lg:text-left">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight" data-testid="hero-title">
                  Platforma pre <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Moderného Rybára</span>.
                </h1>
                
                <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed" data-testid="hero-description">
                  {activeTab === 'competitions' 
                    ? 'Sleduj live úlovky a rebríčky tímov v prebiehajúcich súťažiach.' 
                    : 'Vytvor si svoj osobný rybársky denník a súťaž s kamarátmi.'}
                </p>
                
                {/* Interactive Tab Switcher */}
                <div className="flex gap-4 mb-8 justify-center lg:justify-start">
                  <button
                    onClick={() => setActiveTab('competitions')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === 'competitions'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    data-testid="tab-competitions"
                  >
                    <Trophy className="w-5 h-5" />
                    <span>Súťaže</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('diary')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === 'diary'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                    data-testid="tab-diary"
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Rybársky denník</span>
                  </button>
                </div>
                
                {/* Dynamic CTA Container */}
                <div className="hero-cta-container">
                  {activeTab === 'competitions' ? (
                    <Link href="/categories/live">
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 text-lg transition-all duration-200 hover:scale-105"
                        size="lg"
                        data-testid="button-view-live-results"
                      >
                        Zobraziť Live Výsledky
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/diary">
                      <Button 
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-6 text-lg transition-all duration-200 hover:scale-105"
                        size="lg"
                        data-testid="button-try-free"
                      >
                        Vyskúšať zdarma
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Right Column - Phone Mockup */}
              <div className="flex justify-center lg:justify-end">
                <div className="phone-mockup relative w-[320px] h-[640px] bg-[#1a1a1a] rounded-[3rem] p-3 shadow-2xl border-8 border-[#2a2a2a]">
                  {/* Phone Screen */}
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden">
                    {activeTab === 'competitions' ? (
                      /* Competitions UI - Dark Mode */
                      <div className="w-full h-full bg-[#0c1f28] flex flex-col">
                        {/* Header */}
                        <div className="bg-[#012a36] p-4 flex items-center justify-between">
                          <h2 className="text-white font-bold text-lg">Live Výsledky</h2>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-500 text-sm font-semibold">LIVE</span>
                          </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1 p-4 space-y-3">
                          <div className="bg-[#1e3a5f] p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium" data-testid="text-team-name-alfa">1. Tím Alfa</span>
                              <span className="text-emerald-400 font-bold" data-testid="text-weight-alfa">245 kg</span>
                            </div>
                            <div className="text-gray-400 text-sm" data-testid="text-catches-alfa">12 úlovkov</div>
                          </div>
                          <div className="bg-[#1e3a5f] p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium" data-testid="text-team-name-rybari">2. Rybári SK</span>
                              <span className="text-emerald-400 font-bold" data-testid="text-weight-rybari">198 kg</span>
                            </div>
                            <div className="text-gray-400 text-sm" data-testid="text-catches-rybari">9 úlovkov</div>
                          </div>
                          <div className="bg-[#1e3a5f] p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium" data-testid="text-team-name-kaprari">3. Kapráři CZ</span>
                              <span className="text-emerald-400 font-bold" data-testid="text-weight-kaprari">176 kg</span>
                            </div>
                            <div className="text-gray-400 text-sm" data-testid="text-catches-kaprari">8 úlovkov</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Diary UI - Light Mode */
                      <div className="w-full h-full bg-white flex flex-col">
                        {/* Header */}
                        <div className="bg-emerald-500 p-4">
                          <h2 className="text-white font-bold text-lg">Môj Denník</h2>
                        </div>
                        {/* Content */}
                        <div className="flex-1 p-4 space-y-3 bg-gray-50">
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Fish className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900" data-testid="text-catch-kapor">Kapor 8.5 kg</div>
                                <div className="text-sm text-gray-500" data-testid="text-time-kapor">Dnes, 14:30</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Fish className="w-6 h-6 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900" data-testid="text-catch-stuka">Šťuka 4.2 kg</div>
                                <div className="text-sm text-gray-500" data-testid="text-time-stuka">Včera, 09:15</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Fish className="w-6 h-6 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900" data-testid="text-catch-zubac">Zubáč 3.8 kg</div>
                                <div className="text-sm text-gray-500" data-testid="text-time-zubac">2 dni, 16:45</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-[#0c1f28] py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Viac Než Len Aplikácia. <br className="hidden md:block" />
              Tvoj Partner Pri Vode.
            </h2>
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto">
              Spojili sme silu živých súťaží s inteligentným osobným denníkom. Všetko na jednom mieste.
            </p>
          </div>

          {/* Feature Block 1: Centrum Súťaží */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24 md:mb-32">
            {/* Text Content - Left on Desktop */}
            <div className="text-left order-2 lg:order-1">
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Centrum Súťaží
              </h3>
              <p className="text-base md:text-lg text-white/80 mb-6 leading-relaxed">
                Sleduj live výsledky, registruj tímy a spravuj súťaže v reálnom čase. Organizátori majú plnú kontrolu nad registráciami, rozhodcami a živými rebríčkami. Diváci môžu sledovať napínavé momenty priamo na mobiloch.
              </p>
              <Link href="/categories/live">
                <span className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-2 cursor-pointer transition-colors">
                  Zistiť viac o súťažiach →
                </span>
              </Link>
            </div>

            {/* Image - Right on Desktop, Top on Mobile */}
            <div className="order-1 lg:order-2">
              <img 
                src="https://placehold.co/600x400/1e3a5f/white?text=Mockup+Sutazi" 
                alt="Mockup súťaží" 
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>

          {/* Feature Block 2: Inteligentný Denník */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image - Left on Desktop, Top on Mobile */}
            <div className="order-1 lg:order-1">
              <img 
                src="https://placehold.co/600x400/10b981/white?text=Mockup+Dennika" 
                alt="Mockup denníka" 
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>

            {/* Text Content - Right on Desktop */}
            <div className="text-left order-2 lg:order-2">
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Inteligentný Denník
              </h3>
              <p className="text-base md:text-lg text-white/80 mb-6 leading-relaxed">
                Vytvor si osobný rybársky denník s GPS lokalitami, fotkami úlovkov a pokročilými štatistikami. Sleduj svoj progres, súťaž s priateľmi v Fishing Battle a využívaj predpoveď počasia pre maximálny úspech.
              </p>
              <Link href="/diary">
                <span className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-2 cursor-pointer transition-colors">
                  Preskúmať denník →
                </span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Contest Categories */}
      <ContestCategories contests={competitions} />

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Fish className="text-2xl" />
              <h3 className="text-xl font-bold">Contestio</h3>
            </div>
            <p className="text-primary-foreground/80 mb-4">
              Najlepšia platforma pre rybárske súťaže naživo.
            </p>
            <div className="text-primary-foreground/80 text-sm">
              © 2024 Contestio. Všetky práva vyhradené.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
