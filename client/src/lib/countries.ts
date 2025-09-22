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

// Import local flag SVGs (original high-quality graphics)
import skFlag from "@/assets/flags/sk.svg";
import czFlag from "@/assets/flags/cz.svg";
import huFlag from "@/assets/flags/hu.svg";
import plFlag from "@/assets/flags/pl.svg";
import deFlag from "@/assets/flags/de.svg";
import atFlag from "@/assets/flags/at.svg";
import siFlag from "@/assets/flags/si.svg";
import hrFlag from "@/assets/flags/hr.svg";
import rsFlag from "@/assets/flags/rs.svg";
import roFlag from "@/assets/flags/ro.svg";
import uaFlag from "@/assets/flags/ua.svg";
import itFlag from "@/assets/flags/it.svg";
import frFlag from "@/assets/flags/fr.svg";
import esFlag from "@/assets/flags/es.svg";
import nlFlag from "@/assets/flags/nl.svg";
import beFlag from "@/assets/flags/be.svg";
import chFlag from "@/assets/flags/ch.svg";
import gbFlag from "@/assets/flags/gb.svg";
import seFlag from "@/assets/flags/se.svg";
import noFlag from "@/assets/flags/no.svg";
import bgFlag from "@/assets/flags/bg.svg";
import dkFlag from "@/assets/flags/dk.svg";
import fiFlag from "@/assets/flags/fi.svg";
import ptFlag from "@/assets/flags/pt.svg";

// Map of country codes to local flag imports (original graphics preserved)
const LOCAL_FLAGS: Record<string, string> = {
  sk: skFlag,
  cz: czFlag,
  hu: huFlag,
  pl: plFlag,
  de: deFlag,
  at: atFlag,
  si: siFlag,
  hr: hrFlag,
  rs: rsFlag,
  ro: roFlag,
  ua: uaFlag,
  it: itFlag,
  fr: frFlag,
  es: esFlag,
  nl: nlFlag,
  be: beFlag,
  ch: chFlag,
  gb: gbFlag,
  se: seFlag,
  no: noFlag,
  bg: bgFlag,
  dk: dkFlag,
  fi: fiFlag,
  pt: ptFlag,
};

export function getCountryFlag(countryCode: string): string {
  const code = countryCode.toLowerCase();
  
  // Primary: Use local high-quality flags (original graphics preserved)
  if (LOCAL_FLAGS[code]) {
    return LOCAL_FLAGS[code];
  }
  
  // Fallback: CDN SVG flags for countries not available locally
  return `https://flagcdn.com/${code}.svg`;
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