import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from './alert';
import { PICKUP_RATE, STREAK_TIERS } from './streakTiers';

// Cash-out rates, worded once for every screen. Pickup coins always cash out at
// PICKUP_RATE; quiz and referral coins follow the streak ladder in streakTiers.ts.
const REWARD_START_RATE = STREAK_TIERS[0].rate;
const REWARD_BEST_RATE = Math.min(...STREAK_TIERS.map((t) => t.rate));
export const CASH_OUT_RATES =
  `pickup coins at ${PICKUP_RATE} XP = ₹1; quiz and referral coins from ${REWARD_START_RATE} XP = ₹1, better as your pickup streak grows`;

// Fixed copy for persistent banners (Wallet screen, Home wallet widget) — kept static
// so the text doesn't visibly change on every re-render/focus.
export const REDEEM_INFO_TITLE = 'Redemption opens 31 December 🎉';
export const REDEEM_INFO_MESSAGE =
  `From 31 December, cash out your KarmaCoins XP — ${CASH_OUT_RATES}. Keep earning till then!`;

// Single switch that flips the Wallet screen's Redeem button from the countdown
// popup over to the real redeem flow — flip the date (or the flow) here only.
export const REDEEM_LAUNCH_DATE = new Date('2026-12-31T00:00:00');
export function isRedeemLive() {
  return true;
}

// One clean, consistent message — simple and not text-heavy. The blank line
// between the two short paragraphs gives them room to breathe in the popup.
function buildPopupContent() {
  return {
    title: 'Redemption opens 31 December 🎉',
    message:
      'From 31 December, your KarmaCoins XP turn into real cash:\n\n' +
      `• Pickup coins: always ${PICKUP_RATE} XP = ₹1\n` +
      `• Quiz and referral coins: from ${REWARD_START_RATE} XP = ₹1, up to ${REWARD_BEST_RATE} XP = ₹1 as your pickup streak grows\n\n` +
      'A verified pickup every day keeps your streak going. Keep earning with every sustainable action! ♻️',
  };
}

// Shows the redeem-info popup once per flagKey, then never again.
export async function showRedeemInfoOnce(flagKey: string) {
  const alreadyShown = await AsyncStorage.getItem(flagKey);
  if (alreadyShown) return;
  await AsyncStorage.setItem(flagKey, 'true');
  const { title, message } = buildPopupContent();
  showAlert(title, message);
}

// Manual trigger (e.g. Wallet screen's Redeem/Transfer/Donate buttons) — same dynamic
// flavor as the one-time popups, but can be shown repeatedly.
export function showRedeemInfoNow() {
  const { title, message } = buildPopupContent();
  showAlert(title, message);
}
