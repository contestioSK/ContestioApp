import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format sector place display consistently
export function formatSectorPlace(team: { sectorName?: string | null; placeName?: string | null; sector?: string | null }) {
  // If we have both sectorName and placeName, use the new format
  if (team.sectorName && team.placeName) {
    return `${team.sectorName} - ${team.placeName}`;
  }
  
  // If we have only sectorName, show just that
  if (team.sectorName) {
    return team.sectorName;
  }
  
  // Fall back to legacy sector format
  if (team.sector) {
    return `Sektor ${team.sector}`;
  }
  
  return null;
}

// Get sector letter for legacy compatibility and styling
export function getSectorLetter(team: { sectorName?: string | null; placeName?: string | null; sector?: string | null }) {
  // Extract letter from sectorName (e.g., "Sektor A" -> "A")
  if (team.sectorName) {
    const match = team.sectorName.match(/Sektor\s+([A-Z])/);
    return match ? match[1] : team.sectorName;
  }
  
  // Fall back to legacy sector
  return team.sector || null;
}

// Side competitions mapping utility
export function getSideCompetitionLabel(id: string): string {
  const sideCompetitionLabels: Record<string, string> = {
    "big-fish-overall": "Najväčší úlovok súťaže",
    "big-common-carp": "Najväčší šupináč",
    "big-mirror-carp": "Najväčší lysec",
    "first-catch": "Prvá ryba súťaže",
    "last-catch": "Posledná ryba súťaže",
    "most-fish-caught": "Najväčší počet ulovených rýb",
    "best-5-fish": "Váhový priemer top 5 úlovkov",
    "best-3-fish": "Váhový priemer top 3 úlovkov",
    "daily-big-fish": "Najväčší úlovok dňa",
    "first-fish-over-15kg": "Prvá ryba nad 15 kg",
    "first-fish-over-20kg": "Prvá ryba nad 20 kg",
    "first-fish-over-25kg": "Prvá ryba nad 25 kg",
    // Wizard competition codes
    "firstOver15": "Prvá ryba nad 15 kg",
    "firstOver20": "Prvá ryba nad 20 kg",
    "firstOver25": "Prvá ryba nad 25 kg",
    "firstOver30": "Prvá ryba nad 30 kg",
    "biggestFish": "Najväčší úlovok súťaže",
    "biggestScaly": "Najväčší šupináč",
    "biggestMirror": "Najväčší lysec",
    "dailyBigFish": "Najväčšia ryba dňa",
    "firstCatch": "Prvý úlovok",
    "lastCatch": "Posledný úlovok",
    "mostCatches": "Najviac úlovkov",
    "best3": "Priemer 3 najťažších",
    "best5": "Priemer 5 najťažších",
  };
  
  return sideCompetitionLabels[id] || id;
}

// Get all side competition labels for an array of IDs
export function getSideCompetitionLabels(sideCompetitions: string[] | undefined | null): string[] {
  if (!sideCompetitions || !Array.isArray(sideCompetitions)) {
    return [];
  }
  
  return sideCompetitions.map(id => getSideCompetitionLabel(id));
}
