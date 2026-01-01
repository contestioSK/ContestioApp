// Badge definitions and helpers for the gamification system

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  tiers: {
    bronze: { threshold: number; description: string };
    silver: { threshold: number; description: string };
    gold: { threshold: number; description: string };
  };
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  fishing_fanatic: {
    id: 'fishing_fanatic',
    name: 'Rybársky Fanatik',
    description: 'Počet dní strávených pri vode',
    icon: 'Calendar',
    tiers: {
      bronze: { threshold: 10, description: '10 dní pri vode' },
      silver: { threshold: 50, description: '50 dní pri vode' },
      gold: { threshold: 100, description: '100 dní v sezóne' }
    }
  },
  
  predator_threat: {
    id: 'predator_threat',
    name: 'Dravčia Hrozba',
    description: 'Počet ulovených dravcov (Šťuka, Zubáč, Sumec)',
    icon: 'Crosshair',
    tiers: {
      bronze: { threshold: 5, description: '5 dravcov' },
      silver: { threshold: 20, description: '20 dravcov' },
      gold: { threshold: 50, description: '50 dravcov' }
    }
  },
  
  big_mama_hunter: {
    id: 'big_mama_hunter',
    name: 'Big Mama Hunter - Lovec Trofejí',
    description: 'Ulovenie ryby nad určitú váhu (kapor)',
    icon: 'Target',
    tiers: {
      bronze: { threshold: 10, description: 'Kapor nad 10 kg' },
      silver: { threshold: 15, description: 'Kapor nad 15 kg' },
      gold: { threshold: 20, description: 'Kapor nad 20 kg' }
    }
  },
  
  carp_master: {
    id: 'carp_master',
    name: 'Kaprársky Majster',
    description: 'Počet ulovených kaprov',
    icon: 'Crown',
    tiers: {
      bronze: { threshold: 10, description: '10 kaprov' },
      silver: { threshold: 50, description: '50 kaprov' },
      gold: { threshold: 100, description: '100 kaprov' }
    }
  },
  
  species_collector: {
    id: 'species_collector',
    name: 'Druhová Rozmanitosť',
    description: 'Počet rôznych druhov rýb v sezóne',
    icon: 'Dna',
    tiers: {
      bronze: { threshold: 3, description: '3 rôzne druhy' },
      silver: { threshold: 5, description: '5 rôznych druhov' },
      gold: { threshold: 10, description: '10 rôznych druhov' }
    }
  },
  
  night_hunter: {
    id: 'night_hunter',
    name: 'Nočný Lovec',
    description: 'Úlovky zaznamenané medzi 22:00 a 04:00',
    icon: 'Moon',
    tiers: {
      bronze: { threshold: 1, description: '1 nočný úlovok' },
      silver: { threshold: 10, description: '10 nočných úlovkov' },
      gold: { threshold: 50, description: '50 nočných úlovkov' }
    }
  },
  
  detail_keeper: {
    id: 'detail_keeper',
    name: 'Kronikár',
    description: 'Detailné vyplnenie záznamov (fotka, nástraha, počasie)',
    icon: 'FileText',
    tiers: {
      bronze: { threshold: 5, description: '5 detailných záznamov' },
      silver: { threshold: 20, description: '20 detailných záznamov' },
      gold: { threshold: 50, description: '50 detailných záznamov' }
    }
  },
  
  season_warrior: {
    id: 'season_warrior',
    name: 'Celoročný Lovec',
    description: 'Úlovok zaznamenaný vo všetkých ročných obdobiach',
    icon: 'Snowflake',
    tiers: {
      bronze: { threshold: 2, description: '2 obdobia' },
      silver: { threshold: 3, description: '3 obdobia' },
      gold: { threshold: 4, description: 'Všetky 4 obdobia' }
    }
  }
};

export function getTierColor(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return 'from-amber-600 to-amber-700';
    case 'silver': return 'from-gray-400 to-gray-500';
    case 'gold': return 'from-yellow-400 to-yellow-500';
  }
}

export function getTierBgClass(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';
    case 'silver': return 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800';
    case 'gold': return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
  }
}

export function getTierTextClass(tier: BadgeTier): string {
  switch (tier) {
    case 'bronze': return 'text-amber-700 dark:text-amber-300';
    case 'silver': return 'text-gray-700 dark:text-gray-300';
    case 'gold': return 'text-yellow-700 dark:text-yellow-300';
  }
}
