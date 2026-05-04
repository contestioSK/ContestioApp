import NavigationHeader from "@/components/navigation-header";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0c1f28]">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Zásady Ochrany Osobných Údajov Aplikácie PriVode
          </h1>
          <p className="text-gray-400">
            Platnosť od: 12. Október 2025
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-gray-300">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              1. Kto sme?
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                Prevádzkovateľom vašich osobných údajov je <strong className="text-white">Ľubomír Šulek, IČO: 44648499</strong>, so sídlom Majakovského 13027/11, 08001 Prešov (ďalej len "Prevádzkovateľ" alebo "my"). V prípade otázok týkajúcich sa ochrany osobných údajov nás môžete kontaktovať na e-mailovej adrese: <a href="mailto:gdpr@privode.eu" className="text-emerald-400 hover:text-emerald-300 transition-colors">gdpr@privode.eu</a>.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              2. Aké údaje spracúvame a prečo?
            </h2>
            <div className="space-y-4 text-sm md:text-base leading-relaxed">
              <p>Spracúvame nasledujúce kategórie osobných údajov:</p>
              
              <div className="bg-[#1e3a5f]/30 p-4 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white mb-2">Registračné údaje:</h3>
                <p className="mb-2">E-mailová adresa, meno (alebo prezývka), heslo.</p>
                <p className="text-sm"><strong className="text-white">Účel:</strong> Vytvorenie a správa vášho používateľského účtu.</p>
                <p className="text-sm"><strong className="text-white">Právny základ:</strong> Plnenie zmluvy (čl. 6 ods. 1 písm. b) GDPR).</p>
              </div>

              <div className="bg-[#1e3a5f]/30 p-4 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white mb-2">Údaje z Rybárskeho Denníka:</h3>
                <p className="mb-2">Fotografie, dátumy, váha a dĺžka úlovkov, poznámky, typy nástrah.</p>
                <p className="text-sm"><strong className="text-white">Účel:</strong> Poskytovanie hlavnej funkcionality Rybárskeho denníka.</p>
                <p className="text-sm"><strong className="text-white">Právny základ:</strong> Plnenie zmluvy.</p>
              </div>

              <div className="bg-[#1e3a5f]/30 p-4 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white mb-2">GPS lokalita:</h3>
                <p className="mb-2">Presné geografické údaje o mieste úlovku.</p>
                <p className="text-sm mb-2"><strong className="text-white">Účel:</strong> Poskytovanie prémiových funkcií v Rybárskom denníku, ako je mapa úlovkov a analýza úspešnosti lokalít. Tieto údaje sú predvolene súkromné, viditeľné iba pre vás a nie sú použité na žiadne iné účely.</p>
                <p className="text-sm"><strong className="text-white">Právny základ:</strong> Súhlas (čl. 6 ods. 1 písm. a) GDPR), ktorý udeľujete povolením prístupu k polohe vo vašom zariadení.</p>
              </div>

              <div className="bg-[#1e3a5f]/30 p-4 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white mb-2">Platobné údaje:</h3>
                <p className="mb-2">V prípade zakúpenia Premium verzie spracúva vaše platobné údaje náš partner (platobná brána). My k týmto údajom nemáme priamy prístup.</p>
              </div>

              <div className="bg-[#1e3a5f]/30 p-4 rounded-lg border border-gray-700">
                <h3 className="font-semibold text-white mb-2">Technické a Analytické údaje:</h3>
                <p className="mb-2">IP adresa, typ zariadenia, prehliadača a informácie o používaní aplikácie (napr. kliknutia).</p>
                <p className="text-sm mb-2"><strong className="text-white">Účel:</strong> Zabezpečenie funkčnosti, bezpečnosti Aplikácie a anonymná analýza používania za účelom zlepšovania našich služieb. Na tento účel môžeme využívať nástroje tretích strán, ako je Google Analytics.</p>
                <p className="text-sm"><strong className="text-white">Právny základ:</strong> Oprávnený záujem (čl. 6 ods. 1 písm. f) GDPR).</p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              3. Ako dlho údaje uchovávame?
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                Vaše osobné údaje uchovávame po dobu trvania vašej registrácie v Aplikácii. Po zrušení účtu budú vaše údaje anonymizované alebo vymazané v zákonnej lehote.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              4. Kto má k vašim údajom prístup?
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                Vaše údaje sú u nás v bezpečí. Sprístupňujeme ich len overeným tretím stranám, ktoré nám pomáhajú prevádzkovať Aplikáciu, ako sú:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Poskytovatelia cloudovej infraštruktúry.</li>
                <li>Poskytovatelia platobných brán.</li>
                <li>Poskytovatelia analytických nástrojov.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              5. Aké sú vaše práva?
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>V súlade s GDPR máte právo na:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Prístup k svojim údajom.</li>
                <li>Opravu nesprávnych údajov.</li>
                <li>Vymazanie údajov ("právo byť zabudnutý").</li>
                <li>Obmedzenie spracúvania.</li>
                <li>Prenosnosť údajov.</li>
                <li>Vzniesť námietku proti spracúvaniu.</li>
              </ul>
              <p>
                Tieto práva si môžete uplatniť kontaktovaním nás na e-mailovej adrese uvedenej v bode 1.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              6. Súbory Cookies
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                Naša webová stránka používa súbory cookies na zabezpečenie jej funkčnosti a na analýzu návštevnosti. Používaním stránky súhlasíte s ich využívaním.
              </p>
            </div>
          </section>

          {/* Footer Note */}
          <section className="pt-8 border-t border-gray-700">
            <p className="text-sm text-gray-400 italic">
              Tieto Zásady môžeme z času na čas aktualizovať. O všetkých podstatných zmenách vás budeme informovať.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
