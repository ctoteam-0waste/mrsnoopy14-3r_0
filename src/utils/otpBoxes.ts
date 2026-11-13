import { Platform } from 'react-native';

// Lets the keyboard offer the code from the SMS (iOS "From Messages", Android
// Gboard / autofill) so one tap fills it.
export const OTP_AUTOFILL = {
  textContentType: 'oneTimeCode',
  autoComplete: Platform.OS === 'android' ? 'sms-otp' : 'one-time-code',
} as const;

// One OTP box changed. A typed digit fills that box; a whole code from autofill
// or paste spreads across the boxes. Returns the new boxes and the box to focus.
export function applyOtpInput(prev: string[], text: string, index: number): { next: string[]; focus: number | null } {
  let digits = text.replace(/\D/g, '');
  if (digits.length === 2 && prev[index] && digits.startsWith(prev[index])) digits = digits.slice(1);
  const next = [...prev];
  if (digits.length <= 1) {
    next[index] = digits;
    return { next, focus: digits && index < prev.length - 1 ? index + 1 : null };
  }
  const start = digits.length >= prev.length ? 0 : index;
  const chunk = digits.slice(0, prev.length - start).split('');
  chunk.forEach((d, k) => { next[start + k] = d; });
  return { next, focus: Math.min(start + chunk.length, prev.length - 1) };
}
