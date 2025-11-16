import { db } from "../db";
import { baitManufacturers, baitProductLines, baitFlavors } from "@shared/schema";

interface ParsedBait {
  manufacturerName: string;
  productLines: {
    name: string;
    flavors: string[];
  }[];
}

const BAIT_DATA: ParsedBait[] = [
  {
    manufacturerName: "Mikbaits",
    productLines: [
      { name: "GANGSTER", flavors: ["G2 - Krab / Ančovička / Asa", "G20 – Enigma", "GSP – Black Squid"] },
      { name: "FANATICA", flavors: ["Meteora", "Koi", "Losos Ráček Asa"] },
      { name: "LIVERIX", flavors: ["Mazaná Škeble", "Královská patentka", "Magická Oliheň"] },
      { name: "Krvavý Huňáček", flavors: ["Jahoda exclusive", "Krab Sardinka", "Švestka Oliheň"] },
      { name: "X-class", flavors: ["Oliheň", "Robin red", "Monster Crab", "Krill"] },
      { name: "R-class", flavors: ["Oliheň", "Robin red", "Monster Crab", "Krill"] },
      { name: "SPICEMAN", flavors: ["Chilli Squid", "Pampeliška", "Pikantní Švestka", "WS1 Citrus", "WS2 Spice", "WS3 Crab Butyric"] },
      { name: "BIG", flavors: ["BigB - Broskev / Black Pepper", "BigC – Cheeseburger"] },
      { name: "MANIAQ", flavors: ["NutraKrill", "Slaneček"] },
      { name: "CHILLI CHIPS", flavors: ["Chilli Banana", "Chilli Jahoda", "Chilli Mango", "Chilli Scopex", "Chilli Frankfurt", "Chilli Anchovy"] },
      { name: "EXPRESS", flavors: ["Sladká Kukuřice", "Oliheň", "Monster Crab", "Ananas N-BA", "Česnek", "Mandarinka", "Pulnoční pomeranč"] }
    ]
  },
  {
    manufacturerName: "Jet Fish",
    productLines: [
      { name: "LEGEND RANGE", flavors: ["Biokrill", "Biosquid", "Biocrab", "Bioenzym fish (Losos / Asafoetida)", "Žlutý impuls (Ořech / Javor)", "Rak & GLM", "Kořenený tuňák (Broskev)", "Robin Red (Brusinka)", "Protein Bird", "Fermentovaná ančovička", "Játra / Ananás – N – butyric", "Chilli Tuna", "Seafood Švestka-Česnek", "Banán - Chilli"] },
      { name: "SUPRA FISH", flavors: ["Oliheň", "Squid / Scopex", "Chilli / Krill", "Krab / Česnek"] },
      { name: "PREMIUM CLASSIC", flavors: ["Jahoda / Brusinka", "X - SPICE", "Mango / Meruňka", "Chilli / Česnek", "Cream / Scopex", "Biocrab / Losos", "Švestka / Česnek", "Squid / Krill"] },
      { name: "MYSTERY", flavors: ["Jahoda / Moruše", "Krill / Sépie", "Squid / Spice", "Krill / Krab"] }
    ]
  },
  {
    manufacturerName: "LK Baits",
    productLines: [
      { name: "TOP RESTART", flavors: ["Pepperin", "Purple Plum", "Black Protein", "Sea Food"] },
      { name: "RESTART", flavors: ["Ice Vanilla", "Wild Strawberry", "Compot NHDC", "Mussel"] },
      { name: "DUO X-Tra", flavors: ["Nutric Acid/Pineapple", "Sea Food/Compot NHDC", "Wild Strawberry/Carp Secret"] },
      { name: "NUTRIC ACID", flavors: ["Pineapple", "Caviar", "Compot NHDC"] },
      { name: "Lukáš Krása", flavors: ["Black Protein", "Nutric Acid", "World Record Carp Corn"] },
      { name: "EURO ECONOMIC", flavors: ["Spice Shrimp", "Popcorn", "G-8 Pineapple", "Chilli Squid", "Fruitberry", "Mullberry RH / Garlic"] }
    ]
  },
  {
    manufacturerName: "Starbaits",
    productLines: [
      { name: "PERFORMANCE CONCEPT", flavors: ["SK30", "Hot Demon", "Omega Fish", "GLM Marine", "Signal", "Red Liver", "Spicy Salmon", "Hold Up Fermented Shrimp", "Crayzi Fruit"] },
      { name: "PROBIOTIC", flavors: ["Pro Peach Mango", "Scopex Krill", "Probiotic Red One", "Pro Monster Crab", "Pro Banana Nut", "Pro Blackberry"] },
      { name: "Grab&Go", flavors: ["Strawberry Jam", "Spice", "Scopex", "Sweet Corn", "Banana Cream", "Pineapple", "Whisky Cola"] }
    ]
  },
  {
    manufacturerName: "Nikl (Karel Nikl)",
    productLines: [
      { name: "READY (Hotové boilies)", flavors: ["Krill", "3XL", "Gigantica", "KrillBerry", "Kill Krill", "Devill Krill", "Devill Krill Attractive", "Strawberry", "Giga Squid", "Crab", "Chilli & Peach", "Scopex Squid"] },
      { name: "Economic Feed Boilie", flavors: ["Chilli - Spice", "Squid", "Rape Cloud", "Strawberry"] }
    ]
  },
  {
    manufacturerName: "Kimot No Respect",
    productLines: [
      { name: "Trvanlivé boilies", flavors: ["Crayfish Krill", "Slávička", "Ananás", "Slivka", "Tygrí orech", "Jahoda", "Black Jack", "Dead Sea", "Houmr", "Americano", "Citrus Squid", "RH"] },
      { name: "Krmné boilies", flavors: ["Pikant", "RR", "Speedy", "Crab", "Švestka", "Oliheň"] }
    ]
  },
  {
    manufacturerName: "Dr. Baits",
    productLines: [
      { name: "TOP LINE", flavors: ["Ocean Protein", "Fresh Octopus", "Big Black Crab", "Spice Krill Strawberry", "Green Pearl", "Squid Salmon", "Orange Fire"] },
      { name: "ATTRACT LINE", flavors: ["Big Black Crab", "Spice Krill Strawberry", "Green Pearl", "Squid Salmon", "Orange Fire"] }
    ]
  },
  {
    manufacturerName: "Mivardi",
    productLines: [
      { name: "RAPID CHAMPION PLATINUM", flavors: ["B17", "Sea", "Crazy Liver"] },
      { name: "RAPID EXCELLENT", flavors: ["Kaprí Guláš", "Monster Crab", "Kráľovská Slivka"] },
      { name: "RAPID EASY CATCH", flavors: ["Easy", "Starter", "Multi Mix"] }
    ]
  },
  {
    manufacturerName: "Pirko Baits",
    productLines: [
      { name: "GLM MIX", flavors: ["Mušľa", "Krab", "Patentka", "Marhuľa Mango"] },
      { name: "ROBIN RED", flavors: ["Pikantný Kalamár", "Moruša", "Chilli", "Sushi"] },
      { name: "FOUR FISH MIX", flavors: ["Halibut Cesnak", "Rak", "Pečeň Korenie", "Jahoda"] },
      { name: "MARINE MIX", flavors: ["Chobotnica Čierna ríbezľa", "Makrela Korenie", "Kalamár Chobotnica", "Losos"] },
      { name: "NUT BASE MIX", flavors: ["Kokos Krill", "Banán Biela čokoláda", "Škorica", "Javor"] }
    ]
  },
  {
    manufacturerName: "TB Baits",
    productLines: [
      { name: "Trvanlivé Boilies", flavors: ["Spice Shrimp", "Strawberry", "Monster Crab", "Peach Liver", "Amur"] },
      { name: "Trvanlivé Boilies EXTRA", flavors: ["GLM Squid Strawberry", "Garlic Liver", "Orient Shrimp", "Red Crab"] }
    ]
  },
  {
    manufacturerName: "Carp Inferno",
    productLines: [
      { name: "HOT LINE", flavors: ["Beta", "Medúza", "Škorpion", "Red Demon", "Xtazi"] },
      { name: "NUTRA LINE", flavors: ["Mango Losos", "Ananás Krill", "Višeň Chilli", "Chobotnice Pikant", "Banán Oliheň", "Jogurtová Jahoda", "Švestka"] },
      { name: "LIGHT LINE", flavors: ["Brusinka Chobotnice", "Banán", "Krab Oliheň", "Moruše"] }
    ]
  },
  {
    manufacturerName: "Carpsonbaits",
    productLines: [
      { name: "Trvanlivé boilies", flavors: ["CB1", "CB2", "CB3", "CB4", "CB5", "ZERO", "CHILL"] }
    ]
  },
  {
    manufacturerName: "Freefish",
    productLines: [
      { name: "Trvanlivé boilies", flavors: ["Tuňák / Kaviár", "Ostrý zimní losos / Ledový šok", "Total natural / Červ", "Kořeněný smraďoch", "Kreveta / Šveska", "Ocean master", "Milk shake", "Krill / Seafood", "Chilli / Lesní jahoda"] }
    ]
  },
  {
    manufacturerName: "Garant Baits",
    productLines: [
      { name: "GREEN line", flavors: ["GLM Mušľa", "Hotberry"] },
      { name: "RED line", flavors: ["Acid Plum", "Monster Crab", "Halibut Losos Chilli", "Pečeň Scopex"] },
      { name: "BROWN line", flavors: ["Atlantic Fish", "Fat Boy", "Fruity Shrimp", "Patentka Kaviár"] },
      { name: "BLACK line", flavors: ["Krab / Krill", "Royal Squid"] }
    ]
  },
  {
    manufacturerName: "Orthodoxcarp",
    productLines: [
      { name: "Trvanlivé boilies", flavors: ["Atlantída", "Golem", "Goral", "Jahoda Mango Chilli", "Joint", "Lagúna", "Tropic fish", "Vulcan"] }
    ]
  },
  {
    manufacturerName: "Squat Carp",
    productLines: [
      { name: "Trvanlivé boilies", flavors: ["Calanus", "Anchovy+", "Bloody Mulberry", "Big Boss", "Hero Krill", "The Crab", "Proper Feed"] }
    ]
  },
  {
    manufacturerName: "Karma Baits",
    productLines: [
      { name: "Top Bait", flavors: ["PinPeach", "Chili Calamar", "Joe Cream", "Liver & Pink Pepper", "Red Krill", "Red Nubia", "SquidBerry Black Pepper", "Stinker Fish"] },
      { name: "Special All Round Boilies", flavors: ["PinPeach", "4Fruit", "Chili Calamar", "Joe Cream", "Liver & Pink Pepper", "Red Krill", "Red Nubia", "SquidBerry Black Pepper", "Stinker Fish"] }
    ]
  },
  {
    manufacturerName: "Dudi Bait",
    productLines: [
      { name: "Trvanlivé boilies", flavors: ["Forest Squid", "Mister Red Super Hot", "Mister Dudi", "Tigernuts Amur"] }
    ]
  },
  {
    manufacturerName: "Speedy Baits",
    productLines: [
      { name: "Excellent", flavors: ["GLM Pečeň", "Krill", "Hawai Chilli", "Korenistá pečeň", "Losos Broskyňa", "Squid"] }
    ]
  },
  {
    manufacturerName: "Carp Servis Václavík",
    productLines: [
      { name: "Boss2 MAGIC", flavors: ["Pikanter", "Slunečnice", "Mořská panna"] },
      { name: "Boss2", flavors: ["Anštajn", "Jahoda", "Mango", "Randal", "Satan"] },
      { name: "Boss2 Speciál", flavors: ["Dory", "Vanilka", "Mrtvola", "Mrtvý Korýš", "Oliheň A1", "Přírodní Játra", "Brusinka"] }
    ]
  },
  {
    manufacturerName: "Gula Carp",
    productLines: [
      { name: "Exclusive", flavors: ["Klobása", "Mušľa / GLM", "Krab Chilli", "Krab Ovocie", "Red Fish", "Squid Octopus", "Krill Spice", "Amur", "Jahoda", "Mrhuľa", "Monster Crab", "Scopex Oliheň", "Sladká Kukurica"] }
    ]
  },
  {
    manufacturerName: "Chytil",
    productLines: [
      { name: "Trvanlivé boilies", flavors: ["BaBuLi", "Ichigo Hotto", "Krill Max", "Scopex / Squid", "Apač Indian Spice", "Skunk", "Kořeňený tuňák Česnek / ASA-foetida", "Famózní Švestka", "Chiméra Red"] },
      { name: "Master Carp Boilies", flavors: ["Med", "Česnek", "Kukuřice", "Halibut", "Jahoda", "Scopex", "Carp Killer", "Robin Red", "Nahnilý Krab", "Amur"] }
    ]
  }
];

