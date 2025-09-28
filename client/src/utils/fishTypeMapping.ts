// Fish type mapping for the fishing diary
export const fishTypeMapping = {
  kapor_supinac: "Kapor - šupináč",
  kapor_lysec: "Kapor - lysec", 
  amur: "Amur",
  sumec: "Sumec",
  zubac: "Zubáč",
  stuka: "Šťuka",
  pleskac: "Pleskáč",
  podustva: "Podustva",
  mrena: "Mrena",
  pstruh: "Pstruh",
  jalec: "Jalec"
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