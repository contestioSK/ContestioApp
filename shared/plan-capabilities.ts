// Plan types
export type PlanTier = 'basic' | 'pro' | 'premium' | 'enterprise';

// Feature types
export type PlanFeature = 
  | 'sectors' 
  | 'sideCompetitions' 
  | 'sponsors' 
  | 'export' 
  | 'branding' 
  | 'advancedStats'
  | 'mediaAccess' 
  | 'prioritySupport'
  | 'interactiveMap'
  | 'multiOrg'
  | 'whiteLabel'
  | 'apiAccess';

// Plan capabilities configuration
export const PLAN_CAPABILITIES: Record<PlanTier, {
  maxReferees: number | null; // null = unlimited
  maxTeams: number | null; // null = unlimited
  features: Set<PlanFeature>;
  price: number | null; // null = custom pricing
  currency: string;
}> = {
  basic: {
    maxReferees: 2,
    maxTeams: 10, // Limited to 10 teams
    features: new Set<PlanFeature>([]), // Only core features
    price: 49,
    currency: '€'
  },
  pro: {
    maxReferees: 5,
    maxTeams: null, // Unlimited teams
    features: new Set<PlanFeature>([
      'sectors',
      'sideCompetitions', 
      'sponsors',
      'export'
    ]),
    price: 149,
    currency: '€'
  },
  premium: {
    maxReferees: null, // unlimited
    maxTeams: null, // unlimited
    features: new Set<PlanFeature>([
      'sectors',
      'sideCompetitions',
      'sponsors', 
      'export',
      'branding',
      'advancedStats',
      'mediaAccess',
      'prioritySupport'
    ]),
    price: 499,
    currency: '€'
  },
  enterprise: {
    maxReferees: null, // unlimited
    maxTeams: null, // unlimited
    features: new Set<PlanFeature>([
      'sectors',
      'sideCompetitions',
      'sponsors',
      'export', 
      'branding',
      'advancedStats',
      'mediaAccess',
      'prioritySupport',
      'interactiveMap',
      'multiOrg',
      'whiteLabel',
      'apiAccess'
    ]),
    price: null, // custom pricing
    currency: '€'
  }
};

// Utility functions
export function canUseFeature(planTier: PlanTier, feature: PlanFeature): boolean {
  const capabilities = PLAN_CAPABILITIES[planTier];
  return capabilities.features.has(feature);
}

export function getMaxReferees(planTier: PlanTier): number | null {
  return PLAN_CAPABILITIES[planTier].maxReferees;
}

export function getMaxTeams(planTier: PlanTier): number | null {
  return PLAN_CAPABILITIES[planTier].maxTeams;
}

export function getPlanPrice(planTier: PlanTier): { price: number | null; currency: string } {
  const capabilities = PLAN_CAPABILITIES[planTier];
  return {
    price: capabilities.price,
    currency: capabilities.currency
  };
}

export function isPaidPlan(planTier: PlanTier): boolean {
  return planTier !== 'enterprise'; // Enterprise is custom pricing, handled differently
}

export function getAllowedFeatures(planTier: PlanTier): PlanFeature[] {
  return Array.from(PLAN_CAPABILITIES[planTier].features);
}

// Feature descriptions for UI
export const FEATURE_DESCRIPTIONS: Record<PlanFeature, { 
  name: string; 
  description: string;
  icon?: string;
}> = {
  sectors: {
    name: 'Sektory',
    description: 'Rozdelenie súťaže do sektorov s vlastnými umiestneniami',
    icon: '🗺️'
  },
  sideCompetitions: {
    name: 'Doplnkové súťaže',
    description: 'Prvá ryba nad 20/25/30 kg, najväčšia ryba a ďalšie',
    icon: '🏆'
  },
  sponsors: {
    name: 'Sponzori',
    description: 'Pridávanie sponzorov s logami a cenami',
    icon: '💼'
  },
  export: {
    name: 'Export výsledkov',
    description: 'Export do PDF a Excel formátov',
    icon: '📊'
  },
  branding: {
    name: 'Vlastný branding',
    description: 'Logo, farby a subdoména pre súťaž',
    icon: '🎨'
  },
  advancedStats: {
    name: 'Pokročilé štatistiky',
    description: 'Detailné grafy a analýzy výsledkov',
    icon: '📈'
  },
  mediaAccess: {
    name: 'Prístup pre médiá',
    description: 'Špeciálny prístup pre novinárov a fotografov',
    icon: '📺'
  },
  prioritySupport: {
    name: 'Prioritná podpora',
    description: 'Rychlá technická podpora počas súťaže',
    icon: '🚀'
  },
  interactiveMap: {
    name: 'Interaktívna mapa',
    description: 'Mapa sektorov s umiestnením tímov',
    icon: '🗺️'
  },
  multiOrg: {
    name: 'Viacero súťaží',
    description: 'Správa viacerých súťaží pod jednou organizáciou',
    icon: '🏢'
  },
  whiteLabel: {
    name: 'White-label riešenie',
    description: 'Aplikácia pod vlastnou značkou',
    icon: '🏷️'
  },
  apiAccess: {
    name: 'API prístup',
    description: 'Integrácia s vlastnými systémami',
    icon: '🔌'
  }
};

// Plan validation helpers
export function validatePlanConstraints(
  planTier: PlanTier,
  data: {
    refereeCount?: number;
    teamCount?: number;
    hasSectors?: boolean;
    sideCompetitions?: string[];
    hasSponsors?: boolean;
    requestedSubdomain?: string;
    branding?: any;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const capabilities = PLAN_CAPABILITIES[planTier];

  // Check referee limit
  if (data.refereeCount && capabilities.maxReferees !== null) {
    if (data.refereeCount > capabilities.maxReferees) {
      errors.push(`Balík ${planTier} povoľuje maximálne ${capabilities.maxReferees} rozhodcov`);
    }
  }

  // Check team limit
  if (data.teamCount && capabilities.maxTeams !== null) {
    if (data.teamCount > capabilities.maxTeams) {
      errors.push(`Balík ${planTier} povoľuje maximálne ${capabilities.maxTeams} tímov`);
    }
  }

  // Check sectors
  if (data.hasSectors && !canUseFeature(planTier, 'sectors')) {
    errors.push('Sektory nie sú dostupné v tomto balíku');
  }

  // Check side competitions
  if (data.sideCompetitions && data.sideCompetitions.length > 0 && !canUseFeature(planTier, 'sideCompetitions')) {
    errors.push('Doplnkové súťaže nie sú dostupné v tomto balíku');
  }

  // Check sponsors
  if (data.hasSponsors && !canUseFeature(planTier, 'sponsors')) {
    errors.push('Sponzori nie sú dostupní v tomto balíku');
  }

  // Check branding
  if ((data.requestedSubdomain || data.branding) && !canUseFeature(planTier, 'branding')) {
    errors.push('Vlastný branding nie je dostupný v tomto balíku');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}