import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fish, Trophy, BookOpen, Menu, X, Info, DollarSign, HelpCircle, Phone, Mail, Loader2, CheckCircle } from "lucide-react";
import { SiFacebook, SiInstagram, SiYoutube } from "react-icons/si";
import { ContestCategories } from "@/components/contest-categories";
import { Link } from "wouter";
import { TacticalIcon, TacticalIconInline } from "@/components/ui/tactical-icon";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import contestioLogo from "@assets/contestio logo_1760283270014.png";
import diaryMockupImage from "@assets/image_1767349381338.png";
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
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { toast } = useToast();
  
  const newsletterMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest('POST', '/api/newsletter/subscribe', { email });
    },
    onSuccess: () => {
      setNewsletterSuccess(true);
      setNewsletterEmail('');
      toast({
        title: "✅ Prihlásenie úspešné",
        description: "Ďakujeme za prihlásenie na odber noviniek!",
      });
      // Reset success state after 5 seconds to allow re-subscription
      setTimeout(() => setNewsletterSuccess(false), 5000);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Chyba",
        description: error.message || "Nastala chyba pri prihlásení.",
        variant: "destructive",
      });
    },
  });
  
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
                <img src={contestioLogo} alt="Contestio" className="h-8" />
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                {/* Main Navigation */}
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  let variant: any = "slate";
                  if (item.label === "Zaregistrovať súťaž") variant = "amber";
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors cursor-pointer" data-testid={`nav-${item.href.slice(1) || 'home'}`}>
                        <TacticalIconInline icon={IconComponent} variant={variant} size="sm" />
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
                    let variant: any = "slate";
                    if (item.label === "Zaregistrovať súťaž") variant = "amber";

                    return (
                      <Link key={item.href} href={item.href}>
                        <div 
                          className="flex items-center space-x-3 px-3 py-3 rounded-lg text-white/90 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-200"
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`mobile-nav-${item.href.slice(1) || 'home'}`}
                        >
                          <TacticalIconInline icon={IconComponent} variant={variant} size="md" />
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
                    <TacticalIconInline icon={Trophy} variant="amber" size="sm" />
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
                    <TacticalIconInline icon={BookOpen} variant="slate" size="sm" />
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
                      /* Diary UI - Screenshot */
                      <img 
                        src={diaryMockupImage} 
                        alt="Rybársky denník - ukážka aplikácie" 
                        className="w-full h-full object-cover object-top"
                        data-testid="img-diary-mockup"
                      />
                    )}
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features" 
        className="py-20 md:py-32"
        style={{
          background: 'radial-gradient(ellipse at top, #011a24 0%, #0c1f28 50%)'
        }}
      >
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
              <div className="mb-6">
                <TacticalIcon icon={Trophy} variant="amber" size="md" showLabel={false} />
              </div>
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
              <div className="mb-6">
                <TacticalIcon icon={BookOpen} variant="slate" size="md" showLabel={false} />
              </div>
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
      <footer className="bg-[#011a24] border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12">
            
            {/* Logo and Slogan */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <img src={contestioLogo} alt="Contestio" className="h-10" />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                Moderná platforma spájajúca rybárske súťaže s inteligentným osobným denníkom. Tvoj partner pri vode.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Produkt</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/pricing">
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm">
                      Cenník
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/#features">
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm">
                      Funkcie
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/categories/live">
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm">
                      Živé súťaže
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/diary">
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm">
                      Rybársky denník
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Firma</h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/about-us">
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm">
                      O nás
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm">
                      Kontakt
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/faq">
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm">
                      FAQ
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/register-competition">
                    <span className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm">
                      Zaregistrovať súťaž
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="py-8 border-t border-gray-800 mb-4">
            <div className="max-w-md">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <TacticalIconInline icon={Mail} variant="emerald" size="sm" />
                Odber noviniek
              </h4>
              <p className="text-gray-400 text-sm mb-4">
                Dostávajte tipy na rybolov a informácie o súťažiach priamo do vašej schránky.
              </p>
              {newsletterSuccess ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">Ďakujeme za prihlásenie!</span>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail) {
                      newsletterMutation.mutate(newsletterEmail);
                    }
                  }}
                  className="flex gap-2"
                  data-testid="form-newsletter"
                >
                  <Input
                    type="email"
                    placeholder="Váš email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500 min-h-[44px]"
                    required
                    data-testid="input-newsletter-email"
                  />
                  <Button 
                    type="submit" 
                    disabled={newsletterMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] min-w-[44px] px-4"
                    data-testid="button-newsletter-submit"
                  >
                    {newsletterMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Prihlásiť"
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Bottom Section: Social Media and Copyright */}
          <div className="pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Copyright and Legal Links */}
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-gray-400 text-sm order-2 md:order-1">
                <span>© 2025 Contestio. Všetky práva vyhradené.</span>
                <div className="flex items-center gap-4">
                  <Link href="/terms">
                    <span className="hover:text-emerald-400 transition-colors cursor-pointer">
                      Podmienky používania
                    </span>
                  </Link>
                  <Link href="/privacy">
                    <span className="hover:text-emerald-400 transition-colors cursor-pointer">
                      Ochrana osobných údajov
                    </span>
                  </Link>
                </div>
              </div>

              {/* Social Media Icons */}
              <div className="flex items-center space-x-6 order-1 md:order-2">
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                  aria-label="Facebook"
                >
                  <SiFacebook className="w-5 h-5" />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-500 transition-colors"
                  aria-label="Instagram"
                >
                  <SiInstagram className="w-5 h-5" />
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="YouTube"
                >
                  <SiYoutube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
