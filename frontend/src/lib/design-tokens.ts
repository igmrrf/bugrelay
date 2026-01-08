/**
 * Design Tokens for BugRelay
 *
 * Central design system tokens for consistent styling across all components.
 * These tokens should be used throughout the application for maintainability.
 */

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
} as const;

export const fontSize = {
  xs: '0.75rem',      // 12px
  sm: '0.875rem',     // 14px
  base: '1rem',       // 16px
  lg: '1.125rem',     // 18px
  xl: '1.25rem',      // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.25rem',   // 36px
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const lineHeight = {
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',      // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  full: '9999px',
} as const;

export const shadow = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.15)',
} as const;

export const transition = {
  fast: '0.1s ease',
  normal: '0.2s ease',
  slow: '0.3s ease',
} as const;

/**
 * Bug Status Colors
 * Colors for different bug statuses in both light and dark modes
 */
export const statusColors = {
  open: {
    light: {
      background: 'hsl(220 100% 95%)',
      foreground: 'hsl(220 100% 30%)',
      border: 'hsl(220 100% 85%)',
    },
    dark: {
      background: 'hsl(220 100% 15%)',
      foreground: 'hsl(220 100% 80%)',
      border: 'hsl(220 100% 25%)',
    },
  },
  reviewing: {
    light: {
      background: 'hsl(45 100% 90%)',
      foreground: 'hsl(45 100% 30%)',
      border: 'hsl(45 100% 75%)',
    },
    dark: {
      background: 'hsl(45 100% 20%)',
      foreground: 'hsl(45 100% 80%)',
      border: 'hsl(45 100% 30%)',
    },
  },
  fixed: {
    light: {
      background: 'hsl(140 60% 90%)',
      foreground: 'hsl(140 60% 30%)',
      border: 'hsl(140 60% 75%)',
    },
    dark: {
      background: 'hsl(140 60% 20%)',
      foreground: 'hsl(140 60% 80%)',
      border: 'hsl(140 60% 30%)',
    },
  },
  wont_fix: {
    light: {
      background: 'hsl(0 0% 90%)',
      foreground: 'hsl(0 0% 40%)',
      border: 'hsl(0 0% 75%)',
    },
    dark: {
      background: 'hsl(0 0% 20%)',
      foreground: 'hsl(0 0% 70%)',
      border: 'hsl(0 0% 30%)',
    },
  },
} as const;

/**
 * Priority Colors
 * Colors for different bug priorities in both light and dark modes
 */
export const priorityColors = {
  low: {
    light: {
      background: 'hsl(0 0% 90%)',
      foreground: 'hsl(0 0% 40%)',
      border: 'hsl(0 0% 75%)',
    },
    dark: {
      background: 'hsl(0 0% 20%)',
      foreground: 'hsl(0 0% 70%)',
      border: 'hsl(0 0% 30%)',
    },
    icon: '○',
  },
  medium: {
    light: {
      background: 'hsl(35 100% 90%)',
      foreground: 'hsl(35 100% 35%)',
      border: 'hsl(35 100% 75%)',
    },
    dark: {
      background: 'hsl(35 100% 20%)',
      foreground: 'hsl(35 100% 75%)',
      border: 'hsl(35 100% 30%)',
    },
    icon: '◐',
  },
  high: {
    light: {
      background: 'hsl(15 90% 90%)',
      foreground: 'hsl(15 90% 35%)',
      border: 'hsl(15 90% 75%)',
    },
    dark: {
      background: 'hsl(15 90% 20%)',
      foreground: 'hsl(15 90% 75%)',
      border: 'hsl(15 90% 30%)',
    },
    icon: '●',
  },
  critical: {
    light: {
      background: 'hsl(0 85% 90%)',
      foreground: 'hsl(0 85% 35%)',
      border: 'hsl(0 85% 75%)',
    },
    dark: {
      background: 'hsl(0 85% 20%)',
      foreground: 'hsl(0 85% 75%)',
      border: 'hsl(0 85% 30%)',
    },
    icon: '⚠️',
  },
} as const;

/**
 * Company Response Colors
 * Special colors for company/official responses
 */
export const companyResponseColors = {
  light: {
    background: 'hsl(220 100% 98%)',
    foreground: 'hsl(220 100% 20%)',
    border: 'hsl(220 100% 85%)',
    badge: 'hsl(220 100% 90%)',
    badgeForeground: 'hsl(220 100% 40%)',
  },
  dark: {
    background: 'hsl(220 100% 10%)',
    foreground: 'hsl(220 100% 90%)',
    border: 'hsl(220 100% 25%)',
    badge: 'hsl(220 100% 20%)',
    badgeForeground: 'hsl(220 100% 80%)',
  },
} as const;

/**
 * Z-Index Scale
 * Consistent z-index values for layering
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

/**
 * Breakpoints
 * Responsive design breakpoints
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Animation Durations
 */
export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

/**
 * Animation Easings
 */
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

/**
 * Icon Sizes
 */
export const iconSize = {
  xs: '0.75rem',   // 12px
  sm: '1rem',      // 16px
  md: '1.25rem',   // 20px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
} as const;

/**
 * Card Styles
 * Common card styling tokens
 */
export const card = {
  padding: {
    sm: spacing.md,
    md: spacing.lg,
    lg: spacing.xl,
  },
  gap: {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  },
  border: {
    light: 'hsl(0 0% 90%)',
    dark: 'hsl(0 0% 15%)',
  },
  hoverBorder: {
    light: 'hsl(0 0% 70%)',
    dark: 'hsl(0 0% 30%)',
  },
} as const;

/**
 * Button Sizes
 */
export const buttonSize = {
  sm: {
    height: '2rem',      // 32px
    padding: '0 0.75rem',
    fontSize: fontSize.sm,
  },
  md: {
    height: '2.5rem',    // 40px
    padding: '0 1rem',
    fontSize: fontSize.base,
  },
  lg: {
    height: '3rem',      // 48px
    padding: '0 1.5rem',
    fontSize: fontSize.lg,
  },
} as const;

/**
 * Form Field Styles
 */
export const formField = {
  height: {
    sm: '2rem',
    md: '2.5rem',
    lg: '3rem',
  },
  padding: {
    x: spacing.md,
    y: spacing.sm,
  },
  border: {
    light: 'hsl(0 0% 90%)',
    dark: 'hsl(0 0% 15%)',
  },
  focusBorder: {
    light: 'hsl(0 0% 0%)',
    dark: 'hsl(0 0% 100%)',
  },
} as const;

/**
 * Typography Scale
 */
export const typography = {
  bugTitle: {
    list: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.tight,
    },
    detail: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
    },
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.relaxed,
  },
  metadata: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.normal,
  },
  badge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.025em',
  },
} as const;

/**
 * Helper function to get status color based on theme
 */
export function getStatusColor(status: keyof typeof statusColors, theme: 'light' | 'dark') {
  return statusColors[status][theme];
}

/**
 * Helper function to get priority color based on theme
 */
export function getPriorityColor(priority: keyof typeof priorityColors, theme: 'light' | 'dark') {
  return priorityColors[priority][theme];
}

/**
 * Helper function to get company response color based on theme
 */
export function getCompanyResponseColor(theme: 'light' | 'dark') {
  return companyResponseColors[theme];
}

// Type exports for TypeScript
export type Spacing = keyof typeof spacing;
export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;
export type LineHeight = keyof typeof lineHeight;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadow;
export type BugStatus = keyof typeof statusColors;
export type BugPriority = keyof typeof priorityColors;
export type Breakpoint = keyof typeof breakpoints;
