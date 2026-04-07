import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TacticalIcon, TacticalIconVariant } from "@/components/ui/tactical-icon";
import { ChevronDown, BookOpen, KeyRound, Wrench, ArrowLeft, LucideIcon } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: LucideIcon;
  variant: TacticalIconVariant;
  description: string;
  items: FAQItem[];
}

export default function FAQ() {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const faqSections: FAQSection[] = [
    {
      title: "Rybársky denník",
      icon: BookOpen,
      variant: "cyan",
      description: "Zápis úlovkov, štatistiky, sezónne ciele a offline režim",
      items: [
        {
          question: "Čo je rybársky denník?",
          answer: "Digitálny denník, kde si môžeš zapisovať úlovky, fotografie, lokality, nástrahy a podmienky lovu. Všetko máš uložené na jednom mieste."
        },
        {
          question: "Obsahuje denník aj predpoveď počasia?",
          answer: "Áno. Pri zápise úlovku sa ti zobrazí predpoveď počasia pre danú lokalitu, vrátane tlaku a smeru vetra."
        },
        {
          question: "Dá sa sledovať aj štatistika mojich úlovkov?",
          answer: "Určite. Aplikácia ti ponúkne grafy a prehľady podľa použitých nástrah, lokalít či poveternostných podmienok."
        },
        {
          question: "Môžem si nastaviť ciele na novú sezónu?",
          answer: "Áno. Každý používateľ si po registrácii a následne každoročne od 15. januára môže nastaviť svoje ciele (napr. počet výprav, ulovených rýb alebo trofejných kusov). Splnenie cieľov sa zobrazuje v prehľadných grafoch a progress baroch."
        },
        {
          question: "Funguje denník aj offline?",
          answer: "Zápis úlovkov, fotografií a poznámok je možný aj bez internetu. Po opätovnom pripojení sa všetko automaticky synchronizuje."
        },
        {
          question: "Aký je rozdiel medzi FREE a PREMIUM?",
          answer: "FREE verzia ti ponúka neobmedzené výpravy (s prístupom k posledným 3), kapacitu 50 úlovkov, 1 fotografiu na úlovok a môžeš prijímať battle výzvy. PREMIUM ti odomkne neobmedzenú históriu výprav, neobmedzené úlovky a fotografie, pokročilé štatistiky a grafy, ukladanie GPS lokalít, predpoveď počasia, offline režim so synchronizáciou a možnosť vytvárať vlastné battle súboje. Cena je 5,90 €/mesiac alebo 59,90 €/rok."
        }
      ]
    },
    {
      title: "Registrácia a účty",
      icon: KeyRound,
      variant: "orange",
      description: "Vytvorenie účtu, prihlásenie a nastavenie profilu",
      items: [
        {
          question: "Musím mať účet, aby som používal Contestio?",
          answer: "Áno. Registrácia je nutná pre vedenie rybárskeho denníka."
        },
        {
          question: "Ako sa môžem registrovať?",
          answer: "Máš dve možnosti: rýchla registrácia cez Google účet alebo klasická registrácia cez e-mail a heslo."
        },
        {
          question: "Čo ak zabudnem heslo?",
          answer: "Stačí kliknúť na 'Zabudnuté heslo' pri prihlasovaní a dostaneš inštrukcie na e-mail."
        }
      ]
    },
    {
      title: "Technické otázky",
      icon: Wrench,
      variant: "purple",
      description: "Kompatibilita zariadení, offline režim a integrácie",
      items: [
        {
          question: "Na akých zariadeniach funguje Contestio?",
          answer: "Contestio funguje na PC, tabletoch aj mobiloch. Aplikácia je responzívna, takže ju môžeš používať priamo v prehliadači alebo ako webovú appku."
        },
        {
          question: "Bude dostupná aj mobilná aplikácia?",
          answer: "Áno, v ďalšej fáze vývoja pripravujeme aj natívnu aplikáciu pre Android a iOS."
        },
        {
          question: "Potrebujem internet, aby som používal Contestio?",
          answer: "Väčšina funkcií vyžaduje pripojenie, ale zápis do rybárskeho denníka je možný aj offline (synchronizácia prebehne po pripojení)."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3" data-testid="text-faq-title">
            Často kladené otázky
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
            Nájdite odpovede na najčastejšie otázky o platforme Contestio
          </p>
          <div className="w-20 h-1 bg-primary mx-auto mt-4 rounded-full"></div>
        </div>

        {selectedCategory === null ? (
          // Category Selector
          <div>
            <p className="text-center text-muted-foreground mb-6">
              Vyber si oblasť, ktorá ťa zaujíma
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {faqSections.map((section, index) => (
                <Card 
                  key={index}
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
                  onClick={() => setSelectedCategory(index)}
                  data-testid={`category-card-${index}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <TacticalIcon icon={section.icon} variant={section.variant} size="md" showLabel={false} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>
                    <div className="mt-4 text-xs text-primary font-semibold">
                      {section.items.length} {section.items.length === 1 ? 'otázka' : section.items.length < 5 ? 'otázky' : 'otázok'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          // Selected Category Questions
          <div>
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory(null);
                  setOpenItems([]);
                }}
                className="flex items-center gap-2"
                data-testid="button-back-to-categories"
              >
                <ArrowLeft className="w-4 h-4" />
                Späť na kategórie
              </Button>
            </div>

            {/* Category Header */}
            <div className="flex items-center gap-4 mb-6">
              {(() => {
                const section = faqSections[selectedCategory];
                return (
                  <>
                    <TacticalIcon icon={section.icon} variant={section.variant} size="md" showLabel={false} />
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                        {section.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* FAQ Items */}
            <div className="space-y-3">
              {faqSections[selectedCategory].items.map((item, itemIndex) => {
                const itemId = `${selectedCategory}-${itemIndex}`;
                const isOpen = openItems.includes(itemId);
                
                return (
                  <Card 
                    key={itemIndex} 
                    className="transition-all duration-200 hover:shadow-md"
                  >
                    <CardContent className="p-0">
                      {/* Question */}
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full p-5 text-left flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg"
                        data-testid={`faq-question-${itemId}`}
                      >
                        <h3 className="font-semibold text-foreground pr-4">
                          {item.question}
                        </h3>
                        <ChevronDown 
                          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      
                      {/* Answer */}
                      <div 
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div 
                          className="px-5 pb-5 pt-2 text-sm text-muted-foreground leading-relaxed border-t border-border/50"
                          data-testid={`faq-answer-${itemId}`}
                        >
                          {item.answer}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact Section */}
        <Card className="mt-12 bg-muted/40">
          <CardContent className="p-6 md:p-8 text-center">
            <h3 className="text-xl font-bold text-foreground mb-3">
              Nenašiel si odpoveď na svoju otázku?
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-2xl mx-auto">
              Náš tím je tu pre teba! Kontaktuj nás a radi ti pomôžeme s čímkoľvek potrebuješ.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:info@contestio.sk"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                data-testid="button-email-contact"
              >
                Napísať email
              </a>
              <a
                href="tel:+421000000000"
                className="inline-flex items-center justify-center px-5 py-2.5 border border-primary text-primary text-sm font-semibold rounded-lg hover:bg-primary/5 transition-colors"
                data-testid="button-phone-contact"
              >
                Zavolať
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
