import NavigationHeader from "@/components/navigation-header";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0c1f28]">
      <NavigationHeader />
      <div className="h-16" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Podmienky Používania Aplikácie Contestio
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
              1. Úvodné ustanovenia
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                <strong className="text-white">1.1.</strong> Tieto Podmienky používania (ďalej len "Podmienky") upravujú práva a povinnosti medzi prevádzkovateľom a používateľmi pri používaní aplikácie Contestio (ďalej len "Aplikácia").
              </p>
              <p>
                <strong className="text-white">1.2.</strong> Prevádzkovateľom Aplikácie je Ľubomír Šulek, IČO: 44648499, so sídlom Majakovského 13027/11, 08001 Prešov (ďalej len "Prevádzkovateľ").
              </p>
              <p>
                <strong className="text-white">1.3.</strong> Používateľom sa rozumie každá fyzická alebo právnická osoba, ktorá sa zaregistruje a používa Aplikáciu. Súhlasom s týmito Podmienkami pri registrácii sa Používateľ zaväzuje ich dodržiavať.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              2. Registrácia a Používateľský Účet
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                <strong className="text-white">2.1.</strong> Používanie Aplikácie je podmienené registráciou a vytvorením používateľského účtu. Používateľ je povinný uviesť pravdivé a aktuálne údaje.
              </p>
              <p>
                <strong className="text-white">2.2.</strong> Používateľ je zodpovedný za ochranu svojich prihlasovacích údajov a za všetky aktivity vykonané prostredníctvom jeho účtu.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              3. Služby a Predplatné (Premium)
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                <strong className="text-white">3.1.</strong> Aplikácia je poskytovaná v dvoch verziách:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Free verzia: Bezplatná verzia s obmedzenými funkciami.</li>
                <li>Premium verzia: Platená verzia s prístupom ku všetkým pokročilým funkciám, ako je definované v sekcii Cenník.</li>
              </ul>
              <p>
                <strong className="text-white">3.2.</strong> Platby za Premium verziu sú spracovávané prostredníctvom platobnej brány tretej strany. Úhradou predplatného Používateľ súhlasí s platobnými podmienkami tejto tretej strany.
              </p>
              <p>
                <strong className="text-white">3.3.</strong> Predplatné sa automaticky obnovuje, pokiaľ ho Používateľ nezruší pred koncom predplateného obdobia v nastaveniach svojho účtu.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              4. Obsah Používateľa
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                <strong className="text-white">4.1.</strong> Používateľ je plne zodpovedný za všetok obsah (fotografie, texty, dáta o úlovkoch), ktorý nahrá do Aplikácie.
              </p>
              <p>
                <strong className="text-white">4.2.</strong> Používateľ vyhlasuje, že je oprávnený nakladať s obsahom, ktorý nahráva, a že tento obsah neporušuje práva tretích strán ani platné právne predpisy.
              </p>
              <p>
                <strong className="text-white">4.3.</strong> Nahraním obsahu udeľuje Používateľ Prevádzkovateľovi nevýhradnú, bezodplatnú, celosvetovú licenciu na použitie tohto obsahu v anonymizovanej a agregovanej podobe na účely analýzy, marketingu a zlepšovania služieb Aplikácie.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              5. Pravidlá Správania
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                <strong className="text-white">5.1.</strong> Používateľ sa zaväzuje, že nebude Aplikáciu používať na šírenie nezákonného, urážlivého, nenávistného, obťažujúceho, hanlivého alebo inak nevhodného obsahu.
              </p>
              <p>
                <strong className="text-white">5.2.</strong> Prevádzkovateľ si vyhradzuje právo, no nie povinnosť, monitorovať obsah a aktivity používateľov. V prípade porušenia týchto Podmienok si Prevádzkovateľ vyhradzuje právo podľa vlastného uváženia:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Odstrániť nevhodný obsah.</li>
                <li>Udeliť Používateľovi varovanie.</li>
                <li>Dočasne alebo trvalo zablokovať účet Používateľa bez nároku na vrátenie predplatného.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              6. Zodpovednosť a Obmedzenia
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                <strong className="text-white">6.1.</strong> Prevádzkovateľ poskytuje Aplikáciu "tak, ako je", bez záruky nepretržitej dostupnosti alebo bezchybnosti.
              </p>
              <p>
                <strong className="text-white">6.2.</strong> Prevádzkovateľ nenesie zodpovednosť za škody spôsobené používaním Aplikácie, stratou dát alebo konaním iných Používateľov.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
              7. Záverečné ustanovenia
            </h2>
            <div className="space-y-3 text-sm md:text-base leading-relaxed">
              <p>
                <strong className="text-white">7.1.</strong> Tieto Podmienky sa riadia právnym poriadkom Slovenskej republiky.
              </p>
              <p>
                <strong className="text-white">7.2.</strong> Prevádzkovateľ si vyhradzuje právo na zmenu týchto Podmienok. O podstatných zmenách bude Používateľa informovať vopred.
              </p>
              <p>
                <strong className="text-white">7.3.</strong> V prípade otázok nás kontaktujte na e-mailovej adrese: <a href="mailto:gdpr@contestio.sk" className="text-emerald-400 hover:text-emerald-300 transition-colors">gdpr@contestio.sk</a>.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
