// Fish type mapping for the fishing diary
// All fish species from "Rybársky poriadok - Lovné miery" with official names

// Official fish types to show in dropdown (no duplicates)
export const officialFishTypes = {
  // Official names from Lovné miery 2025
  amur_biely: "Amur biely",
  amur_cierny: "Amur čierny",
  bolen_dravy: "Boleň dravý",
  hlavatka_podunajska: "Hlavátka podunajská",
  jalec_hlavaty: "Jalec hlavatý",
  jalec_malousty: "Jalec maloústy",
  jalec_tmavy: "Jalec tmavý",
  jeseter_maly: "Jeseter malý",
  jeseter_sibirsky: "Jeseter sibírsky",
  kapor_supinac: "Kapor rybničný (šupináč)",
  kapor_lysec: "Kapor rybničný (lysec)",
  lien_sliznaty: "Lieň sliznatý",
  lipen_tymianovy: "Lipeň tymianový",
  mien_sladkovodny: "Mieň sladkovodný",
  mrena_severna: "Mrena severná",
  nosal_stahovavy: "Nosáľ sťahovavý",
  pleskac_siny: "Pleskáč siný",
  pleskac_tuponosy: "Pleskáč tuponosý",
  pleskac_vysoky: "Pleskáč vysoký",
  podustva_severna: "Podustva severná",
  pstruh_duhovy: "Pstruh dúhový",
  pstruh_jazerny: "Pstruh jazerný",
  pstruh_potocny: "Pstruh potočný",
  sih_peled: "Sih peleď",
  sivon_potocny: "Sivoň potočný",
  sumec_velky: "Sumec veľký",
  stuka_severna: "Šťuka severná",
  tolstolobik: "Tolstolobik",
  uhor_europsky: "Úhor európsky",
  zubac_velkousty: "Zubáč veľkoústy",
  zubac_volzsky: "Zubáč volžský",
  // Additional common species
  karas: "Karas",
  plotica: "Plotica",
  ostriez: "Ostriež",
  iny: "Iný druh"
} as const;

// Legacy alias map - maps old codes to official codes (for backward compatibility)
// These are NOT shown in dropdown, but used to resolve existing data
export const legacyAliasMap: Record<string, keyof typeof officialFishTypes> = {
  kapor_rybnicny: "kapor_supinac",
  amur: "amur_biely",
  sumec: "sumec_velky",
  zubac: "zubac_velkousty",
  stuka: "stuka_severna",
  pleskac: "pleskac_vysoky",
  podustva: "podustva_severna",
  mrena: "mrena_severna",
  pstruh: "pstruh_potocny",
  jalec: "jalec_hlavaty",
  zubac_zubatovity: "zubac_volzsky",
  ostretus: "jeseter_maly",
  bream: "pleskac_vysoky",
  other: "iny"
};

// Combined mapping for label lookup (includes both official and legacy)
export const fishTypeMapping = {
  ...officialFishTypes,
  // Legacy entries with their own labels for display of existing data
  amur: "Amur biely",
  sumec: "Sumec veľký",
  zubac: "Zubáč veľkoústy",
  stuka: "Šťuka severná",
  pleskac: "Pleskáč vysoký",
  podustva: "Podustva severná",
  mrena: "Mrena severná",
  pstruh: "Pstruh potočný",
  jalec: "Jalec hlavatý",
  zubac_zubatovity: "Zubáč volžský",
  ostretus: "Jeseter malý",
  bream: "Pleskáč vysoký",
  other: "Iný druh"
} as const;

export type FishType = keyof typeof fishTypeMapping;
export type OfficialFishType = keyof typeof officialFishTypes;

// Priority fish lists for each fishing style (from onboarding preferences)
// Keys match the preferences.fishingStyle values from user schema: "carp", "spinning", "feeder", "fly", "catfish"
export const fishPrioritiesByStyle: Record<string, OfficialFishType[]> = {
  carp: [
    "kapor_supinac",
    "kapor_lysec",
    "amur_biely",
    "pleskac_vysoky",
    "jalec_hlavaty",
    "mrena_severna",
    "nosal_stahovavy",
    "podustva_severna"
  ],
  spinning: [
    "stuka_severna",
    "zubac_velkousty",
    "bolen_dravy",
    "zubac_volzsky",
    "sumec_velky",
    "hlavatka_podunajska"
  ],
  fly: [
    "pstruh_potocny",
    "pstruh_duhovy",
    "lipen_tymianovy",
    "pstruh_jazerny",
    "sivon_potocny",
    "hlavatka_podunajska"
  ],
  feeder: [
    "pleskac_vysoky",
    "mrena_severna",
    "podustva_severna",
    "kapor_supinac",
    "lien_sliznaty",
    "jalec_hlavaty"
  ],
  catfish: [
    "sumec_velky",
    "zubac_velkousty",
    "stuka_severna"
  ]
};

// Helper function to get display label for fish type (works for both official and legacy codes)
export function getFishTypeLabel(fishType: string): string {
  return fishTypeMapping[fishType as FishType] || fishType;
}

// Get all OFFICIAL fish type options for forms (alphabetically sorted, no legacy duplicates)
export function getFishTypeOptions() {
  return Object.entries(officialFishTypes)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'sk'));
}

// Get personalized fish type options based on user's fishing style
export function getPersonalizedFishTypeOptions(fishingStyle?: string | null) {
  const allOptions = getFishTypeOptions();
  
  if (!fishingStyle || !fishPrioritiesByStyle[fishingStyle]) {
    return allOptions;
  }
  
  const priorityFish = fishPrioritiesByStyle[fishingStyle];
  const prioritySet = new Set(priorityFish as string[]);
  
  // Separate priority fish and others
  const priorityOptions = priorityFish
    .filter(fish => officialFishTypes[fish])
    .map(fish => ({
      value: fish,
      label: officialFishTypes[fish]
    }));
  
  const otherOptions = allOptions
    .filter(opt => !prioritySet.has(opt.value))
    .sort((a, b) => a.label.localeCompare(b.label, 'sk'));
  
  return { priorityOptions, otherOptions };
}

// Get all fish type keys for schema validation (includes legacy for backward compatibility)
export function getAllFishTypeKeys(): FishType[] {
  return Object.keys(fishTypeMapping) as FishType[];
}

// Resolve legacy fish type to official type (for migrations or normalization)
export function resolveLegacyFishType(fishType: string): string {
  return legacyAliasMap[fishType] || fishType;
}
