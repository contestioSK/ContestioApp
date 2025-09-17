// Common countries in Central Europe and Europe
export const COUNTRIES = [
  { code: "SK", name: "Slovensko", flag: "🇸🇰" },
  { code: "CZ", name: "Česká republika", flag: "🇨🇿" },
  { code: "HU", name: "Maďarsko", flag: "🇭🇺" },
  { code: "AT", name: "Rakúsko", flag: "🇦🇹" },
  { code: "PL", name: "Poľsko", flag: "🇵🇱" },
  { code: "DE", name: "Nemecko", flag: "🇩🇪" },
  { code: "UA", name: "Ukrajina", flag: "🇺🇦" },
  { code: "RO", name: "Rumunsko", flag: "🇷🇴" },
  { code: "SI", name: "Slovinsko", flag: "🇸🇮" },
  { code: "HR", name: "Chorvátsko", flag: "🇭🇷" },
  { code: "RS", name: "Srbsko", flag: "🇷🇸" },
  { code: "IT", name: "Taliansko", flag: "🇮🇹" },
  { code: "FR", name: "Francúzsko", flag: "🇫🇷" },
  { code: "GB", name: "Veľká Británia", flag: "🇬🇧" },
  { code: "ES", name: "Španielsko", flag: "🇪🇸" },
  { code: "NL", name: "Holandsko", flag: "🇳🇱" },
  { code: "BE", name: "Belgicko", flag: "🇧🇪" },
  { code: "CH", name: "Švajčiarsko", flag: "🇨🇭" },
  { code: "NO", name: "Nórsko", flag: "🇳🇴" },
  { code: "SE", name: "Švédsko", flag: "🇸🇪" },
  { code: "DK", name: "Dánsko", flag: "🇩🇰" },
  { code: "FI", name: "Fínsko", flag: "🇫🇮" },
  { code: "EE", name: "Estónsko", flag: "🇪🇪" },
  { code: "LV", name: "Lotyšsko", flag: "🇱🇻" },
  { code: "LT", name: "Litva", flag: "🇱🇹" },
  { code: "IE", name: "Írsko", flag: "🇮🇪" },
  { code: "PT", name: "Portugalsko", flag: "🇵🇹" },
  { code: "GR", name: "Grécko", flag: "🇬🇷" },
  { code: "BG", name: "Bulharsko", flag: "🇧🇬" },
  { code: "MK", name: "Severné Macedónsko", flag: "🇲🇰" },
  { code: "BA", name: "Bosna a Hercegovina", flag: "🇧🇦" },
  { code: "ME", name: "Čierna Hora", flag: "🇲🇪" },
  { code: "XK", name: "Kosovo", flag: "🇽🇰" },
  { code: "AL", name: "Albánsko", flag: "🇦🇱" },
  { code: "MD", name: "Moldavsko", flag: "🇲🇩" },
  { code: "BY", name: "Bielorusko", flag: "🇧🇾" },
  { code: "RU", name: "Rusko", flag: "🇷🇺" },
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