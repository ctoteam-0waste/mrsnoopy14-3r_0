// Semantic color tokens for light and dark themes.
//
// Screens must use these tokens (via useTheme / makeStyles), never raw hex, so a
// single switch flips the whole app. Brand hues (green, coin gold) are kept close
// across themes; neutrals (backgrounds, surfaces, text, borders) flip.

export type ThemeColors = {
  // surfaces
  bg: string;          // app background
  surface: string;     // cards / sheets
  surfaceAlt: string;  // subtle raised / input backgrounds
  overlay: string;     // modal backdrops

  // text
  text: string;        // primary text
  textMuted: string;   // secondary text
  textFaint: string;   // hints / placeholders
  onPrimary: string;   // text/icons on a primary-colored surface

  // lines
  border: string;
  borderStrong: string;

  // brand + accents
  primary: string;     // brand green (interactive)
  primaryDeep: string; // deep green (headers / emphasis)
  primarySoft: string; // green tint background
  coin: string;        // KarmaCoin gold
  purple: string;      // referral / secondary accent

  // semantic
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;

  // misc
  inputBg: string;
  shadow: string;
};

export const lightColors: ThemeColors = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  overlay: 'rgba(15,23,42,0.5)',

  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  onPrimary: '#ffffff',

  border: '#e2e8f0',
  borderStrong: '#cbd5e1',

  primary: '#16a34a',
  primaryDeep: '#052e16',
  primarySoft: '#dcfce7',
  coin: '#f5b51a',
  purple: '#7c3aed',

  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#d97706',

  inputBg: '#f1f5f9',
  shadow: '#000000',
};

export const darkColors: ThemeColors = {
  bg: '#0a130d',
  surface: '#111c14',
  surfaceAlt: '#16241a',
  overlay: 'rgba(0,0,0,0.6)',

  text: '#e6ede8',
  textMuted: '#9aa89f',
  textFaint: '#6f7d73',
  onPrimary: '#052e16',

  border: '#26332b',
  borderStrong: '#33443a',

  primary: '#4ade80',
  primaryDeep: '#86efac',
  primarySoft: '#15271c',
  coin: '#f5b51a',
  purple: '#a78bfa',

  danger: '#f87171',
  dangerSoft: '#3a1414',
  success: '#4ade80',
  successSoft: '#15271c',
  warning: '#f0a94b',

  inputBg: '#16241a',
  shadow: '#000000',
};
