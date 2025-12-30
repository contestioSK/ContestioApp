import { db } from "../server/db";
import { fishingAreas } from "../shared/schema";

const fishingAreasData = [
  // BRATISLAVSKÁ OBLASŤ - Kanály a vodné toky
  { number: "1-0020-1-1", name: "Chorvátsky kanál", notes: "MsO Bratislava 5" },
  { number: "1-0040-1-1", name: "Čierna voda č. 3", notes: "MsO Senec" },
  { number: "1-0050-1-1", name: "Čierna voda č. 4", notes: "MsO Senec" },
  { number: "1-0130-1-1", name: "Dunaj č. 3, Rusovecko-Jarovecká sústava ramien", notes: "MsO Bratislava 5" },
  { number: "1-0140-1-1", name: "Dunaj č. 4, Karloveské rameno", notes: "MsO Bratislava 4" },
  { number: "1-0141-1-1", name: "Dunaj č. 4, Devínske rameno", notes: "MsO Bratislava 4" },
  { number: "1-0151-1-1", name: "Gidra č. 1b", notes: "MsO Pezinok" },
  { number: "1-0300-1-1", name: "Kanál Malina č. 1", notes: "MsO Záhorie" },
  { number: "1-0310-1-1", name: "Kanál Malina č. 2", notes: "MsO Záhorie" },
  { number: "1-0340-1-1", name: "Lakšár", notes: "MO Veľké a Malé Leváre" },
  { number: "1-0370-1-1", name: "Malý Dunaj č. 6", notes: "MsO Bratislava 2" },
  { number: "1-0390-1-1", name: "Morava č. 1", notes: "MsO Bratislava 4" },
  { number: "1-0400-1-1", name: "Morava č. 2", notes: "MsO Záhorie" },
  { number: "1-0410-1-1", name: "Morava č. 3", notes: "MO Gajary" },
  { number: "1-0420-1-1", name: "Morava č. 4", notes: "MO Veľké a Malé Leváre" },
  { number: "1-0430-1-1", name: "Odpadový kanál", notes: "MO Veľké a Malé Leváre" },
  { number: "1-0600-1-1", name: "Rudava č. 1", notes: "MO Veľké a Malé Leváre" },
  { number: "1-0610-1-1", name: "Rudava kanál", notes: "MO Rohožník" },
  { number: "1-0830-1-1", name: "Stoličný potok", notes: "MsO Senec" },
  { number: "1-1220-1-1", name: "Šúrsky potok", notes: "MsO Pezinok" },
  { number: "1-1470-1-1", name: "Záhorský kanál", notes: "MO Gajary" },
  { number: "1-1480-1-1", name: "Zohorský kanál č. 1", notes: "MsO Záhorie" },
  { number: "1-1490-1-1", name: "Zohorský kanál č. 2", notes: "MsO Záhorie" },
  // BRATISLAVSKÁ OBLASŤ - Štrkoviská a jazerá
  { number: "1-0160-1-1", name: "Hlboké jazero v Senci", notes: "MsO Senec" },
  { number: "1-0900-1-1", name: "Štrkovisko Dunajská Lužná Malá Voda", notes: "MO Dunajská Lužná" },
  { number: "1-0960-1-1", name: "Štrkovisko Kalná", notes: "MsO Bratislava 3" },
  { number: "1-0980-1-1", name: "Štrkovisko Kuchajda", notes: "MsO Bratislava 4" },
  { number: "1-1010-1-1", name: "Štrkovisko na Židovkách", notes: "MsO Záhorie" },
  { number: "1-1120-1-1", name: "Štrkovisko Vajnory 2", notes: "MsO Bratislava 3" },
  { number: "1-1180-1-1", name: "Štrkovisko Zlaté piesky", notes: "MsO Bratislava 2" },
  { number: "1-1190-1-1", name: "Štrkovisko Zrkadlový Háj", notes: "MsO Bratislava 5" },
  // BRATISLAVSKÁ OBLASŤ - Vodné nádrže
  { number: "1-1340-1-1", name: "VN Kučišdorf", notes: "MsO Pezinok" },

  // ZÁPADOSLOVENSKÁ OBLASŤ - Dunaj a jeho časti
  { number: "2-0480-1-1", name: "Dunaj č. 1", notes: "SRZ RADA Žilina" },
  { number: "2-0490-1-1", name: "Dunaj č. 2", notes: "SRZ RADA Žilina" },
  { number: "2-0500-1-1", name: "Dunaj č. 2 - OR spodná inundácia", notes: "SRZ RADA Žilina" },
  { number: "2-0510-1-1", name: "Dunaj č. 3", notes: "SRZ RADA Žilina" },
  { number: "2-0520-1-1", name: "Dunaj č. 3 ľavostranný priesakový kanál VD", notes: "SRZ RADA Žilina" },
  { number: "2-0550-1-1", name: "Dunaj č. 3 - odpadový kanál VD", notes: "SRZ RADA Žilina" },
  { number: "2-0560-1-1", name: "Dunaj č. 3 - OR horná inundácia", notes: "SRZ RADA Žilina" },
  { number: "2-0570-1-1", name: "Dunaj č. 3 - OR stredná inundácia", notes: "SRZ RADA Žilina" },
  { number: "2-0580-1-1", name: "Dunaj č. 3 pravostranný priesakový kanál VD", notes: "SRZ RADA Žilina" },
  { number: "2-0590-1-3", name: "Dunaj č. 3 Prívodný kanál VD", notes: "SRZ RADA Žilina (celoročný zákaz)" },
  { number: "2-0600-1-1", name: "Dunaj č. 3 - pravostranný priesakový kanál VD Čunovsko-Rusovecko-Jarovecký", notes: "SRZ RADA Žilina" },
  { number: "2-0610-1-1", name: "Dunaj č. 3 zdrž VD Hrušov-Čunovo", notes: "SRZ RADA Žilina" },
  { number: "2-0620-1-1", name: "Dunaj č. 4", notes: "SRZ RADA Žilina" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Hron a prítoky
  { number: "2-0740-1-1", name: "Hron č. 1", notes: "MsO Štúrovo" },
  { number: "2-0750-1-1", name: "Hron č. 2", notes: "MO Želiezovce" },
  { number: "2-0760-1-1", name: "Hron č. 3", notes: "MsO Levice" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Ipeľ
  { number: "2-0770-1-1", name: "Ipeľ č. 1", notes: "MO Štúrovo" },
  { number: "2-0780-1-1", name: "Ipeľ č. 2", notes: "MO Želiezovce" },
  { number: "2-0790-1-1", name: "Ipeľ č. 3", notes: "MO Šahy" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Nitra a prítoky
  { number: "2-1400-1-1", name: "Nitra č. 1", notes: "MsO Nové Zámky" },
  { number: "2-1410-1-1", name: "Nitra č. 2", notes: "MO Šurany" },
  { number: "2-1411-1-1", name: "Stará Nitra č. 3", notes: "MO Šurany" },
  { number: "2-1420-1-1", name: "Nitra č. 3", notes: "MsO Nitra" },
  { number: "2-1430-1-1", name: "Nitra č. 4", notes: "MsO Topoľčany" },
  { number: "2-1440-1-4", name: "Nitra č. 5a CHAP", notes: "MsO Partizánske" },
  { number: "2-1441-1-1", name: "Nitra č. 5b", notes: "MsO SRZ Partizánske" },
  { number: "2-1450-1-4", name: "Nitrica č. 1a CHAP", notes: "MsO Partizánske" },
  { number: "2-1551-1-1", name: "Nitrica č. 1b", notes: "MsO SRZ Partizánske" },
  { number: "2-1553-1-1", name: "Nitrica č. 1d", notes: "MsO SRZ Partizánske" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Váh a prítoky
  { number: "2-4360-1-1", name: "Váh č. 1", notes: "MO Kolárovo" },
  { number: "2-4370-1-1", name: "Váh č. 2", notes: "MsO Šaľa" },
  { number: "2-4380-1-1", name: "Váh č. 3", notes: "MsO Sereď" },
  { number: "2-4390-1-1", name: "Váh č. 4", notes: "MsO Hlohovec" },
  { number: "2-4391-1-4", name: "Váh č. 4a CHAP", notes: "MsO Hlohovec" },
  { number: "2-4400-1-1", name: "Váh č. 5", notes: "MO Drahovce" },
  { number: "2-4410-1-1", name: "Váh č. 6", notes: "MsO Piešťany" },
  { number: "2-4414-1-4", name: "Váh č. 6a CHAP", notes: "MsO Piešťany" },
  { number: "2-4420-1-1", name: "Váh č. 7", notes: "MO Nové Mesto nad Váhom" },
  { number: "2-4430-2-1", name: "Váh č. 8", notes: "MsO Trenčín" },
  { number: "2-4431-1-4", name: "Kočkovský kanál č. 8 CHAP", notes: "MsO Trenčín" },
  { number: "2-4432-1-1", name: "Biskupický kanál č. 8", notes: "MsO SRZ Trenčín" },
  { number: "2-4440-1-1", name: "Vážsky Dunaj", notes: "MsO Komárno" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Morava
  { number: "2-1330-1-1", name: "Morava č. 5", notes: "MO Sekule - Moravský Sv. Ján" },
  { number: "2-1340-1-1", name: "Morava č. 6", notes: "MO Kúty" },
  { number: "2-1350-1-1", name: "Morava č. 7b", notes: "MO Holíč" },
  { number: "2-1351-1-1", name: "Morava č. 7a", notes: "MO Brodské" },
  { number: "2-1360-1-1", name: "Morava č. 8", notes: "MO Skalica" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Malý Dunaj
  { number: "2-1190-1-1", name: "Malý Dunaj č. 1", notes: "MO Kolárovo" },
  { number: "2-1200-1-1", name: "Malý Dunaj č. 2", notes: "MO Topoľníky" },
  { number: "2-1210-1-1", name: "Malý Dunaj č. 3", notes: "MsO Dunajská Streda" },
  { number: "2-1220-1-1", name: "Malý Dunaj č. 4", notes: "MsO Galanta" },
  { number: "2-1230-1-1", name: "Malý Dunaj č. 5", notes: "MO Šamorín" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Ostatné vodné toky
  { number: "2-0040-1-1", name: "Aszódsky kanál č. 2", notes: "MO Veľký Meder" },
  { number: "2-0050-1-1", name: "Aszódsky kanál č. 3", notes: "MO Topoľníky" },
  { number: "2-0090-1-1", name: "Bebrava č. 1", notes: "MsO Partizánske" },
  { number: "2-0100-1-1", name: "Bebrava č. 2", notes: "MsO Bánovce nad Bebravou" },
  { number: "2-0130-1-1", name: "Blava č. 1", notes: "MsO Trnava" },
  { number: "2-0230-1-1", name: "Cergát č. 1", notes: "MsO Nové Zámky" },
  { number: "2-0240-1-1", name: "Cergát č. 2", notes: "MsO Nové Zámky" },
  { number: "2-0260-1-1", name: "Chrenovka", notes: "MsO Nové Zámky" },
  { number: "2-0280-1-1", name: "Chvojnica č. 1", notes: "MO Holíč" },
  { number: "2-0300-1-1", name: "Čergovský kanál", notes: "MO Kolárovo" },
  { number: "2-0320-1-1", name: "Čierna voda č. 1", notes: "MsO Galanta" },
  { number: "2-0330-1-1", name: "Čierna voda č. 2", notes: "MO Sládkovičovo" },
  { number: "2-0350-1-1", name: "Dolnobarský kanál", notes: "MO Topoľníky" },
  { number: "2-0400-1-1", name: "Dubová", notes: "MsO Piešťany" },
  { number: "2-0410-1-1", name: "Dudváh č. 1", notes: "MsO Galanta" },
  { number: "2-0420-1-1", name: "Dudváh č. 2a", notes: "MsO Trnava" },
  { number: "2-0421-1-1", name: "Dudváh č. 2b", notes: "MsO Hlohovec" },
  { number: "2-0430-1-1", name: "Dudváh č. 3", notes: "MO Drahovce" },
  { number: "2-0440-1-1", name: "Dudváh č. 4", notes: "MsO Piešťany" },
  { number: "2-0450-1-1", name: "Dudváh č. 5a", notes: "MsO Nové Mesto nad Váhom" },
  { number: "2-0640-1-1", name: "Farská voda", notes: "MO Holíč" },
  { number: "2-0660-1-1", name: "Gidra č. 1a", notes: "MsO Trnava" },
  { number: "2-0680-1-1", name: "Hlavný kanál Csóványos", notes: "MsO Šaľa" },
  { number: "2-0810-1-1", name: "Jarčie č. 1", notes: "MO Šoporňa" },
  { number: "2-0820-1-1", name: "Jarčie č. 2", notes: "MsO Sereď" },
  { number: "2-0961-1-1", name: "Kamenický kanál", notes: "MO Štúrovo" },
  { number: "2-0981-1-1", name: "Kanál Kátovské jazero", notes: "MO Holíč" },
  { number: "2-1000-1-1", name: "Kanál Stará Gúta", notes: "MO Hurbanovo" },
  { number: "2-1010-1-1", name: "Kanál Vrbová", notes: "MO Hurbanovo" },
  { number: "2-1039-1-1", name: "Klátovské rameno č. 1", notes: "MO Topoľníky" },
  { number: "2-1040-1-1", name: "Klátovské rameno č. 2", notes: "MsO Dunajská Streda" },
  { number: "2-1080-1-1", name: "Kostolník", notes: "MO Stará Turá" },
  { number: "2-1090-1-1", name: "Krupinica č. 1", notes: "MO Šahy" },
  { number: "2-1300-1-1", name: "Melioračný kanál Tvrdonice", notes: "MO Holíč" },
  { number: "2-1370-1-1", name: "Myjava č. 1", notes: "MO Šaštín-Stráže" },
  { number: "2-1380-1-1", name: "Myjava č. 2a", notes: "MsO Senica" },
  { number: "2-1391-1-1", name: "N - kanál", notes: "MO Drahovce" },
  { number: "2-1471-1-1", name: "Obidský kanál", notes: "MO Štúrovo" },
  { number: "2-1481-1-1", name: "Odpadový kanál č. 2 \"Čekr\"", notes: "MO Sekule" },
  { number: "2-1520-1-1", name: "OR Berek", notes: "MsO Nové Zámky" },
  { number: "2-1800-1-1", name: "OR Melečka č. 2", notes: "MO Šoporňa" },
  { number: "2-1950-1-1", name: "OR Trstice", notes: "MsO Dunajská Streda" },
  { number: "2-2040-1-1", name: "Paríž", notes: "MO Štúrovo" },
  { number: "2-2050-1-1", name: "Parná č. 1", notes: "MsO Trnava" },
  { number: "2-2080-1-1", name: "Ižianský kanál č. 1", notes: "MO Marcelová" },
  { number: "2-2090-1-1", name: "Ižianský kanál č. 2", notes: "MO Komárno" },
  { number: "2-2100-1-1", name: "Perec č. 1", notes: "MO Štúrovo" },
  { number: "2-2110-1-1", name: "Perec č. 2", notes: "MO Želiezovce" },
  { number: "2-2120-1-1", name: "Perec č. 3", notes: "MsO Levice" },
  { number: "2-2150-1-1", name: "Preseľanský potok", notes: "MO Šahy" },
  { number: "2-2180-1-1", name: "Radošina č. 1", notes: "MsO Nitra" },
  { number: "2-2190-1-1", name: "Radošina č. 2", notes: "MsO Topoľčany" },
  { number: "2-2650-1-1", name: "Sikenica č. 1", notes: "MO Želiezovce" },
  { number: "2-2660-1-1", name: "Sikenica č. 2", notes: "MsO Levice" },
  { number: "2-2670-1-1", name: "Spojovací kanál Cergát-Váh", notes: "MsO Nové Zámky" },
  { number: "2-2680-1-1", name: "Spojovací kanál Martovce", notes: "MO Hurbanovo" },
  { number: "2-2690-1-1", name: "Stará Nitra č. 1", notes: "MsO Komárno" },
  { number: "2-2700-1-1", name: "Stará Nitra č. 2", notes: "MO Hurbanovo" },
  { number: "2-2710-1-1", name: "Stará Žitava", notes: "MO Šurany" },
  { number: "2-2720-1-1", name: "Striebornica č. 1", notes: "MsO Piešťany" },
  { number: "2-2740-1-1", name: "Svinica č. 1", notes: "MsO Bánovce nad Bebravou" },
  { number: "2-2760-1-1", name: "Štiavnica č. 1", notes: "MO Šahy" },
  { number: "2-5550-1-1", name: "Vojnícky potok", notes: "MO Marcelová" },
  { number: "2-5600-1-1", name: "Žitava č. 1", notes: "MO Hurbanovo" },
  { number: "2-5610-1-1", name: "Žitava č. 2", notes: "MsO Nové Zámky" },
  { number: "2-5620-1-1", name: "Žitava č. 3", notes: "MO Šurany" },
  { number: "2-5630-1-1", name: "Žitava č. 4", notes: "MsO Zlaté Moravce" },
  { number: "2-5650-1-1", name: "Žitava kanál č. 1", notes: "MO Marcelová" },
  { number: "2-5660-1-1", name: "Žitava kanál č. 2", notes: "MsO Komárno" },
  { number: "2-5670-1-1", name: "Žitnoostrovské kanály č. 1", notes: "MsO Komárno" },
  { number: "2-5680-1-1", name: "Žitnoostrovské kanály č. 2", notes: "MO Veľký Meder" },
  { number: "2-5690-1-1", name: "Žitnoostrovské kanály č. 3", notes: "MsO Dunajská Streda" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Štrkoviská
  { number: "2-2930-1-1", name: "Štrkovisko Bendö", notes: "MsO Dunajská Streda" },
  { number: "2-3790-1-1", name: "Štrkovisko Okoč", notes: "MO Veľký Meder" },
  { number: "2-3300-1-1", name: "Štrkovisko Horná Streda č. 1", notes: "MsO Piešťany" },
  { number: "2-3301-1-1", name: "Štrkovisko Horná Streda č. 2", notes: "MsO Piešťany" },
  { number: "2-3302-1-1", name: "Štrkovisko Horná Streda č. 3", notes: "MsO Piešťany" },
  { number: "2-3303-1-1", name: "Štrkovisko Horná Streda č. 4", notes: "MsO Piešťany" },
  { number: "2-4250-1-1", name: "Štrkovisko Záhoň", notes: "MsO Nové Zámky" },
  { number: "2-5605-1-1", name: "Štrkoviská Martovce", notes: "MO Hurbanovo" },
  { number: "2-5606-1-1", name: "MR Martovce", notes: "MO Hurbanovo" },
  
  // ZÁPADOSLOVENSKÁ OBLASŤ - Vodné nádrže
  { number: "2-4730-1-1", name: "VN Haláčovce", notes: "MsO Bánovce nad Bebravou" },
  { number: "2-4870-1-1", name: "VN Kalná nad Hronom", notes: "MsO Levice" },
  { number: "2-4920-1-1", name: "VN Veľké Kozmálovce", notes: "MsO Levice" },
  { number: "2-4930-1-1", name: "VN Kráľová", notes: "SRZ RADA Žilina" },
  { number: "2-4960-1-1", name: "VN Lovce", notes: "MsO Zlaté Moravce" },
  { number: "2-4980-1-1", name: "VN Malé Bedzany", notes: "MO Topoľčany" },
  { number: "2-5020-1-1", name: "VN Matejovec", notes: "MO Stará Turá" },
  { number: "2-5030-1-1", name: "VN Melek", notes: "MsO Zlaté Moravce" },
  { number: "2-5110-1-1", name: "VN Osuské", notes: "MO Senica (vypustená v 2025)" },
  { number: "2-5270-1-1", name: "VN Sĺňava", notes: "SRZ RADA Žilina" },
  { number: "2-5341-1-1", name: "VN Šárovce", notes: "MO Želiezovce" },
  { number: "2-5342-1-1", name: "VN Tekov", notes: "MsO Levice" },
  { number: "2-5420-1-1", name: "VN Turá", notes: "MsO Levice" },
  { number: "2-5470-1-1", name: "VN Veľké Uherce", notes: "MsO Partizánske" },
  { number: "2-4570-1-1", name: "VN Buková", notes: "MsO Trnava" },

  // STREDOSLOVENSKÁ OBLASŤ - Orava a prítoky
  { number: "3-0070-1-1", name: "Biela Orava č. 1a", notes: "MO Námestovo" },
  { number: "3-0071-1-4", name: "Biela Orava č. 1b CHAP", notes: "MO Námestovo" },
  { number: "3-2731-1-1", name: "Orava č. 4", notes: "MO Trstená" },
  
  // STREDOSLOVENSKÁ OBLASŤ - Hron a prítoky
  { number: "3-1050-1-1", name: "Hron č. 4", notes: "MO Nová Baňa" },
  { number: "3-1060-1-1", name: "Hron č. 5", notes: "MO Žarnovica" },
  { number: "3-1070-2-1", name: "Hron č. 6a", notes: "MO Žiar nad Hronom" },
  { number: "3-1080-2-1", name: "Hron č. 7a", notes: "MsO Zvolen" },
  { number: "3-1090-2-1", name: "Hron č. 8", notes: "MsO Banská Bystrica" },
  { number: "3-1112-2-1", name: "Hron č. 9c", notes: "MsO Banská Bystrica" },
  
  // STREDOSLOVENSKÁ OBLASŤ - Ipeľ
  { number: "3-1250-1-1", name: "Ipeľ č. 4", notes: "MO Veľký Krtíš" },
  { number: "3-1260-1-1", name: "Ipeľ č. 5", notes: "MsO Lučenec" },
  { number: "3-1270-1-1", name: "Ipeľ č. 6", notes: "MsO Lučenec" },
  
  // STREDOSLOVENSKÁ OBLASŤ - Váh a prítoky
  { number: "3-0660-2-1", name: "Derivačný kanál Váhu", notes: "MsO Martin" },
  { number: "3-1030-1-1", name: "Hričovský kanál č. 2b", notes: "MO Bytča" },
  { number: "3-1031-1-1", name: "Hričovský kanál č. 2a", notes: "MO Bytča" },
  { number: "3-1040-1-1", name: "Hričovský kanál č. 1", notes: "MsO Považská Bystrica" },
  { number: "3-1830-2-1", name: "Kysuca č. 1", notes: "MsO Žilina" },
  { number: "3-1840-2-1", name: "Kysuca č. 2a", notes: "MO Kysucké Nové Mesto" },
  { number: "3-1841-2-4", name: "Kysuca č. 2b CHAP", notes: "MO Kysucké Nové Mesto" },
  { number: "3-1850-1-1", name: "Kysuca č. 3", notes: "MO Čadca" },
  { number: "3-2520-1-1", name: "Nosicko - Kočkovský kanál", notes: "MsO Púchov" },
  { number: "3-2530-1-1", name: "Nosický kanál č. 9", notes: "MsO Dubnica nad Váhom" },
  { number: "3-4570-1-1", name: "Váh č. 9", notes: "MO Dubnica nad Váhom" },
  { number: "3-4580-2-1", name: "Váh č. 10", notes: "MsO Púchov" },
  { number: "3-4600-1-1", name: "Váh č. 11", notes: "MsO Považská Bystrica" },
  { number: "3-4610-1-1", name: "Váh č. 12", notes: "MO Bytča" },
  { number: "3-4620-2-1", name: "Váh č. 13", notes: "MsO Žilina" },
  { number: "3-4630-2-1", name: "Váh č. 14", notes: "MsO Žilina" },
  { number: "3-4670-2-1", name: "Váh č. 17a", notes: "MsO Martin" },
  { number: "3-4671-2-4", name: "Váh č. 17b CHAP", notes: "MsO Martin" },
  
  // STREDOSLOVENSKÁ OBLASŤ - Nitra a prítoky
  { number: "3-0850-1-1", name: "Handlovka č. 1", notes: "MsO Prievidza" },
  { number: "3-2440-1-1", name: "Nitra č. 6a", notes: "MsO Prievidza" },
  
  // STREDOSLOVENSKÁ OBLASŤ - Ostatné vodné toky
  { number: "3-0200-1-1", name: "Blh č. 1", notes: "MsO Rimavská Sobota" },
  { number: "3-1770-1-1", name: "Krupinica č. 2", notes: "MO Krupina" },
  { number: "3-1390-1-1", name: "Rychnavské vodné nádrže", notes: "MO Banská Štiavnica" },
  { number: "3-2200-1-1", name: "Marikovský potok č. 1", notes: "MsO Považská Bystrica" },
  { number: "3-2350-1-1", name: "Muráň č. 1", notes: "MO Jelšava" },
  { number: "3-3250-1-1", name: "Rimava č. 1", notes: "MO Tornaľa" },
  { number: "3-3260-1-1", name: "Rimava č. 2", notes: "MsO Rimavská Sobota" },
  { number: "3-3730-1-4", name: "Slaná č. 1 CHAP", notes: "MO Tornaľa" },
  { number: "3-3740-1-1", name: "Slatina č. 1", notes: "MsO Zvolen" },
  { number: "3-3970-1-1", name: "Štiavnica č. 2", notes: "MO Krupina" },
  { number: "3-4510-1-1", name: "Turiec č. 2", notes: "MO Tisovec" },
  { number: "3-4520-1-1", name: "Turiec č. 1", notes: "MO Tornaľa" },
  { number: "3-6060-1-1", name: "Východný Turiec č. 1", notes: "MO Tornaľa" },
  
  // STREDOSLOVENSKÁ OBLASŤ - Štrkoviská
  { number: "3-4100-1-1", name: "Štrkovisko Dubnička", notes: "MsO Dubnica nad Váhom" },
  { number: "3-4240-1-1", name: "Štrkovisko Turiansky most", notes: "MsO Martin" },
  
  // STREDOSLOVENSKÁ OBLASŤ - Vodné nádrže
  { number: "3-0950-1-1", name: "VN Hodruša", notes: "MO Žarnovica" },
  { number: "3-5090-1-1", name: "VN Hričov", notes: "MsO Žilina" },
  { number: "3-5240-1-1", name: "VN Krpeľany", notes: "SRZ RADA Žilina" },
  { number: "3-5340-1-1", name: "VN Liptovská Mara", notes: "SRZ RADA Žilina" },
  { number: "3-5290-1-1", name: "VN Ľadovo", notes: "MsO Lučenec" },
  { number: "3-5400-1-1", name: "VN Mikšová", notes: "MO Bytča" },
  { number: "3-5470-1-1", name: "VN Nitrianske Rudno", notes: "MsO Prievidza" },
  { number: "3-5480-1-1", name: "VN Nosice", notes: "SRZ RADA Žilina" },
  { number: "3-5530-1-1", name: "VN Orava", notes: "SRZ RADA Žilina" },
  { number: "3-5700-1-1", name: "VN Ružiná", notes: "SRZ RADA Žilina" },
  { number: "3-5850-1-1", name: "VN Teplý Vrch", notes: "SRZ RADA Žilina" },
  { number: "3-6010-1-1", name: "VN Žilina", notes: "SRZ RADA Žilina" },
  { number: "3-6050-1-1", name: "VVN Tvrdošín", notes: "MO Trstená" },

  // VÝCHODOSLOVENSKÁ OBLASŤ - Bodrog a Bodva
  { number: "4-0071-1-1", name: "Berecký prívodný kanál", notes: "MO Kráľovský Chlmec" },
  { number: "4-0140-1-1", name: "Bodrog č. 1a", notes: "MO Streda nad Bodrogom" },
  { number: "4-0141-1-1", name: "Bodrog č. 1b", notes: "MO Streda nad Bodrogom" },
  { number: "4-0150-1-1", name: "Bodva č. 1", notes: "MO Moldava nad Bodvou" },
  { number: "4-0160-1-1", name: "Bodva č. 2", notes: "MO Moldava nad Bodvou" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Hornád a prítoky
  { number: "4-0630-1-1", name: "Hornád č. 1a", notes: "MsO Košice" },
  { number: "4-0631-1-1", name: "Hornád č. 1b", notes: "MsO Košice" },
  { number: "4-0650-1-1", name: "Hornád č. 3", notes: "MO Krompachy" },
  { number: "4-0660-1-1", name: "Hornád č. 4", notes: "MO Spišská Nová Ves" },
  { number: "4-0550-1-1", name: "Hnilec č. 1", notes: "MO Gelnica" },
  { number: "4-0750-1-1", name: "Ida č. 1", notes: "MO Moldava nad Bodvou" },
  { number: "4-2890-1-1", name: "Torysa č. 1", notes: "MsO Košice" },
  { number: "4-2900-1-1", name: "Torysa č. 2", notes: "MsO Prešov" },
  { number: "4-2901-1-4", name: "Torysa č. 2a CHAP", notes: "MsO Prešov" },
  { number: "4-2910-1-1", name: "Torysa č. 3", notes: "MO Sabinov" },
  { number: "4-1610-1-1", name: "Olšava č. 1", notes: "MsO Košice" },
  { number: "4-1500-1-1", name: "Myslavský potok", notes: "MsO Košice" },
  { number: "4-2400-1-1", name: "Sokoľanský potok", notes: "MsO Košice" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Laborec a prítoky
  { number: "4-1120-1-1", name: "Laborec č. 1", notes: "MO Veľké Kapušany" },
  { number: "4-1121-1-1", name: "OR Drahňovský les", notes: "MO Veľké Kapušany" },
  { number: "4-1122-1-1", name: "OR Lykotex", notes: "MO Veľké Kapušany" },
  { number: "4-1130-1-1", name: "Laborec č. 2", notes: "MsO Michalovce" },
  { number: "4-1140-1-1", name: "Laborec č. 3", notes: "MsO Humenné" },
  { number: "4-1150-1-1", name: "Laborec č. 4", notes: "MO Medzilaborce" },
  { number: "4-0260-1-1", name: "Cirocha č. 1a", notes: "MO Snina" },
  { number: "4-1880-1-1", name: "Pčolinka č. 1", notes: "MO Snina" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Latorica
  { number: "4-1180-1-1", name: "Latorica č. 1", notes: "MO Trebišov" },
  { number: "4-1190-1-1", name: "Latorica č. 2", notes: "MO Kráľovský Chlmec" },
  { number: "4-1200-1-1", name: "Latorica č. 3", notes: "MO Veľké Kapušany" },
  { number: "4-1201-1-1", name: "OR Berkeš", notes: "MO Veľké Kapušany" },
  { number: "4-1204-1-1", name: "OR Papokmulató", notes: "MO Veľké Kapušany" },
  { number: "4-1210-1-1", name: "Latorica č. 4", notes: "MO Čierna nad Tisou" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Ondava a prítoky
  { number: "4-1650-1-1", name: "Ondava č. 1", notes: "MO Trebišov" },
  { number: "4-1660-1-1", name: "Ondava č. 2a", notes: "MO Vranov nad Topľou" },
  { number: "4-1661-1-4", name: "Ondava č. 2b CHAP", notes: "MO Vranov nad Topľou" },
  { number: "4-1680-1-1", name: "Ondava č. 4", notes: "MO Stropkov" },
  { number: "4-1690-1-1", name: "Ondava č. 5", notes: "MO Svidník" },
  { number: "4-1710-1-1", name: "Ondavka č. 1", notes: "MO Vranov nad Topľou" },
  { number: "4-1580-1-1", name: "Oľka č. 1", notes: "MO Vranov nad Topľou" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Topľa a prítoky
  { number: "4-2810-1-1", name: "Topľa č. 1", notes: "MO Trebišov" },
  { number: "4-2820-1-1", name: "Topľa č. 2", notes: "MO Vranov nad Topľou" },
  { number: "4-2830-1-1", name: "Topľa č. 3", notes: "MO Hanušovce nad Topľou" },
  { number: "4-2840-1-1", name: "Topľa č. 4", notes: "MO Giraltovce" },
  { number: "4-2850-1-1", name: "Topľa č. 5a", notes: "MO Bardejov" },
  { number: "4-2851-1-1", name: "Topľa č. 5b", notes: "MO Bardejov" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Poprad
  { number: "4-1951-2-1", name: "Poprad č. 2b", notes: "MO Orlov" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Uh
  { number: "4-3050-1-1", name: "Uh č. 1", notes: "MO Veľké Kapušany" },
  { number: "4-3060-1-1", name: "Uh č. 2", notes: "MO Veľké Kapušany" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Ostatné vodné toky
  { number: "4-0200-1-1", name: "Brusník", notes: "MO Spišská Nová Ves" },
  { number: "4-0330-1-1", name: "Čierna voda", notes: "MsO Michalovce" },
  { number: "4-0440-1-1", name: "Duša", notes: "MsO Michalovce" },
  { number: "4-1220-1-1", name: "Levočský potok č. 1", notes: "MO Spišská Nová Ves" },
  { number: "4-1230-1-1", name: "Levočský potok č. 2", notes: "MO Levoča" },
  { number: "4-1560-1-1", name: "Okna č. 1a", notes: "MsO Michalovce" },
  { number: "4-2060-1-1", name: "Radomka", notes: "MO Giraltovce" },
  { number: "4-2120-1-1", name: "Roňava č. 1", notes: "MO Trebišov" },
  { number: "4-2130-1-1", name: "Roňava č. 2", notes: "MO Trebišov" },
  { number: "4-2240-1-1", name: "Sekčov č. 1", notes: "MsO Prešov" },
  { number: "4-2270-2-4", name: "Slaná č. 2a CHAP", notes: "MsO Rožňava" },
  { number: "4-2380-1-1", name: "Sobranecký potok č. 1", notes: "MsO Michalovce" },
  { number: "4-2390-1-1", name: "Sobranecký potok č. 2", notes: "MsO Michalovce" },
  { number: "4-2401-1-1", name: "Somotorský kanál", notes: "MO Kráľovský Chlmec" },
  { number: "4-2800-1-1", name: "Tisa", notes: "MO Čierna nad Tisou" },
  { number: "4-2970-1-1", name: "Trnávka č. 1", notes: "MO Trebišov" },
  { number: "4-2980-1-1", name: "Trnávka č. 2", notes: "MO Sečovce" },
  { number: "4-2990-1-1", name: "Turňa č. 1", notes: "MO Moldava nad Bodvou" },
  { number: "4-4090-1-1", name: "Vrbovský potok", notes: "MO Kežmarok" },
  { number: "4-4140-1-1", name: "Výpustný kanál VN Zemplínska Šírava", notes: "MsO Michalovce" },
  
  // VÝCHODOSLOVENSKÁ OBLASŤ - Vodné nádrže a štrkoviská
  { number: "4-2680-1-1", name: "Štrkovisko Kechnec", notes: "MsO Košice" },
  { number: "4-3880-1-1", name: "Karcsa", notes: "MO Kráľovský Chlmec" },
  { number: "4-3330-1-1", name: "VN Domaša", notes: "SRZ RADA Žilina" },
  { number: "4-3750-1-1", name: "VN Ružín", notes: "SRZ RADA Žilina" },
  { number: "4-4030-1-4", name: "VN Zemplínska Šírava CHAP", notes: "SRZ RADA Žilina" },
  { number: "4-4110-1-1", name: "VVN Domaša", notes: "MO Vranov nad Topľou" },
  { number: "4-4120-1-1", name: "VVN Ružín", notes: "MsO Košice" },
];

async function importFishingAreas() {
  console.log(`Starting import of ${fishingAreasData.length} fishing areas...`);
  
  try {
    for (const area of fishingAreasData) {
      await db.insert(fishingAreas).values(area);
    }
    
    console.log(`Successfully imported ${fishingAreasData.length} fishing areas!`);
  } catch (error) {
    console.error("Error importing fishing areas:", error);
    throw error;
  }
}

importFishingAreas()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
