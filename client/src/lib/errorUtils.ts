/**
 * Error parsing utilities for user-friendly error messages
 */

export interface ParsedError {
  title: string;
  description: string;
  isNetworkError: boolean;
  canRetry: boolean;
}

/**
 * Parse API error into user-friendly message
 */
export function parseApiError(error: Error, context?: string): ParsedError {
  const message = error.message.toLowerCase();
  
  // Network and connection errors
  if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) {
    return {
      title: 'Problém s pripojením',
      description: 'Skontrolujte internetové pripojenie a skúste znovu.',
      isNetworkError: true,
      canRetry: true
    };
  }

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return {
      title: 'Server nie je dostupný',
      description: 'Server má dočasné problémy. Skúste to znovu o chvíľu.',
      isNetworkError: false,
      canRetry: true
    };
  }

  // Authentication errors
  if (message.includes('401')) {
    return {
      title: 'Problém s prihlásením',
      description: 'Prihláste sa znovu a skúste to ešte raz.',
      isNetworkError: false,
      canRetry: false
    };
  }

  // Permission errors
  if (message.includes('403')) {
    return {
      title: 'Nemáte oprávnenie',
      description: 'Na túto akciu nemáte dostatočné oprávnenia.',
      isNetworkError: false,
      canRetry: false
    };
  }

  // Not found errors
  if (message.includes('404')) {
    return {
      title: 'Nenájdené',
      description: 'Požadovaný obsah nebol nájdený.',
      isNetworkError: false,
      canRetry: false
    };
  }

  // Validation errors (400)
  if (message.includes('400')) {
    const contextMap: Record<string, string> = {
      'trip': 'Skontrolujte údaje o výprave a skúste znovu.',
      'catch': 'Skontrolujte údaje o úlovku a skúste znovu.',
      'battle': 'Skontrolujte údaje o súboji a skúste znovu.',
      'photo': 'Problém s nahrávaním fotografie. Skúste inú fotografiu.',
    };

    return {
      title: 'Neplatné údaje',
      description: context && contextMap[context] ? contextMap[context] : 'Skontrolujte zadané údaje a skúste znovu.',
      isNetworkError: false,
      canRetry: false
    };
  }

  // Rate limiting (429)
  if (message.includes('429')) {
    return {
      title: 'Príliš veľa pokusov',
      description: 'Počkajte chvíľu pred ďalším pokusom.',
      isNetworkError: false,
      canRetry: true
    };
  }

  // Default error
  return {
    title: context ? `Chyba pri ${getContextTitle(context)}` : 'Nastala chyba',
    description: 'Nečakaná chyba. Skúste to znovu.',
    isNetworkError: false,
    canRetry: true
  };
}

/**
 * Get context-specific title for operations
 */
function getContextTitle(context: string): string {
  const contextTitles: Record<string, string> = {
    'trip': 'práci s výpravou',
    'catch': 'práci s úlovkom',
    'battle': 'vytváraní súboja',
    'photo': 'nahrávaní fotografie',
    'delete': 'mazaní',
    'update': 'aktualizácii',
    'create': 'vytváraní'
  };
  
  return contextTitles[context] || context;
}

/**
 * Enhanced toast function with error parsing
 */
export function showErrorToast(
  toast: (options: any) => void,
  error: Error,
  context?: string
) {
  const parsedError = parseApiError(error, context);
  
  toast({
    title: parsedError.title,
    description: parsedError.description,
    variant: "destructive",
    duration: parsedError.isNetworkError ? 8000 : 5000, // Longer for network errors
  });
  
  return parsedError;
}

/**
 * Validation error formatter for forms
 */
export function formatValidationErrors(errors: Record<string, any>): string[] {
  const messages: string[] = [];
  
  Object.entries(errors).forEach(([field, error]) => {
    if (error?.message) {
      // Translate common field names to Slovak
      const fieldMap: Record<string, string> = {
        'name': 'Názov',
        'location': 'Miesto',
        'date': 'Dátum', 
        'weight': 'Hmotnosť',
        'species': 'Druh ryby',
        'notes': 'Poznámky',
        'angler': 'Rybár'
      };
      
      const fieldName = fieldMap[field] || field;
      messages.push(`${fieldName}: ${error.message}`);
    }
  });
  
  return messages;
}