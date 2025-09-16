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
