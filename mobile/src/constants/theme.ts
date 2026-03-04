/**
 * TickETH Design System
 * Dark-first theme with vibrant accent colors
 */

export const Colors = {
  // Primary brand
  primary: '#6C63FF',
  primaryLight: '#8B83FF',
  primaryDark: '#4F46E5',

  // Accent
  accent: '#00D9FF',
  accentLight: '#67E8F9',

  // Success / Error / Warning
  success: '#10B981',
  successLight: '#34D399',
  error: '#EF4444',
  errorLight: '#F87171',
  warning: '#F59E0B',
  warningLight: '#FBBF24',

  // Backgrounds (dark theme)
  background: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceLight: '#242442',
  surfaceHighlight: '#2D2D50',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#6B6B80',
  textInverse: '#0D0D0D',

  // Borders
  border: '#2D2D50',
  borderLight: '#3D3D60',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Gradients (use with LinearGradient)
  gradientPrimary: ['#6C63FF', '#4F46E5'] as const,
  gradientAccent: ['#00D9FF', '#6C63FF'] as const,
  gradientDark: ['#1A1A2E', '#0D0D0D'] as const,

  // Ticket status colors
  ticketActive: '#10B981',
  ticketUsed: '#6B6B80',
  ticketTransferred: '#F59E0B',
  ticketListed: '#00D9FF',
} as const;

export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    hero: 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  families: {
    // System fonts — no custom font loading needed
    sans: undefined, // Uses system default
    mono: 'monospace' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const Layout = {
  screenPadding: Spacing.lg,
  cardPadding: Spacing.lg,
  maxContentWidth: 480,
  tabBarHeight: 80,
  headerHeight: 56,
} as const;
