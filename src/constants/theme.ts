// ─── Color Palette ──────────────────────────────────────────────────────────
// Warm, organic palette inspired by The Ordinary's clean aesthetic

export const Colors = {
  // Primary — muted olive/sage green
  primary: '#8B9A6B',
  primaryLight: '#A8B58C',
  primaryDark: '#6B7A4F',

  // Accent — warm sand
  accent: '#C4A87C',
  accentLight: '#D9C4A0',
  accentDark: '#A68B5B',

  // Background — warm cream/beige
  background: '#F5F0E8',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDE8DF',

  // Text
  text: '#2C2C2C',
  textSecondary: '#6E6E6E',
  textLight: '#A0A0A0',
  textOnPrimary: '#FFFFFF',

  // Semantic
  success: '#8B9A6B',
  warning: '#D4A857',
  error: '#C47070',
  info: '#7B9AAF',

  // Utility
  border: '#E0D9CE',
  divider: '#E8E2D8',
  shadow: 'rgba(44, 44, 44, 0.06)',
  overlay: 'rgba(44, 44, 44, 0.35)',
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────

export const Typography = {
  title: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textLight,
    letterSpacing: 0.2,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;

// ─── Spacing & Layout ───────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 50,
  full: 9999,
} as const;

// ─── Dark Theme Colors ────────────────────────────────────────────────────────

export const DarkColors = {
  // Primary — muted olive/sage green (same as light)
  primary: '#8B9A6B',
  primaryLight: '#A8B58C',
  primaryDark: '#6B7A4F',

  // Accent — warm sand (same as light)
  accent: '#C4A87C',
  accentLight: '#D9C4A0',
  accentDark: '#A68B5B',

  // Background — dark gray/charcoal
  background: '#1A1A1A',
  surface: '#2C2C2C',
  surfaceSecondary: '#242424',

  // Text
  text: '#E8E8E8',
  textSecondary: '#B0B0B0',
  textLight: '#808080',
  textOnPrimary: '#FFFFFF',

  // Semantic (same as light)
  success: '#8B9A6B',
  warning: '#D4A857',
  error: '#C47070',
  info: '#7B9AAF',

  // Utility
  border: '#3A3A3A',
  divider: '#333333',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;