async function importBaits() {
  console.log("Starting bait import...");

  const parsedBaits = BAIT_DATA;
  console.log(`Processing ${parsedBaits.length} manufacturers`);

  for (const bait of parsedBaits) {
    console.log(`Importing ${bait.manufacturerName}...`);

    // Insert manufacturer
    const [manufacturer] = await db
      .insert(baitManufacturers)
      .values({ name: bait.manufacturerName })
      .onConflictDoNothing()
      .returning();

    if (!manufacturer) {
      console.log(`  - Manufacturer ${bait.manufacturerName} already exists, skipping...`);
      // Get existing manufacturer
      const existing = await db
        .select()
        .from(baitManufacturers)
        .where((t) => t.name === bait.manufacturerName)
        .limit(1);
      
      if (existing.length === 0) {
        console.error(`  - Could not find manufacturer ${bait.manufacturerName}`);
        continue;
      }
      
      continue; // Skip to next manufacturer
    }

    // Insert product lines and flavors
    for (const productLine of bait.productLines) {
      const [insertedProductLine] = await db
        .insert(baitProductLines)
        .values({
          manufacturerId: manufacturer.id,
          name: productLine.name,
        })
        .returning();

      console.log(`  - Added product line: ${productLine.name}`);

      // Insert flavors
      for (const flavor of productLine.flavors) {
        await db.insert(baitFlavors).values({
          productLineId: insertedProductLine.id,
          name: flavor,
        });
      }

      console.log(`    - Added ${productLine.flavors.length} flavors`);
    }
  }

  console.log("Import completed!");
}

// Run import
importBaits()
  .then(() => {
    console.log("Success!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
