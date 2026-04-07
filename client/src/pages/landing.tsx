import { useState } from "react";
import { Link } from "wouter";
import {
  Menu, X, ChevronRight,
  Fish, Calendar, CloudRain, Check, AlertCircle, Activity,
  Map as MapIcon, Target, Users,
} from "lucide-react";

import contestioLogo from "@assets/figma/logo.png";

const topoPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83v58.34l-.83.83H.83l-.83-.83V.83L.83 0h53.797zm-1.889 1.889H2.718v54.334h50.02V1.889zM19.125 15.688a2.625 2.625 0 110-5.25 2.625 2.625 0 010 5.25zm0-1.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25zm19.125 21.375a2.625 2.625 0 110-5.25 2.625 2.625 0 010 5.25zm0-1.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z' fill='%2314B8A6' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")`;

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/about-us", label: "O nás" },
    { href: "/faq", label: "FAQ" },
    { href: "/pricing", label: "Cenník" },
    { href: "/contact", label: "Kontakt" },
  ];

  return (
    <div className="bg-[#050810] min-h-screen text-slate-300 overflow-x-hidden">

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
                <span className="text-white text-sm font-normal cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/auth/login">
              <div className="bg-[#fb923c] px-5 py-2.5 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#f97316] transition-colors">
                <span className="text-[#08101b] text-sm font-medium">
                  Prihlásiť sa
                </span>
              </div>
            </Link>
            <Link href="/auth/register">
              <div className="backdrop-blur-[12px] border border-white/10 px-5 py-2.5 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                <span className="text-white text-sm font-normal whitespace-nowrap">
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

      {/* 1. HERO SECTION */}
      <section className="relative flex items-center pt-12 pb-16 border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506598822606-2580ec19b0de?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050810]/80 via-[#050810]/50 to-[#050810]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 px-4 py-2 rounded-full text-xs font-black text-teal-400 mb-8 uppercase tracking-widest backdrop-blur-md">
              <Activity size={14} /> Analytický denník. Bez výhovoriek.
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-[1.05]">
              Maj úlovky <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-600">pod kontrolou.</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300/80 mb-10 leading-relaxed max-w-lg font-medium">
              Zabudni na stratené fotky a zabudnuté tlaky vzduchu. Contestio je analytický denník, ktorý premení tvoje pocity pri vode na tvrdé dáta.
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/login">
                  <div className="bg-teal-500 text-[#050810] px-8 py-4 rounded-xl font-black text-lg hover:bg-teal-400 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(20,184,166,0.3)] cursor-pointer">
                    Spustiť denník <ChevronRight size={20} />
                  </div>
                </Link>
              </div>
              <p className="text-xs text-slate-500">Nečakaj a začni si ukladať spomienky.</p>
            </div>
          </div>

          {/* App Mockup Card */}
          <div className="relative hidden lg:block">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative bg-[#0A101C]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-6 rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                <div className="font-bold text-white flex items-center gap-2">
                  <MapIcon size={16} className="text-teal-500" /> Posledná výprava
                </div>
                <div className="text-xs bg-teal-500/20 text-teal-400 px-2 py-1 rounded">Aktívne</div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-white/5 rounded-xl border border-white/5 flex items-end p-4">
                  <div className="w-full flex items-end justify-between gap-2 opacity-50">
                    {[40, 70, 45, 90, 60, 100].map((h, i) => (
                      <div key={i} className="w-full bg-gradient-to-t from-teal-500/40 to-transparent rounded-t-sm" style={{ height: `${h}px` }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-slate-500 mb-1">Naj. nástraha</div>
                    <div className="text-sm font-bold text-white">Krill 20mm</div>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-slate-500 mb-1">Tlak vzduchu</div>
                    <div className="text-sm font-bold text-white">1012 hPa</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PAIN SECTION */}
      <section className="py-24 relative bg-[#030508] overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-600/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row gap-16 items-center">
          <div className="w-full md:w-1/2">
            <AlertCircle size={40} className="text-rose-500 mb-6" />
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
              Chytíš rybu... <br />
              <span className="text-rose-500">a o týždeň nevieš nič.</span>
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Nepamätáš si, na čo brala. Fotky máš rozhádzané v mobile medzi screenshotmi memeečok. Nečítaš vodu, len dúfaš.
            </p>
            <div className="inline-flex border border-rose-500/30 bg-rose-500/10 text-rose-400 px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(244,63,94,0.1)]">
              Stále začínaš od nuly.
            </div>
          </div>

          <div className="w-full md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: "Stratené detaily", desc: "Zabudnuté montáže a lokácie." },
              { title: "Chaos v galérii", desc: "Kedy a kde sa to chytilo?" },
              { title: "Slepé spoliehanie", desc: "Hádanie počasia z okna." },
              { title: "Žiadny posun", desc: "Rovnaké chyby, menšie ryby." },
            ].map((item, i) => (
              <div key={i} className="bg-[#0A101C] p-6 rounded-2xl border border-white/5 hover:border-rose-500/30 transition-colors">
                <X size={20} className="text-rose-500 mb-4" />
                <h4 className="text-white font-bold mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section className="py-32 relative bg-[#09111C]">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: topoPattern }} />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-full bg-gradient-to-b from-teal-500/5 via-teal-500/10 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
              Konečne v tom máš <span className="text-teal-400">systém.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Vymeň hádanie za tvrdé dáta. Každá výprava ťa posúva o level vyššie.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#050810]/80 backdrop-blur-xl border border-teal-500/20 p-8 rounded-[2rem] hover:-translate-y-2 transition-transform duration-300 shadow-[0_10px_40px_rgba(20,184,166,0.1)]">
              <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-400 mb-8 border border-teal-500/20">
                <Fish size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Karta Úlovku</h3>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                Žiadne poloprázdne zápisníky. Pridaj fotku, váhu, nástrahu a lokáciu do 15 sekúnd. Tvoje dáta sú v bezpečí cloudu.
              </p>
              <ul className="space-y-3 border-t border-white/5 pt-6">
                <li className="flex gap-2 items-center text-xs text-slate-300"><Check size={14} className="text-teal-500 flex-shrink-0" /> Fotky & Miery</li>
                <li className="flex gap-2 items-center text-xs text-slate-300"><Check size={14} className="text-teal-500 flex-shrink-0" /> Presné podmienky</li>
              </ul>
            </div>

            <div className="bg-[#050810]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] hover:-translate-y-2 transition-transform duration-300 hover:border-teal-500/20">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-8 border border-blue-500/20">
                <Calendar size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">História výprav</h3>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                Pripravuješ sa na známu vodu? Pozri si svoje predošlé výpravy. Presne vieš, na aký tlak rýby reagovali pred rokom.
              </p>
              <ul className="space-y-3 border-t border-white/5 pt-6">
                <li className="flex gap-2 items-center text-xs text-slate-300"><Check size={14} className="text-blue-500 flex-shrink-0" /> Časové osi lovu</li>
                <li className="flex gap-2 items-center text-xs text-slate-300"><Check size={14} className="text-blue-500 flex-shrink-0" /> Sledovanie trendov</li>
              </ul>
            </div>

            <div className="bg-[#050810]/80 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] hover:-translate-y-2 transition-transform duration-300 hover:border-teal-500/20">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/20">
                <CloudRain size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Počasie & Checky</h3>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                Plánuj dopredu. Sleduj tlakové níže, fázy mesiaca a vytvor si checklist, aby si na brehu nezistil, že nemáš zarážky.
              </p>
              <ul className="space-y-3 border-t border-white/5 pt-6">
                <li className="flex gap-2 items-center text-xs text-slate-300"><Check size={14} className="text-indigo-500 flex-shrink-0" /> 7-dňová predpoveď</li>
                <li className="flex gap-2 items-center text-xs text-slate-300"><Check size={14} className="text-indigo-500 flex-shrink-0" /> Gear checklist</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FISHING BATTLE SECTION */}
      <section className="relative py-32 bg-[#050810] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-red-600 transform -skew-y-3 scale-110 origin-top-left opacity-[0.85] z-0" />
        <div className="absolute inset-0 z-0 opacity-10 mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-white">
            <div className="inline-block bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-orange-200 border border-white/20 mb-6">
              <Users size={14} className="inline mr-2" /> Fishing Battle
            </div>
            <h2 className="text-5xl md:text-7xl font-black mb-6 leading-none tracking-tighter drop-shadow-xl">
              Vyzvi kamošov<br /> na súboj.
            </h2>
            <p className="text-orange-50 text-xl font-medium mb-10 max-w-md drop-shadow-md">
              Koniec rečiam o tom, komu sa utrhla väčšia ryba. Tabuľka neklame. Vytvor lobby, nahadzuj úlovky a sleduj, ako kamoši v reálnom čase padajú na dno rebríčka.
            </p>
            <div className="bg-black/20 backdrop-blur-sm p-6 rounded-2xl border border-white/10 flex flex-col gap-4 w-fit">
              <div className="font-bold uppercase tracking-wider text-sm opacity-80 border-b border-white/10 pb-2">Režimy Fishing Battle</div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 font-black text-sm">
                <div>1. Najťažšia ryba</div>
                <div>2. Celková váha</div>
                <div>3. Počet rýb</div>
              </div>
            </div>
          </div>

          {/* Leaderboard Mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-black/40 blur-[50px] rounded-full" />
            <div className="relative bg-[#0A101C]/90 backdrop-blur-xl border-2 border-white/10 rounded-[2rem] p-8 shadow-2xl transform rotate-3">
              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                <h3 className="font-black text-white text-xl">Kaprárska výzva 🎣</h3>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-orange-500/20 to-transparent border border-orange-500/30 p-5 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-orange-400">1</span>
                    <div>
                      <div className="font-bold text-white text-lg">Marek (Ty)</div>
                      <div className="text-xs text-orange-300">Posledný úlovok pred 2h</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-2xl text-white">6.45<span className="text-sm text-slate-400"> kg</span></div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex justify-between items-center opacity-80">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-slate-500">2</span>
                    <div className="font-bold text-white text-lg">Jano</div>
                  </div>
                  <div className="font-black text-xl text-white">4.20<span className="text-sm text-slate-500"> kg</span></div>
                </div>

                <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex justify-between items-center opacity-60">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-slate-600">3</span>
                    <div className="font-bold text-slate-300 text-lg">Peto</div>
                  </div>
                  <div className="font-black text-xl text-slate-300">2.80<span className="text-sm text-slate-600"> kg</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FINAL CTA SECTION */}
      <section className="relative py-32 border-t border-white/5 flex items-center justify-center min-h-[60vh]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544390041-399a099a9a2a?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
          <div className="absolute inset-0 bg-[#050810]/80 backdrop-blur-[2px]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Target size={48} className="text-teal-500 mx-auto mb-8" />
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Nenechávaj úspech na náhodu.
          </h2>
          <p className="text-slate-300 mb-10 max-w-xl mx-auto text-lg">
            Pridaj sa do Contestio tímu, vyskúšaj si denník a ulož si svoje spomienky na jednom mieste.
          </p>
          <Link href="/auth/login">
            <div className="inline-block bg-teal-500 text-[#050810] px-12 py-5 rounded-2xl font-black text-xl hover:bg-white hover:text-black transition-all shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:scale-105 cursor-pointer">
              Získať účet zdarma
            </div>
          </Link>
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
                Tvoj digitálny rybársky denník. Vždy po ruke.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/pricing"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Cenník</span></Link></li>
                <li><Link href="/#features"><span className="text-white/50 hover:text-white text-sm cursor-pointer transition-colors">Funkcie</span></Link></li>
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
