// Countries ordered by priority: SK, CZ, HU, PL first, then alphabetically
export const COUNTRIES = [
  // Priority countries
  { code: "SK", name: "Slovensko", flag: "🇸🇰" },
  { code: "CZ", name: "Česká republika", flag: "🇨🇿" },
  { code: "HU", name: "Maďarsko", flag: "🇭🇺" },
  { code: "PL", name: "Poľsko", flag: "🇵🇱" },
  
  // Rest alphabetically by country name
  { code: "AL", name: "Albánsko", flag: "🇦🇱" },
  { code: "BE", name: "Belgicko", flag: "🇧🇪" },
  { code: "BY", name: "Bielorusko", flag: "🇧🇾" },
  { code: "BA", name: "Bosna a Hercegovina", flag: "🇧🇦" },
  { code: "BG", name: "Bulharsko", flag: "🇧🇬" },
  { code: "ME", name: "Čierna Hora", flag: "🇲🇪" },
  { code: "HR", name: "Chorvátsko", flag: "🇭🇷" },
  { code: "DK", name: "Dánsko", flag: "🇩🇰" },
  { code: "EE", name: "Estónsko", flag: "🇪🇪" },
  { code: "FI", name: "Fínsko", flag: "🇫🇮" },
  { code: "FR", name: "Francúzsko", flag: "🇫🇷" },
  { code: "GR", name: "Grécko", flag: "🇬🇷" },
  { code: "NL", name: "Holandsko", flag: "🇳🇱" },
  { code: "IE", name: "Írsko", flag: "🇮🇪" },
  { code: "XK", name: "Kosovo", flag: "🇽🇰" },
  { code: "LT", name: "Litva", flag: "🇱🇹" },
  { code: "LV", name: "Lotyšsko", flag: "🇱🇻" },
  { code: "MD", name: "Moldavsko", flag: "🇲🇩" },
  { code: "DE", name: "Nemecko", flag: "🇩🇪" },
  { code: "NO", name: "Nórsko", flag: "🇳🇴" },
  { code: "PT", name: "Portugalsko", flag: "🇵🇹" },
  { code: "AT", name: "Rakúsko", flag: "🇦🇹" },
  { code: "RO", name: "Rumunsko", flag: "🇷🇴" },
  { code: "RU", name: "Rusko", flag: "🇷🇺" },
  { code: "SI", name: "Slovinsko", flag: "🇸🇮" },
  { code: "RS", name: "Srbsko", flag: "🇷🇸" },
  { code: "MK", name: "Severné Macedónsko", flag: "🇲🇰" },
  { code: "ES", name: "Španielsko", flag: "🇪🇸" },
  { code: "SE", name: "Švédsko", flag: "🇸🇪" },
  { code: "CH", name: "Švajčiarsko", flag: "🇨🇭" },
  { code: "IT", name: "Taliansko", flag: "🇮🇹" },
  { code: "UA", name: "Ukrajina", flag: "🇺🇦" },
  { code: "GB", name: "Veľká Británia", flag: "🇬🇧" },
] as const;

export type CountryCode = typeof COUNTRIES[number]['code'];

export function getCountryFlag(countryCode: string): string {
  // Return SVG flag URL instead of emoji
  const code = countryCode.toLowerCase();
  return `https://flagcdn.com/24x18/${code}.png`;
}

export function getCountryFlagEmoji(countryCode: string): string {
  const country = COUNTRIES.find(c => c.code === countryCode.toUpperCase());
  return country ? country.flag : "🏳️";
}

export function getCountryName(countryCode: string): string {
  const country = COUNTRIES.find(c => c.code === countryCode.toUpperCase());
  return country ? country.name : countryCode;
}

export function getCountryDisplay(countryCode: string): string {
  const country = COUNTRIES.find(c => c.code === countryCode.toUpperCase());
  return country ? `${country.flag} ${country.name}` : `🏳️ ${countryCode}`;
}