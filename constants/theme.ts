// Design tokens ported from the Centsy prototype (Centsy_Standalone.html)
// React Native has no CSS variables, so light/dark are two static objects
// instead of CSS custom-property overrides.

export const RADII = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const SPACING = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 32,
  s8: 40,
};

export const FONTS = {
  display: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodySemiBold: 'HankenGrotesk_600SemiBold',
};

export const FONT_SIZES = {
  h1: 30,
  h2: 22,
  h3: 17,
  body: 15,
  small: 13,
  eyebrow: 11,
};

// Category colors (same in light & dark in terms of role, values differ)
const categoryColorsLight = {
  needs: '#5350d6',
  needsBg: '#ececfb',
  wants: '#cf7a12',
  wantsBg: '#fbf0dd',
  save: '#11a85a',
  saveBg: '#e0f4e9',
  debt: '#db3b40',
  debtBg: '#fbe6e6',
};

const categoryColorsDark = {
  needs: '#8785f5',
  needsBg: '#232148',
  wants: '#f0a93b',
  wantsBg: '#3a2c14',
  save: '#2fd07c',
  saveBg: '#10331f',
  debt: '#ff6b6e',
  debtBg: '#3a1c1d',
};

export const lightTheme = {
  bg: '#f1f1ec',
  surface: '#ffffff',
  surface2: '#f8f8f4',
  surface3: '#efefe9',
  ink: '#16160f',
  ink2: '#4a4a42',
  inkSoft: '#7d7d73',
  line: 'rgba(20, 20, 12, 0.09)',
  lineStrong: 'rgba(20, 20, 12, 0.16)',
  brand: '#11a85a',
  brandInk: '#ffffff',
  ...categoryColorsLight,
};

export const darkTheme = {
  bg: '#0c0d10',
  surface: '#16181d',
  surface2: '#1c1f26',
  surface3: '#23262e',
  ink: '#f3f3ee',
  ink2: '#c4c5cc',
  inkSoft: '#898b94',
  line: 'rgba(255, 255, 255, 0.10)',
  lineStrong: 'rgba(255, 255, 255, 0.18)',
  brand: '#2fd07c',
  brandInk: '#07140c',
  ...categoryColorsDark,
};

export type Theme = typeof lightTheme;