import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Users, Fish, Settings } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: any;
  color: string;
  items: FAQItem[];
}

export default function FAQ() {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const faqSections: FAQSection[] = [
    {
      title: "Organizátori",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      items: [
        {
          question: "Ako zaregistrujem súťaž?",
          answer: "Registrácia súťaže je jednoduchá. Stačí kliknúť na 'Registrovať súťaž' v menu, vyplniť potrebné údaje ako názov súťaže, dátum, miesto konania, kontaktné údaje a vybrať si vhodný cenový balík. Po odoslaní formulára váš požiadavka prejde schvaľovacím procesom."
        },
        {
          question: "Koľko tímov môžem prihlásiť?",
          answer: "Počet tímov závisí od vášho zvoleného balíka. Basic balík umožňuje maximálne 10 tímov, zatiaľ čo Pro, Premium a Enterprise balíky nemají obmedzenie počtu tímov. Môžete si kedykoľvek upgradovať na vyšší balík podľa potrieb vašej súťaže."
        },
        {
          question: "Koľko rozhodcov môžem mať?",
          answer: "Basic balík podporuje až 2 rozhodcov, Pro balík až 5 rozhodcov, zatiaľ čo Premium a Enterprise balíky umožňujú neobmedzený počet rozhodcov. Každý rozhodca má vlastné prihlásenie a môže zapisovať úlovky nezávisle."
        },
        {
          question: "Môžem pridávať sponzorov a ceny?",
          answer: "Áno! Funkcia sponzorov je dostupná od Pro balíka vyššie. Môžete pridávať logá sponzorov, popis ich príspevkov a ceny ktoré poskytujú. Sponzori sa zobrazia na stránke súťaže a v prezentáciách výsledkov."
        },
        {
          question: "Ako funguje Enterprise balík?",
          answer: "Enterprise balík je určený pre veľké organizácie a obsahuje všetky funkcie plus white-label riešenie, API prístup, interaktívne mapy, podporu pre viacero súťaží pod jednou organizáciou a dedikovanú podporu nášho tímu. Cena sa stanovuje individuálne podľa potrieb."
        }
      ]
    },
    {
      title: "Súťažiaci",
      icon: Fish,
      color: "from-green-500 to-green-600",
      items: [
        {
          question: "Ako sa prihlásim do súťaže?",
          answer: "Prihlásenie prebieha cez našu aplikáciu alebo webovú stránku. Vyberte si súťaž, zaregistrujte svoj tím, vyplňte údaje všetkých členov a uhraďte registračný poplatok ak je požadovaný. Po schválení od organizátora budete oficiálne zaregistrovaní."
        },
        {
          question: "Ako sa zaznamenáva úlovok?",
          answer: "Úlovky zaznamenávajú rozhodcovia priamo cez mobilnú aplikáciu. Rozhodca otvorí váš tím v aplikácii, zadá váhu ryby, pridá fotografiu a potvrdí záznam. Údaje sa okamžite synchronizujú a zobrazia v live rebríčku."
        },
        {
          question: "Ako môžem sledovať priebežné výsledky?",
          answer: "Priebežné výsledky sú dostupné v reálnom čase na webovej stránke súťaže. Stačí otvoriť stránku súťaže v prehliadači a budete vidieť aktuálny rebríček, fotografie úlovkov a pokrok všetkých tímov. Výsledky sa aktualizujú automaticky."
        },
        {
          question: "Sú výsledky dostupné po skončení súťaže?",
          answer: "Áno, všetky výsledky zostávajú trvalo dostupné aj po skončení súťaže. Môžete si pozrieť finálne poradie, všetky úlovky s fotografiami, štatistiky a ďalšie podrobnosti. Organizátor môže výsledky tiež exportovať do PDF alebo Excel formátu."
        }
      ]
    },
    {
      title: "Technické otázky",
      icon: Settings,
      color: "from-purple-500 to-purple-600",
      items: [
        {
          question: "Na akých zariadeniach môžem aplikáciu používať?",
          answer: "Contestio funguje na všetkých moderných zariadeniach - počítače, tablety a mobilné telefóny s internetovým pripojením. Rozhodcovia používajú mobilnú aplikáciu optimalizovanú pre terénne podmienky, organizátori a diváci majú prístup cez webový prehliadač."
        },
        {
          question: "Môžem integrovať výsledky na vlastný web?",
          answer: "Áno! Enterprise balík obsahuje API prístup, ktorý umožňuje integráciu live výsledkov priamo na váš web alebo aplikáciu. Môžete zobrazovať rebríčky, štatistiky a ďalšie údaje v reálnom čase na vlastnej doméne s vaším designom."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 main-content-wrapper">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6" data-testid="text-faq-title">
            Často kladené otázky
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Nájdite odpovede na najčastejšie otázky o platforme Contestio
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-primary/60 mx-auto mt-6 rounded-full"></div>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-12">
          {faqSections.map((section, sectionIndex) => {
            const IconComponent = section.icon;
            
            return (
              <div key={sectionIndex} className="space-y-6">
                {/* Section Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-12 h-12 bg-gradient-to-br ${section.color} rounded-full flex items-center justify-center shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {section.title}
                  </h2>
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                  {section.items.map((item, itemIndex) => {
                    const itemId = `${sectionIndex}-${itemIndex}`;
                    const isOpen = openItems.includes(itemId);
                    
                    return (
                      <Card 
                        key={itemIndex} 
                        className="transition-all duration-200 hover:shadow-md border-l-4 border-l-transparent hover:border-l-primary"
                      >
                        <CardContent className="p-0">
                          {/* Question */}
                          <button
                            onClick={() => toggleItem(itemId)}
                            className="w-full p-6 text-left flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg"
                            data-testid={`faq-question-${itemId}`}
                          >
                            <h3 className="font-semibold text-foreground text-lg pr-4">
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
                              className="px-6 pb-6 pt-2 text-muted-foreground leading-relaxed border-t border-border/50"
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
            );
          })}
        </div>

        {/* Contact Section */}
        <div className="mt-20 text-center">
          <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Nenašli ste odpoveď na svoju otázku?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Naš tím je tu pre vás! Kontaktujte nás a radi vám pomôžeme s čímkoľvek potrebujete.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:info@contestio.sk"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                data-testid="button-email-contact"
              >
                Napísať email
              </a>
              <a
                href="tel:+421000000000"
                className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors"
                data-testid="button-phone-contact"
              >
                Zavolať
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}