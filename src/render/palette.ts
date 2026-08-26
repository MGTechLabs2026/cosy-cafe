// Palette constants — doc 04 §1.3 warm 32-color master palette (M0 subset).
// Single source of truth for canvas colors; CSS custom properties mirror these
// in public/styles/main.css. All values are 0xRRGGBB.

export const Palette = {
  // Backgrounds
  bgDeep: 0x1a1620,
  bgPanel: 0x1e1a2a,
  bgPanelBorder: 0x3d344a,

  // Text
  textPrimary: 0xf5eede,
  textMuted: 0xa89fab,

  // Accents
  accentWarm: 0xd4a574,
  accentWarmHover: 0xe8c098,
  accentGold: 0xf0c840,
  accentStar: 0xffd43b,

  // Room placeholder fills (warm rectangles, M0)
  wallTop: 0x4a3527,
  wallMid: 0x5a4130,
  wallLow: 0x6b4e38,
  floor: 0x8a6543,
  counter: 0x9c6b43,
  counterTop: 0xb5824f,
  kettleSpot: 0x8b6d4f,
  doorSign: 0x7a5c3d,
  hearth: 0x6b4a35,
  hearthGlow: 0xd48a4a,
} as const;

export type PaletteKey = keyof typeof Palette;

/** Convert a palette color to a CSS hex string, e.g. 0x1a1620 → '#1a1620'. */
export function paletteToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Convert a palette color to an rgba() string with the given alpha. */
export function paletteToRgba(color: number, alpha: number): string {
  const r = (color >>> 16) & 0xff;
  const g = (color >>> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
