import { navigationRef } from '../navigation/navRef';

// Single source of truth for "a notification was opened → go to the right screen".
// Used by BOTH the push handler (RootNavigator, on a system-notification tap) and
// the in-app notification panel (on a card tap), so every notification — transactional
// or not — deep-links the same way.
//
// A notification carries: `type` (the event), optional `bookingId`, optional `screen`
// or `route` (an explicit target the backend can set — its push templates send
// `route`), and — for a tapped action button — an `actionIdentifier`.

// A plain body tap arrives as the DEFAULT action; action buttons send their own id.
export const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

// Screens a marketing / engagement notification may open. Anything off this list is
// ignored, so a bad or spoofed `screen` can never push the user somewhere unexpected.
const TAB_SCREENS = ['Dashboard', 'Orders', 'Wallet', 'Store'];
const STACK_SCREENS = ['Quiz', 'Redeem', 'RedeemHistory', 'Referral', 'SchedulePickup', 'KnowledgeHub', 'Donation', 'Transfer', 'AboutUs', 'Profile'];

// ── Non-transactional (engagement / marketing) types → their home screen ──
// So these deep-link by type alone, even when the backend doesn't set `screen`.
const TYPE_SCREEN: Record<string, string> = {
  QUIZ_COMPLETED: 'Quiz',
  QUIZ_REMINDER: 'Quiz',
  STREAK_REMINDER: 'Quiz',
  REDEEM_REMINDER: 'Redeem',
  COINS_REMINDER: 'Wallet',
  PICKUP_REMINDER: 'SchedulePickup',
  REFERRAL_NUDGE: 'Referral',
  OFFER: 'Store',
};

function goToScreen(nav: any, screen?: string): boolean {
  if (!screen) return false;
  if (TAB_SCREENS.includes(screen)) { nav.navigate('App', { screen }); return true; }
  if (STACK_SCREENS.includes(screen)) { nav.navigate(screen); return true; }
  return false;
}

export function routeNotification(data: any, actionIdentifier?: string): void {
  const nav: any = navigationRef.current;
  if (!nav) return;

  const bookingId = data?.bookingId;
  const booking = bookingId ? { _id: bookingId } : undefined;
  const target = data?.screen || data?.route;

  // ── An action button was tapped — route by the button, not the default target. ──
  if (actionIdentifier && actionIdentifier !== DEFAULT_ACTION) {
    switch (actionIdentifier) {
      case 'track':
        if (booking) nav.navigate('OrderTracking', { booking });
        return;
      case 'rate':
      case 'view':
        if (booking) nav.navigate('BookingDetails', { booking });
        return;
      case 'orders':
        nav.navigate('App', { screen: 'Orders' });
        return;
      case 'open_quiz': nav.navigate('Quiz'); return;
      case 'open_redeem': nav.navigate('Redeem'); return;
      case 'open_pickup': nav.navigate('SchedulePickup'); return;
      case 'open_referral': nav.navigate('Referral'); return;
      case 'open':
        if (goToScreen(nav, target)) return;
        break;
    }
  }

  // ── TRANSACTIONAL — the pickup lifecycle. In-progress states open live tracking,
  //    a completed pickup opens its details, a cancellation opens the orders list. ──
  switch (data?.type) {
    case 'BOOKING_ACCEPTED':
    case 'AGENT_REACHED':
    case 'BOOKING_PICKED_UP':
    case 'BOOKING_IN_POOL':
    case 'PICKUP_REMINDER':
      if (booking) { nav.navigate('OrderTracking', { booking }); return; }
      break;
    case 'BOOKING_COMPLETED':
    case 'RATING_REQUEST':
      if (booking) { nav.navigate('BookingDetails', { booking }); return; }
      break;
    case 'BOOKING_CANCEL_SUCCESS':
      nav.navigate('App', { screen: 'Orders' });
      return;
  }

  // ── Everything else (engagement / marketing, payouts, alerts). Route by the
  //    explicit target the backend set, then by a known type. ──
  if (target === 'OrderTracking' && booking) { nav.navigate('OrderTracking', { booking }); return; }
  if (goToScreen(nav, target)) return;
  if (data?.type && goToScreen(nav, TYPE_SCREEN[data.type])) return;

  // Fallback: any booking-linked notification with no/unknown type → booking details.
  if (booking) nav.navigate('BookingDetails', { booking });
}
