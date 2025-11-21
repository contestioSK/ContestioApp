import { db } from '../server/db';
import { fishingAreas } from '../shared/schema';

const FISHING_AREAS = [
  { number: "1-0020-1-1", name: "Chorvátsky kanál, MsO Bratislava 5" },
  { number: "1-0040-1-1", name: "Čierna voda č. 3, MsO Senec" },
  { number: "1-0050-1-1", name: "Čierna voda č. 4, MsO Senec" },
  { number: "1-0130-1-1", name: "Dunaj č. 3, Rusovecko-Jarovecká sústava ramien, MsO Bratislava 5" },
  { number: "1-0140-1-1", name: "Dunaj č. 4, Karloveské rameno, MsO Bratislava 4" },
  { number: "1-0141-1-1", name: "Dunaj č. 4, Devínske rameno, MsO Bratislava 4" },
  { number: "1-0151-1-1", name: "Gidra č. 1b, MsO Pezinok" },
  { number: "1-0300-1-1", name: "Kanál Malina č. 1, MsO Záhorie" },
  { number: "1-0310-1-1", name: "Kanál Malina č. 2, MsO Záhorie" },
  { number: "1-0340-1-1", name: "Lakšár, MO Veľké a Malé Leváre" },
  { number: "1-0370-1-1", name: "Malý Dunaj č. 6, MsO Bratislava 2" },
  { number: "1-0390-1-1", name: "Morava č. 1, MsO Bratislava 4" },
  { number: "1-0400-1-1", name: "Morava č. 2, MsO Záhorie" },
  { number: "1-0410-1-1", name: "Morava č. 3, MO Gajary" },
  { number: "1-0420-1-1", name: "Morava č. 4, MO Veľké a Malé Leváre" },
  { number: "1-0430-1-1", name: "Odpadový kanál, MO Veľké a Malé Leváre" },
  { number: "1-0600-1-1", name: "Rudava č. 1, MO Veľké a Malé Leváre" },
  { number: "1-0610-1-1", name: "Rudava kanál, MO Rohožník" },
  { number: "1-0830-1-1", name: "Stoličný potok, MsO Senec" },
  { number: "1-1220-1-1", name: "Šúrsky potok, MsO Pezinok" },
  { number: "1-1470-1-1", name: "Záhorský kanál, MO Gajary" },
  { number: "1-1480-1-1", name: "Zohorský kanál č. 1, MsO Záhorie" },
  { number: "1-1490-1-1", name: "Zohorský kanál č. 2, MsO Záhorie" },
  { number: "1-0160-1-1", name: "Hlboké jazero v Senci, MsO Senec" },
  { number: "1-0900-1-1", name: "Štrkovisko Dunajská Lužná Malá Voda, MO Dunajská Lužná" },
  { number: "1-0960-1-1", name: "Štrkovisko Kalná, MsO Bratislava 3" },
  { number: "1-0980-1-1", name: "Štrkovisko Kuchajda, MsO Bratislava 4" },
  { number: "1-1010-1-1", name: "Štrkovisko na Židovkách, MsO Záhorie" },
  { number: "1-1120-1-1", name: "Štrkovisko Vajnory 2, MsO Bratislava 3" },
  { number: "1-1180-1-1", name: "Štrkovisko Zlaté piesky, MsO Bratislava 2" },
  { number: "1-1190-1-1", name: "Štrkovisko Zrkadlový Háj, MsO Bratislava 5" },
  { number: "1-1340-1-1", name: "VN Kučišdorf, MsO Pezinok" },
  { number: "2-0480-1-1", name: "Dunaj č. 1, SRZ RADA Žilina" },
  { number: "2-0490-1-1", name: "Dunaj č. 2, SRZ RADA Žilina" },
  { number: "2-0500-1-1", name: "Dunaj č. 2 - OR spodná inundácia, SRZ RADA Žilina" },
  { number: "2-0510-1-1", name: "Dunaj č. 3, SRZ RADA Žilina" },
  { number: "2-0520-1-1", name: "Dunaj č. 3 ľavostranný priesakový kanál VD, SRZ RADA Žilina" },
  { number: "2-0550-1-1", name: "Dunaj č. 3 - odpadový kanál VD, SRZ RADA Žilina" },
  { number: "2-0560-1-1", name: "Dunaj č. 3 - OR horná inundácia, SRZ RADA Žilina" },
  { number: "2-0570-1-1", name: "Dunaj č. 3 - OR stredná inundácia, SRZ RADA Žilina" },
  { number: "2-0580-1-1", name: "Dunaj č. 3 pravostranný priesakový kanál VD, SRZ RADA Žilina" },
  { number: "2-0590-1-3", name: "Dunaj č. 3 Prívodný kanál VD, SRZ RADA Žilina (celoročný zákaz)" },
  { number: "2-0600-1-1", name: "Dunaj č. 3 - pravostranný priesakový kanál VD Čunovsko-Rusovecko-Jarovecký, SRZ RADA Žilina" },
  { number: "2-0610-1-1", name: "Dunaj č. 3 zdrž VD Hrušov-Čunovo, SRZ RADA Žilina" },
  { number: "2-0620-1-1", name: "Dunaj č. 4, SRZ RADA Žilina" },
  { number: "2-0740-1-1", name: "Hron č. 1, MsO Štúrovo" },
  { number: "2-0750-1-1", name: "Hron č. 2, MO Želiezovce" },
  { number: "2-0760-1-1", name: "Hron č. 3, MsO Levice" },
  { number: "2-0770-1-1", name: "Ipeľ č. 1, MO Štúrovo" },
  { number: "2-0780-1-1", name: "Ipeľ č. 2, MO Želiezovce" },
  { number: "2-0790-1-1", name: "Ipeľ č. 3, MO Šahy" },
  { number: "2-1400-1-1", name: "Nitra č. 1, MsO Nové Zámky" },
  { number: "2-1410-1-1", name: "Nitra č. 2, MO Šurany" },
  { number: "2-1411-1-1", name: "Stará Nitra č. 3, MO Šurany" },
  { number: "2-1420-1-1", name: "Nitra č. 3, MsO Nitra" },
  { number: "2-1430-1-1", name: "Nitra č. 4, MsO Topoľčany" },
  { number: "2-1440-1-4", name: "Nitra č. 5a, CHAP, MsO Partizánske" },
  { number: "2-1441-1-1", name: "Nitra č. 5b, MsO SRZ Partizánske" },
  { number: "2-1450-1-4", name: "Nitrica č. 1a, CHAP, MsO Partizánske" },
  { number: "2-1551-1-1", name: "Nitrica č. 1b, MsO SRZ Partizánske" },
  { number: "2-1553-1-1", name: "Nitrica č. 1d, MsO SRZ Partizánske" },
  { number: "2-4360-1-1", name: "Váh č. 1, MO Kolárovo" },
  { number: "2-4370-1-1", name: "Váh č. 2, MsO Šaľa" },
  { number: "2-4380-1-1", name: "Váh č. 3, MsO Sereď" },
  { number: "2-4390-1-1", name: "Váh č. 4, MsO Hlohovec" },
  { number: "2-4391-1-4", name: "Váh č. 4a CHAP, MsO Hlohovec" },
  { number: "2-4400-1-1", name: "Váh č. 5, MO Drahovce" },
  { number: "2-4410-1-1", name: "Váh č. 6, MsO Piešťany" },
  { number: "2-4414-1-4", name: "Váh č. 6a, CHAP, MsO Piešťany" },
  { number: "2-4420-1-1", name: "Váh č. 7, MO Nové Mesto nad Váhom" },
  { number: "2-4430-2-1", name: "Váh č. 8, MsO Trenčín" },
  { number: "2-4431-1-4", name: "Kočkovský kanál č. 8, CHAP, MsO Trenčín" },
  { number: "2-4432-1-1", name: "Biskupický kanál č. 8, MsO SRZ Trenčín" },
  { number: "2-4440-1-1", name: "Vážsky Dunaj, MsO Komárno" },
  { number: "2-1330-1-1", name: "Morava č. 5, MO Sekule - Moravský Sv. Ján" },
  { number: "2-1340-1-1", name: "Morava č. 6, MO Kúty" },
  { number: "2-1350-1-1", name: "Morava č. 7b, MO Holíč" },
  { number: "2-1351-1-1", name: "Morava č. 7a, MO Brodské" },
  { number: "2-1360-1-1", name: "Morava č. 8, MO Skalica" },
  { number: "2-1190-1-1", name: "Malý Dunaj č. 1, MO Kolárovo" },
  { number: "2-1200-1-1", name: "Malý Dunaj č. 2, MO Topoľníky" },
  { number: "2-1210-1-1", name: "Malý Dunaj č. 3, MsO Dunajská Streda" },
  { number: "2-1220-1-1", name: "Malý Dunaj č. 4, MsO Galanta" },
  { number: "2-1230-1-1", name: "Malý Dunaj č. 5, MO Šamorín" },
];

export async function seedFishingAreas() {
  console.log('[SEED] Starting fishing areas seed...');
  
  try {
    // Check if areas already exist
    const existingCount = await db.select({ id: fishingAreas.id }).from(fishingAreas);
    
    if (existingCount.length > 0) {
      console.log(`[SEED] ${existingCount.length} fishing areas already exist, skipping seed`);
      return;
    }
    
    // Insert areas in batches
    const batchSize = 20;
    for (let i = 0; i < FISHING_AREAS.length; i += batchSize) {
      const batch = FISHING_AREAS.slice(i, i + batchSize);
      await db.insert(fishingAreas).values(batch);
      console.log(`[SEED] Inserted ${Math.min(batch.length, FISHING_AREAS.length - i)} fishing areas`);
    }
    
    console.log(`[SEED] Successfully seeded ${FISHING_AREAS.length} fishing areas!`);
  } catch (error) {
    console.error('[SEED] Error seeding fishing areas:', error);
  }
}
