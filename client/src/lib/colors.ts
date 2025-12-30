/**
 * Contestio Design System - Color Palette
 * 
 * 10 farieb optimalizovaných pre dark aj light mode.
 * Dark mode: odtiene 500 (sýtejšie, neónový efekt)
 * Light mode: odtiene 600 (tmavšie, lepší kontrast)
 */

export interface PaletteColor {
  id: number;
  name: string;
  dark: {
    tailwind: string;
    hex: string;
    text: string;
    bg: string;
    border: string;
  };
  light: {
    tailwind: string;
    hex: string;
    text: string;
    bg: string;
    border: string;
  };
  usage: string;
}

export const CONTESTIO_PALETTE: PaletteColor[] = [
  { 
    id: 1, 
    name: 'Contestio Lime', 
    dark: { tailwind: 'bg-lime-500', hex: '#84cc16', text: 'text-lime-500', bg: 'bg-lime-500', border: 'border-lime-500' },
    light: { tailwind: 'bg-lime-600', hex: '#65a30d', text: 'text-lime-600', bg: 'bg-lime-600', border: 'border-lime-600' },
    usage: 'Brand, Primárne dáta'
  },
  { 
    id: 2, 
    name: 'Deep Blue', 
    dark: { tailwind: 'bg-blue-500', hex: '#3b82f6', text: 'text-blue-500', bg: 'bg-blue-500', border: 'border-blue-500' },
    light: { tailwind: 'bg-blue-600', hex: '#2563eb', text: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-600' },
    usage: 'Voda, Sekundárne'
  },
  { 
    id: 3, 
    name: 'Solar Amber', 
    dark: { tailwind: 'bg-amber-500', hex: '#f59e0b', text: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-500' },
    light: { tailwind: 'bg-amber-600', hex: '#d97706', text: 'text-amber-600', bg: 'bg-amber-600', border: 'border-amber-600' },
    usage: 'Pozornosť, Teplo'
  },
  { 
    id: 4, 
    name: 'Royal Purple', 
    dark: { tailwind: 'bg-purple-500', hex: '#a855f7', text: 'text-purple-500', bg: 'bg-purple-500', border: 'border-purple-500' },
    light: { tailwind: 'bg-purple-600', hex: '#9333ea', text: 'text-purple-600', bg: 'bg-purple-600', border: 'border-purple-600' },
    usage: 'Premium, Hĺbka'
  },
  { 
    id: 5, 
    name: 'Signal Rose', 
    dark: { tailwind: 'bg-rose-500', hex: '#f43f5e', text: 'text-rose-500', bg: 'bg-rose-500', border: 'border-rose-500' },
    light: { tailwind: 'bg-rose-600', hex: '#e11d48', text: 'text-rose-600', bg: 'bg-rose-600', border: 'border-rose-600' },
    usage: 'Kritické, Akcent'
  },
  { 
    id: 6, 
    name: 'Aqua Cyan', 
    dark: { tailwind: 'bg-cyan-500', hex: '#06b6d4', text: 'text-cyan-500', bg: 'bg-cyan-500', border: 'border-cyan-500' },
    light: { tailwind: 'bg-cyan-600', hex: '#0891b2', text: 'text-cyan-600', bg: 'bg-cyan-600', border: 'border-cyan-600' },
    usage: 'Sviežosť, Plytčina'
  },
  { 
    id: 7, 
    name: 'Forest Emerald', 
    dark: { tailwind: 'bg-emerald-500', hex: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500' },
    light: { tailwind: 'bg-emerald-600', hex: '#059669', text: 'text-emerald-600', bg: 'bg-emerald-600', border: 'border-emerald-600' },
    usage: 'Príroda, Úspech'
  },
  { 
    id: 8, 
    name: 'Energy Orange', 
    dark: { tailwind: 'bg-orange-500', hex: '#f97316', text: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500' },
    light: { tailwind: 'bg-orange-600', hex: '#ea580c', text: 'text-orange-600', bg: 'bg-orange-600', border: 'border-orange-600' },
    usage: 'Dynamika, Akcia'
  },
  { 
    id: 9, 
    name: 'Abyss Indigo', 
    dark: { tailwind: 'bg-indigo-500', hex: '#6366f1', text: 'text-indigo-500', bg: 'bg-indigo-500', border: 'border-indigo-500' },
    light: { tailwind: 'bg-indigo-600', hex: '#4f46e5', text: 'text-indigo-600', bg: 'bg-indigo-600', border: 'border-indigo-600' },
    usage: 'Noc, Hlboká voda'
  },
  { 
    id: 10, 
    name: 'Neon Pink', 
    dark: { tailwind: 'bg-fuchsia-500', hex: '#d946ef', text: 'text-fuchsia-500', bg: 'bg-fuchsia-500', border: 'border-fuchsia-500' },
    light: { tailwind: 'bg-fuchsia-600', hex: '#c026d3', text: 'text-fuchsia-600', bg: 'bg-fuchsia-600', border: 'border-fuchsia-600' },
    usage: 'Moderný Tech'
  },
];

export function getChartColors(isDark: boolean): string[] {
  return CONTESTIO_PALETTE.map(color => isDark ? color.dark.hex : color.light.hex);
}

export function getTailwindBgClasses(isDark: boolean): string[] {
  return CONTESTIO_PALETTE.map(color => isDark ? color.dark.bg : color.light.bg);
}

export function getTailwindTextClasses(isDark: boolean): string[] {
  return CONTESTIO_PALETTE.map(color => isDark ? color.dark.text : color.light.text);
}

export function getTailwindBorderClasses(isDark: boolean): string[] {
  return CONTESTIO_PALETTE.map(color => isDark ? color.dark.border : color.light.border);
}

export function getColorByIndex(index: number, isDark: boolean): PaletteColor['dark'] | PaletteColor['light'] {
  const color = CONTESTIO_PALETTE[index % CONTESTIO_PALETTE.length];
  return isDark ? color.dark : color.light;
}

export function getHexByIndex(index: number, isDark: boolean): string {
  const color = CONTESTIO_PALETTE[index % CONTESTIO_PALETTE.length];
  return isDark ? color.dark.hex : color.light.hex;
}

export const CHART_COLORS_DARK = CONTESTIO_PALETTE.map(c => c.dark.hex);
export const CHART_COLORS_LIGHT = CONTESTIO_PALETTE.map(c => c.light.hex);

export const BG_CLASSES_DARK = CONTESTIO_PALETTE.map(c => c.dark.bg);
export const BG_CLASSES_LIGHT = CONTESTIO_PALETTE.map(c => c.light.bg);

export const TEXT_CLASSES_DARK = CONTESTIO_PALETTE.map(c => c.dark.text);
export const TEXT_CLASSES_LIGHT = CONTESTIO_PALETTE.map(c => c.light.text);

export const BORDER_CLASSES_DARK = CONTESTIO_PALETTE.map(c => c.dark.border);
export const BORDER_CLASSES_LIGHT = CONTESTIO_PALETTE.map(c => c.light.border);

/**
 * Get chart color by index - returns hex color for Recharts
 * Automatically handles dark/light mode detection from document
 */
export function getChartColorByIndex(index: number): string {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
  return colors[index % colors.length];
}

/**
 * Get all chart colors for current theme
 */
export function getCurrentChartColors(): string[] {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
}
