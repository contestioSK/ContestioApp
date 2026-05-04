import { useState } from "react";
import { Link } from "wouter";
import {
  Menu, X, Check, ChevronDown, ChevronRight,
  Fish, Camera, MapPin, BarChart2, Waves, Shield,
  Clock, Zap, Star, Lock,
} from "lucide-react";

const TEAL = "#1FB6A6";
const PRIMARY = "#0B1C2F";

function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: 220, flexShrink: 0 }}>
      <div
        className="relative rounded-[2.5rem] overflow-hidden border-4 shadow-2xl"
        style={{
          borderColor: "#1a2e42",
          backgroundColor: "#071525",
          height: 440,
          boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(31,182,166,0.15)",
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#071525] rounded-b-2xl z-10 flex items-center justify-center">
          <div className="w-10 h-1 bg-[#1a2e42] rounded-full" />
        </div>
        <div className="w-full h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function AppScreenCatch() {
  return (
    <div className="p-4 pt-8 h-full flex flex-col gap-3" style={{ backgroundColor: "#071525" }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-white/70">Môj denník</span>
        <span className="text-xs" style={{ color: TEAL }}>+ Úlovok</span>
      </div>
      {[
        { fish: "Zubáč veľkoočí", weight: "3.2 kg", len: "72 cm", date: "24. 4. 2024", color: "#1FB6A6" },
        { fish: "Kapor rybničný", weight: "6.8 kg", len: "64 cm", date: "18. 4. 2024", color: "#38bdf8" },
        { fish: "Šťuka severná", weight: "2.1 kg", len: "58 cm", date: "10. 4. 2024", color: "#a78bfa" },
      ].map((c, i) => (
        <div key={i} className="rounded-xl p-3 border border-white/5" style={{ backgroundColor: "#0f2135" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + "20" }}>
              <Fish size={12} style={{ color: c.color }} />
            </div>
            <span className="text-xs font-semibold text-white">{c.fish}</span>
          </div>
          <div className="flex gap-3 ml-8">
            <span className="text-xs" style={{ color: c.color }}>{c.weight}</span>
            <span className="text-xs text-white/40">{c.len}</span>
            <span className="text-xs text-white/30">{c.date}</span>
          </div>
        </div>
      ))}
      <div className="rounded-xl p-3 border border-white/5 opacity-50" style={{ backgroundColor: "#0f2135" }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/5" />
          <div className="h-2 w-24 bg-white/10 rounded" />
        </div>
      </div>
    </div>
  );
}

function AppScreenTrip() {
  return (
    <div className="p-4 pt-8 h-full flex flex-col gap-3" style={{ backgroundColor: "#071525" }}>
      <div className="text-xs font-semibold text-white/70 mb-1">Výprava</div>
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0f2135", height: 100 }}>
        <div className="w-full h-full flex items-end p-3">
          <div className="w-full flex items-end gap-1 h-14">
            {[40, 60, 30, 80, 55, 90, 45, 70].map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: i === 5 ? TEAL : TEAL + "40" }} />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Úlovkov", val: "7", color: TEAL },
          { label: "Váha", val: "18.4 kg", color: "#38bdf8" },
          { label: "Nástraha", val: "Boilies", color: "#a78bfa" },
          { label: "Tlak", val: "1014 hPa", color: "#fb923c" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-2 border border-white/5" style={{ backgroundColor: "#0f2135" }}>
            <div className="text-xs text-white/40">{s.label}</div>
            <div className="text-sm font-semibold" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppScreenStats() {
  return (
    <div className="p-4 pt-8 h-full flex flex-col gap-3" style={{ backgroundColor: "#071525" }}>
      <div className="text-xs font-semibold text-white/70 mb-1">Štatistiky</div>
      <div className="space-y-2">
        {[
          { label: "Celková váha", val: "142.6 kg", pct: 80 },
          { label: "Výpravy", val: "24", pct: 60 },
          { label: "Druhov rýb", val: "11", pct: 45 },
          { label: "Najlepší mesiac", val: "Apríl", pct: 90 },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-3 border border-white/5" style={{ backgroundColor: "#0f2135" }}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-white/50">{s.label}</span>
              <span className="text-xs font-semibold" style={{ color: TEAL }}>{s.val}</span>
            </div>
            <div className="h-1 rounded-full bg-white/10">
              <div className="h-1 rounded-full" style={{ width: `${s.pct}%`, backgroundColor: TEAL }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const navItems = [
    { href: "/about-us", label: "O nás" },
    { href: "/pricing", label: "Cenník" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Kontakt" },
  ];

  const features = [
    {
      icon: <Camera size={22} />,
      title: "Karta úlovku",
      desc: "Pridaj fotku, váhu, nástrahu a lokáciu za 20 sekúnd. Navždy uložené v cloude.",
    },
    {
      icon: <BarChart2 size={22} />,
      title: "Štatistiky a grafy",
      desc: "Sleduj trendy, najlepšie nástrahy a podmienky. Dáta, nie dohady.",
    },
    {
      icon: <MapPin size={22} />,
      title: "GPS lokality",
      desc: "Ukladaj tajné miesta na mape. Naviguj sa späť aj o rok.",
    },
    {
      icon: <Waves size={22} />,
      title: "Počasie & tlak",
      desc: "7-dňová predpoveď a tlakový index aktivity rýb pri plánovaní výpravy.",
    },
    {
      icon: <Zap size={22} />,
      title: "Fishing Battle",
      desc: "Vyzvi kamarátov na súboj. Leaderboard v reálnom čase.",
    },
    {
      icon: <Shield size={22} />,
      title: "Bezpečné úložisko",
      desc: "Tvoje spomienky sú šifrované a zálohované. Nestratíš ich nikdy.",
    },
  ];

  const freeFeatures = [
    "50 úlovkov",
    "1 fotografia na úlovok",
    "História výprav (posledné 3)",
    "Prijímanie výziev v Battle",
  ];

  const premiumFeatures = [
    "Neobmedzené výpravy a úlovky",
    "Neobmedzené fotografie",
    "Pokročilé štatistiky a grafy",
    "Tvorba vlastných Fishing Battles",
    "Interaktívne mapy a GPS lokality",
    "Predpoveď počasia a tlak",
    "Offline režim pri vode",
  ];

  const lockedFree = [
    "GPS lokality",
    "Vlastné Battles",
    "Neobmedzená história",
    "Predpoveď počasia",
  ];

  const faqItems = [
    {
      q: "Je PriVode zadarmo?",
      a: "Áno, základná verzia je bezplatná. Môžeš si zadarmo ukladať až 50 úlovkov, 1 fotku na úlovok a posledné 3 výpravy. Žiadna kreditná karta nie je potrebná.",
    },
    {
      q: "Čo odomkne Premium?",
      a: "Premium ti odomkne neobmedzené výpravy a úlovky, neobmedzené fotografie, pokročilé štatistiky, GPS mapy, Fishing Battles, predpoveď počasia a offline režim.",
    },
    {
      q: "Sú moje dáta a fotky v bezpečí?",
      a: "Áno. Všetky záznamy a fotky sú uložené v šifrovanom cloude. Tvoje spomienky sú v bezpečí aj keď zmeníš telefón.",
    },
    {
      q: "Čo je Fishing Battle?",
      a: "Battle je priateľský súboj s kamarátmi — kto chytí najťažšiu rybu, celkovú najväčšiu váhu alebo najviac rýb. Výsledky vidíš v reálnom čase.",
    },
  ];

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ backgroundColor: PRIMARY, fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
    >
      {/* ── NAVIGATION ── */}
      <nav className="relative z-50 px-5 md:px-12 pt-6 pb-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <span className="flex items-center gap-2 cursor-pointer select-none">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill={TEAL} />
                <path d="M8 16 C8 12, 12 9, 16 10 C20 11, 24 12, 24 16 C24 20, 20 23, 16 22 C12 21, 8 20, 8 16Z" fill="white" fillOpacity="0.9" />
                <circle cx="19" cy="14" r="1.5" fill={PRIMARY} />
                <path d="M7 18 C5 19, 4 21, 5 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 20 C5 22, 5 24, 6 25" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              </svg>
              <span className="text-xl font-bold tracking-tight">
                Pri<span style={{ color: TEAL }}>Vode</span>
              </span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className="text-sm text-white/60 hover:text-white transition-colors cursor-pointer">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login">
              <span className="text-sm text-white/70 hover:text-white transition-colors cursor-pointer px-4 py-2">
                Prihlásiť sa
              </span>
            </Link>
            <Link href="/auth/register">
              <span
                className="text-sm font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL, color: PRIMARY }}
              >
                Začať zadarmo
              </span>
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white/70 hover:text-white p-2"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div
            className="md:hidden mt-3 rounded-2xl p-5 border border-white/10"
            style={{ backgroundColor: "#0F2135" }}
          >
            <div className="space-y-1 mb-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className="px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg text-sm cursor-pointer transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-white/10 pt-4 space-y-2">
              <Link href="/auth/login">
                <div className="w-full border border-white/20 text-white/80 py-2.5 rounded-xl text-sm text-center cursor-pointer hover:bg-white/5">
                  Prihlásiť sa
                </div>
              </Link>
              <Link href="/auth/register">
                <div
                  className="w-full py-2.5 rounded-xl text-sm text-center font-semibold cursor-pointer"
                  style={{ backgroundColor: TEAL, color: PRIMARY }}
                >
                  Začať zadarmo
                </div>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="px-5 md:px-12 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{ borderColor: TEAL + "40", color: TEAL, backgroundColor: TEAL + "15" }}
          >
            <Fish size={12} /> Tvoj rybársky denník
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.08]">
            Každý úlovok má
            <br />
            <span style={{ color: TEAL }}>svoj príbeh.</span>
            <br />
            Ulož si ho navždy.
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            Zabudni na rozhádzané fotky a zabudnuté detaily. PriVode je denník, ktorý premení každú výpravu na trvalú spomienku.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register">
              <span
                className="px-8 py-3.5 rounded-xl font-semibold text-base cursor-pointer transition-opacity hover:opacity-90 flex items-center gap-2"
                style={{ backgroundColor: TEAL, color: PRIMARY }}
              >
                Začni zadarmo <ChevronRight size={18} />
              </span>
            </Link>
            <Link href="/auth/login">
              <span className="px-8 py-3.5 rounded-xl text-base text-white/60 hover:text-white cursor-pointer transition-colors border border-white/10 hover:border-white/30">
                Prihlásiť sa
              </span>
            </Link>
          </div>
        </div>

        {/* Phone mockups */}
        <div className="flex items-end justify-center gap-4 md:gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
          <div className="hidden sm:block" style={{ transform: "translateY(30px) rotate(-4deg)" }}>
            <PhoneFrame>
              <AppScreenTrip />
            </PhoneFrame>
          </div>
          <div style={{ transform: "translateY(0px)" }}>
            <PhoneFrame>
              <AppScreenCatch />
            </PhoneFrame>
          </div>
          <div className="hidden sm:block" style={{ transform: "translateY(30px) rotate(4deg)" }}>
            <PhoneFrame>
              <AppScreenStats />
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* ── FEATURE 1: Tisíc fotiek ── */}
      <section className="px-5 md:px-12 py-24" style={{ backgroundColor: "#071525" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: TEAL }}>
              Problém
            </div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Tisíc fotiek v galérii.
              <br />
              <span className="text-white/40">A žiadna spomienka.</span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8">
              Fotky sa strácajú medzi selfies a screenshotmi. Pamätáš si, kde si chytil tú päťku? Na čo brala? Pri akom tlaku?
            </p>
            <div className="space-y-3">
              {["Stratené detaily o montáži a lokácii", "Chaos v galérii telefónu", "Zabudnuté podmienky a počasie", "Stále začínaš od nuly"].map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-white/50 text-sm">
                  <X size={14} className="text-red-400 flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div
                className="absolute -inset-8 rounded-full blur-3xl opacity-20"
                style={{ backgroundColor: TEAL }}
              />
              <PhoneFrame className="relative">
                <AppScreenCatch />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE 2: 20 sekúnd ── */}
      <section className="px-5 md:px-12 py-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 flex justify-center">
            <div className="relative">
              <div
                className="absolute -inset-8 rounded-full blur-3xl opacity-15"
                style={{ backgroundColor: "#38bdf8" }}
              />
              <PhoneFrame className="relative">
                <AppScreenTrip />
              </PhoneFrame>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: TEAL }}>
              Riešenie
            </div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Zapíšeš úlovok za 20 sekúnd.
              <br />
              <span style={{ color: TEAL }}>Spomienku si na 20 rokov.</span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-8">
              Fotka, váha, nástraha, lokácia. Uložené v cloude. Vždy po ruke — aj za 10 rokov, aj keď zmeníš telefón.
            </p>
            <div className="space-y-3">
              {["Úlovok uložený za menej ako 20 sekúnd", "Fotky bezpečne v cloude", "Podmienky a počasie automaticky", "História výprav na dosah ruky"].map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-white/70 text-sm">
                  <Check size={14} className="flex-shrink-0" style={{ color: TEAL }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BIG STATEMENT ── */}
      <section className="px-5 md:px-12 py-32" style={{ backgroundColor: "#071525" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-4xl md:text-6xl font-bold leading-[1.15] tracking-tight">
            O dvadsať rokov si otvoríš telefón.{" "}
            <span style={{ color: TEAL }}>A budeš tam ty.</span>{" "}
            Pri vode.{" "}
            <span style={{ color: TEAL }}>Pri každej rybe,</span>{" "}
            ktorú si chytil.
          </p>
          <p className="mt-10 text-white/40 text-lg max-w-xl mx-auto">
            PriVode nie je len appka. Je to archív tvojho rybárskeho života.
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="px-5 md:px-12 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { val: "50+", label: "Aktívnych rybárov" },
              { val: "500+", label: "Úlovkov uložených" },
              { val: "20s", label: "Čas zápisu úlovku" },
              { val: "100%", label: "Spomienok zachovaných" },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 border border-white/5 text-center"
                style={{ backgroundColor: "#0F2135" }}
              >
                <div className="text-3xl font-bold mb-1" style={{ color: TEAL }}>{s.val}</div>
                <div className="text-sm text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="px-5 md:px-12 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Na funkcie. Presne, že máš{" "}
              <span style={{ color: TEAL }}>všetko pod kontrolou.</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Vymeň hádanie za tvrdé dáta. Každá výprava ťa posúva ďalej.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 border border-white/5 hover:border-teal-500/30 transition-colors"
                style={{ backgroundColor: "#0F2135" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: TEAL + "20", color: TEAL }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHONE SHOWCASE ── */}
      <section className="px-5 md:px-12 py-24" style={{ backgroundColor: "#071525" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Rybári, ktorí{" "}
              <span style={{ color: TEAL }}>vedia viac.</span>
            </h2>
            <p className="text-white/40 text-lg max-w-md mx-auto">
              PriVode ti dáva prehľad, ktorý ostatní nemajú.
            </p>
          </div>
          <div className="flex items-center justify-center gap-6 md:gap-10 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
            <div className="hidden md:block" style={{ transform: "translateY(24px) scale(0.9)", opacity: 0.7 }}>
              <PhoneFrame>
                <AppScreenStats />
              </PhoneFrame>
            </div>
            <div style={{ transform: "scale(1.05)" }}>
              <PhoneFrame>
                <AppScreenCatch />
              </PhoneFrame>
            </div>
            <div className="hidden md:block" style={{ transform: "translateY(24px) scale(0.9)", opacity: 0.7 }}>
              <PhoneFrame>
                <AppScreenTrip />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="px-5 md:px-12 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Začni zadarmo.{" "}
              <span style={{ color: TEAL }}>Pre rybárov,</span>
              <br />
              keď budete pripravení.
            </h2>
            <p className="text-white/40 text-lg mb-8">Žiadna kreditná karta nie je potrebná.</p>

            {/* Toggle */}
            <div
              className="inline-flex items-center rounded-xl p-1 border border-white/10 gap-1"
              style={{ backgroundColor: "#0F2135" }}
            >
              <button
                onClick={() => setBillingInterval("monthly")}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                style={
                  billingInterval === "monthly"
                    ? { backgroundColor: TEAL, color: PRIMARY }
                    : { color: "rgba(255,255,255,0.5)" }
                }
              >
                Mesačne
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                style={
                  billingInterval === "yearly"
                    ? { backgroundColor: TEAL, color: PRIMARY }
                    : { color: "rgba(255,255,255,0.5)" }
                }
              >
                Ročne
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: billingInterval === "yearly" ? PRIMARY + "40" : TEAL + "30", color: TEAL }}
                >
                  -30%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* FREE */}
            <div
              className="rounded-2xl p-8 border border-white/10"
              style={{ backgroundColor: "#0F2135" }}
            >
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">Free</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-5xl font-bold text-white">0 €</span>
                </div>
                <div className="text-sm text-white/40">Navždy zadarmo</div>
              </div>
              <div className="space-y-3 mb-8">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                    <Check size={14} className="flex-shrink-0" style={{ color: TEAL }} />
                    {f}
                  </div>
                ))}
                {lockedFree.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-white/25">
                    <Lock size={13} className="flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/auth/register">
                <div className="w-full py-3 rounded-xl text-center text-sm font-semibold border border-white/15 text-white/70 hover:border-white/30 hover:text-white transition-colors cursor-pointer">
                  Začať zadarmo
                </div>
              </Link>
            </div>

            {/* PREMIUM */}
            <div
              className="rounded-2xl p-8 border-2 relative"
              style={{ backgroundColor: "#0F2135", borderColor: TEAL }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: TEAL, color: PRIMARY }}
              >
                Najobľúbenejší
              </div>
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: TEAL }}>
                  Premium
                </div>
                {billingInterval === "monthly" ? (
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-5xl font-bold text-white">7 €</span>
                    <span className="text-white/40 text-sm pb-1.5">/ mesiac</span>
                    <span className="text-white/30 line-through text-sm pb-1.5">9 €</span>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-5xl font-bold text-white">60 €</span>
                    <span className="text-white/40 text-sm pb-1.5">/ rok</span>
                    <span className="text-white/30 line-through text-sm pb-1.5">84 €</span>
                  </div>
                )}
                <div className="text-sm text-white/40">
                  {billingInterval === "yearly" ? "Ušetríš 24 € oproti mesačnému" : "alebo 60 €/rok (ušetríš 24 €)"}
                </div>
              </div>
              <div className="space-y-3 mb-8">
                {premiumFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-white/80">
                    <Check size={14} className="flex-shrink-0" style={{ color: TEAL }} />
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/pricing">
                <div
                  className="w-full py-3 rounded-xl text-center text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
                  style={{ backgroundColor: TEAL, color: PRIMARY }}
                >
                  Získať Premium
                </div>
              </Link>
            </div>
          </div>

          <div className="text-center mt-6">
            <Link href="/pricing">
              <span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">
                Zobraziť kompletný cenník →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ PREVIEW ── */}
      <section className="px-5 md:px-12 py-24" style={{ backgroundColor: "#071525" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">
              Čo sa pýtajú{" "}
              <span style={{ color: TEAL }}>ostatní rybári.</span>
            </h2>
          </div>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/8 overflow-hidden"
                style={{ backgroundColor: "#0F2135", borderColor: "rgba(255,255,255,0.07)" }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-white/90 text-sm pr-4">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className="flex-shrink-0 text-white/40 transition-transform"
                    style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0)" }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-white/50 leading-relaxed border-t border-white/5 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/faq">
              <span className="text-sm hover:text-white cursor-pointer transition-colors" style={{ color: TEAL }}>
                Všetky otázky a odpovede →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="px-5 md:px-12 py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{ borderColor: TEAL + "40", color: TEAL, backgroundColor: TEAL + "15" }}
          >
            <Star size={12} /> Zadarmo začneš hneď
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Tvoj ďalší úlovok si zaslúži viac,
            <br />
            <span style={{ color: TEAL }}>než zmiznúť v galérii.</span>
          </h2>
          <p className="text-white/40 text-lg mb-10 max-w-lg mx-auto">
            Ukladaj spomienky, sleduj pokrok a vyzývaj kamarátov. Tvoj rybársky príbeh začína tu.
          </p>
          <Link href="/auth/register">
            <span
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-lg cursor-pointer transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL, color: PRIMARY }}
            >
              Začni zadarmo <ChevronRight size={20} />
            </span>
          </Link>
          <p className="mt-4 text-sm text-white/25">Žiadna kreditná karta. Žiadny záväzok.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-5 md:px-12 py-12 border-t border-white/8" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill={TEAL} />
                  <path d="M8 16 C8 12, 12 9, 16 10 C20 11, 24 12, 24 16 C24 20, 20 23, 16 22 C12 21, 8 20, 8 16Z" fill="white" fillOpacity="0.9" />
                  <circle cx="19" cy="14" r="1.5" fill={PRIMARY} />
                  <path d="M7 18 C5 19, 4 21, 5 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M7 20 C5 22, 5 24, 6 25" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                </svg>
                <span className="font-bold text-white">
                  Pri<span style={{ color: TEAL }}>Vode</span>
                </span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">Tvoj rybársky denník. Navždy po ruke.</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Produkt</div>
              <ul className="space-y-2.5">
                <li><Link href="/pricing"><span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">Cenník</span></Link></li>
                <li><Link href="/faq"><span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">FAQ</span></Link></li>
                <li><Link href="/diary"><span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">Rybársky denník</span></Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Firma</div>
              <ul className="space-y-2.5">
                <li><Link href="/about-us"><span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">O nás</span></Link></li>
                <li><Link href="/contact"><span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">Kontakt</span></Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Právne</div>
              <ul className="space-y-2.5">
                <li><Link href="/terms"><span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">Podmienky</span></Link></li>
                <li><Link href="/privacy"><span className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors">Ochrana dát</span></Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/6 pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-xs text-white/25">© 2025 PriVode. Všetky práva vyhradené.</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-xs text-white/25 hover:text-white/50 transition-colors"
            >
              späť hore ↑
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
