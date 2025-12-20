// Fish type mapping for the fishing diary
// Organized by fishing technique: kaprárina, prívlač, muškárenie, feeder, sumčiarina
export const fishTypeMapping = {
  // Kaprárina
  kapor_supinac: "Kapor šupináč",
  kapor_lysec: "Kapor lysec", 
  amur: "Amur biely",
  pleskac: "Pleskáč vysoký",
  karas: "Karas",
  lieň: "Lieň",
  
  // Prívlač
  stuka: "Šťuka",
  zubac: "Zubáč",
  bolen: "Boleň",
  ostriez: "Ostriež",
  
  // Muškárenie
  pstruh_potocny: "Pstruh potočný",
  pstruh_duhovy: "Pstruh dúhový",
  lipeni: "Lipeň",
  hlavatka: "Hlavátka",
  podustva: "Podustva",
  jalec: "Jalec",
  
  // Sumčiarina
  sumec: "Sumec",
  
  // Feeder / Ostatné
  mrena: "Mrena",
  plotica: "Plotica",
  uhor: "Úhor",
  kapor_rybnicny: "Kapor rybničný"
} as const;

export type FishType = keyof typeof fishTypeMapping;

// Helper function to get display label for fish type
export function getFishTypeLabel(fishType: string): string {
  return fishTypeMapping[fishType as FishType] || fishType;
}

// Get all fish type options for forms
export function getFishTypeOptions() {
  return Object.entries(fishTypeMapping).map(([value, label]) => ({
    value,
    label
  }));
}