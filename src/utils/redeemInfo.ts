import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert } from './alert';

// Fixed copy for persistent banners (Wallet screen, Home wallet widget) — kept static
// so the text doesn't visibly change on every re-render/focus.
export const REDEEM_INFO_TITLE = '🎉 Redemption opens 31st August!';
export const REDEEM_INFO_MESSAGE =
  '🪙 10 KarmaCoins XP = ₹1 — cash out starting 31st August. Keep recycling, keep earning! ♻️✨';

// Rotating flavor text for one-off popups, so repeat triggers (booking, quiz, home)
// don't all show the exact same line.
const CHEESY_LINES = [
  { emoji: '🎉', tagline: 'Ka-ching! Your KarmaCoins are about to turn into real cash!' },
  { emoji: '🌱', tagline: 'Small scraps, big rewards — Mother Earth (and your wallet) says thanks!' },
  { emoji: '♻️', tagline: "Trash today, cash tomorrow — you're basically a recycling superhero!" },
  { emoji: '💰', tagline: 'Cha-ching! Every bit of KarmaCoins XP is quietly building your treasure chest.' },
  { emoji: '🌍', tagline: "Saving the planet AND stacking coins? Now that's a win-win!" },
  { emoji: '🚀', tagline: 'Your KarmaCoins are fueling up for lift-off — redemption day is almost here!' },
];

function buildPopupContent() {
  const { emoji, tagline } = CHEESY_LINES[Math.floor(Math.random() * CHEESY_LINES.length)];
  return {
    title: `${emoji} Redemption opens 31st August!`,
    message: `${tagline}\n\n🪙 10 KarmaCoins XP = ₹1 — cash out starting 31st August.\nKeep recycling, keep earning! ♻️✨`,
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
