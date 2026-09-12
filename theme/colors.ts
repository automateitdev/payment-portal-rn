/**
 * Central theme palette.
 *
 * Everything that needs a brand colour reads it from here — swap the
 * `primary` scale in one place to re-skin the whole app. `surface` is the
 * neutral scale (0 = white, ascending = darker) used for chrome, borders
 * and the dark gradient headers.
 *
 * The same scales are mirrored in `tailwind.config.js` so the JS values
 * below and the `primary-*` / `surface-*` utility classes stay in sync.
 */

export const primary = {
  50: "#ECFDF5",
  100: "#D1FAE5",
  200: "#A7F3D0",
  300: "#6EE7B7",
  400: "#34D399",
  500: "#10B981",
  600: "#059669",
  700: "#047857",
  800: "#065F46",
  900: "#064E3B",
  950: "#022C22",
  DEFAULT: "#059669",
} as const;

export const surface = {
  0: "#FFFFFF",
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E2E8F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  700: "#334155",
  800: "#1E293B",
  900: "#0F172A",
  950: "#020617",
  DEFAULT: "#64748B",
} as const;

export const colors = {
  primary,
  surface,
  /** Primary body text. */
  text: surface[900],
  /** Muted / secondary text. */
  textSecondary: surface[500],
  /** Text/icons sitting on a primary-coloured background. */
  primaryText: "#FFFFFF",
  white: "#FFFFFF",
  black: "#000000",
  danger: "#F43F5E",
  warning: "#F59E0B",
  success: "#10B981",
} as const;

/** Shorthand for the single brand colour (buttons, focus rings, accents). */
export const primaryColor = colors.primary.DEFAULT;

/**
 * Ready-made colour stops for `expo-linear-gradient` / `<GradientFill />`.
 * Tuples are `[from, to]` — pass `start`/`end` to control direction.
 */
export const gradients = {
  /** Brand button / CTA fill. */
  primary: [primary[500], primary[700]] as [string, string],
  /** Softer brand fill for large surfaces. */
  primarySoft: [primary[400], primary[600]] as [string, string],
  /** Deep brand header (modal / table headers). */
  header: [primary[700], primary[900]] as [string, string],
  /** Neutral dark surface (search bars, sheets). */
  surface: [surface[900], surface[700]] as [string, string],
  /** Landing / page background wash. */
  page: ["#F5F3FF", "#E0F2FE", "#CCFBF1"] as [string, string, string],
  pageDark: ["#0B1120", "#0F2A2A", "#08221C"] as [string, string, string],
} as const;

export default colors;
