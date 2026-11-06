import { Platform } from 'react-native';

// Diwali theme on the website, 6 Nov 00:00 to 12 Nov 00:00 IST (Diwali on the 8th,
// through Bhai Dooj). It switches itself off after END. To remove it from the code,
// delete src/components/festive, this file, and the isDiwaliSeason() call sites
// (plus the Diwali lines in public/index.html).
const START = Date.parse('2026-11-06T00:00:00+05:30');
const END = Date.parse('2026-11-12T00:00:00+05:30');

// The theme's days, as local dates (the dashboard's Deepotsav tracker has a diya for each).
export const DIWALI_DAYS = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'];

// ?diwali=1 previews the theme outside the dates (for review on staging), ?diwali=0
// hides it. Kept for the rest of the tab so it survives in-app navigation.
function previewOverride(): boolean | null {
  try {
    const q = new URLSearchParams(window.location.search).get('diwali');
    if (q === '1' || q === '0') sessionStorage.setItem('kvDiwaliPreview', q);
    const saved = sessionStorage.getItem('kvDiwaliPreview');
    return saved === null ? null : saved === '1';
  } catch {
    return null;
  }
}

export function isDiwaliSeason(now: number = Date.now()): boolean {
  if (Platform.OS !== 'web') return false;
  const override = previewOverride();
  if (override !== null) return override;
  return now >= START && now < END;
}
