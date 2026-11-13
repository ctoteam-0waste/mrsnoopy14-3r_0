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

// Booking pushes reach us under several names (the push `type`, the socket `event`,
// or a generic type plus the booking `status`), so they are grouped by meaning:
// in progress → Live tracking, completed → Booking details, cancelled → Orders.
type BookingStage = 'progress' | 'completed' | 'cancelled';
const PROGRESS_KINDS = ['BOOKING_ACCEPTED', 'AGENT_ASSIGNED', 'AGENT_REACHED', 'AGENT_ARRIVED', 'BOOKING_PICKED_UP',
  'PICKED_UP', 'BOOKING_IN_POOL', 'PICKUP_REMINDER', 'BOOKING_CONFIRMED', 'BOOKING_CREATED', 'AGENT_ON_THE_WAY'];
const PROGRESS_STATUSES = ['PENDING', 'SCHEDULED', 'ACCEPTED', 'ASSIGNED', 'REACHED', 'ARRIVED', 'PICKED_UP', 'IN_PROGRESS', 'VERIFICATION'];

function bookingStage(kind: string, status: string): BookingStage | null {
  if (kind.includes('CANCEL') || status === 'CANCELLED') return 'cancelled';
  if (kind === 'BOOKING_COMPLETED' || kind === 'RATING_REQUEST' || kind === 'PICKUP_COMPLETED' || status === 'COMPLETED') return 'completed';
  if (PROGRESS_KINDS.includes(kind) || PROGRESS_STATUSES.includes(status)) return 'progress';
  return null;
}

// Types with no booking and no explicit target still open their feature.
function screenForKind(kind: string): string | undefined {
  if (TYPE_SCREEN[kind]) return TYPE_SCREEN[kind];
  if (/QUIZ|STREAK/.test(kind)) return 'Quiz';
  if (/REFERR/.test(kind)) return 'Referral';
  if (/REDEEM|WITHDRAW|PAYOUT/.test(kind)) return 'RedeemHistory';
  if (/COIN|WALLET|CREDIT|TRANSFER|BONUS/.test(kind)) return 'Wallet';
  if (/OFFER|STORE|VOUCHER/.test(kind)) return 'Store';
  if (/BOOKING|PICKUP|ORDER/.test(kind)) return 'Orders';
  return undefined;
}

// A tap that arrives before the navigator is ready (the app was closed and is
// still starting) waits here; RootNavigator replays it once navigation is ready.
let pendingTap: { data: any; actionIdentifier?: string } | null = null;

export function flushPendingNotification(): void {
  const tap = pendingTap;
  pendingTap = null;
  if (tap) routeNotification(tap.data, tap.actionIdentifier);
}

export function dropPendingNotification(): void {
  pendingTap = null;
}

export function routeNotification(data: any, actionIdentifier?: string): void {
  const nav: any = navigationRef.current;
  if (!nav || !nav.isReady?.()) { pendingTap = { data, actionIdentifier }; return; }

  const bookingId = data?.bookingId || data?.booking?._id || data?.booking_id;
  const booking = bookingId ? { _id: String(bookingId) } : undefined;
  const kind = String(data?.type || data?.event || data?.notificationType || '').toUpperCase();
  const status = String(data?.status || data?.bookingStatus || '').toUpperCase();
  const target = data?.screen || data?.route;
  const openTracking = () => nav.navigate('OrderTracking', { bookingId: String(bookingId) });
  const openDetails = () => nav.navigate('BookingDetails', { booking });
  const openOrders = () => nav.navigate('App', { screen: 'Orders', params: { tab: 'History' } });

  // ── An action button was tapped — route by the button, not the default target. ──
  if (actionIdentifier && actionIdentifier !== DEFAULT_ACTION) {
    switch (actionIdentifier) {
      case 'track':
        if (booking) openTracking();
        return;
      case 'rate':
      case 'view':
        if (booking) openDetails();
        return;
      case 'orders':
        openOrders();
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

  // ── TRANSACTIONAL — the pickup lifecycle. ──
  const stage = bookingStage(kind, status);
  if (stage === 'cancelled') { openOrders(); return; }
  if (booking && stage === 'progress') { openTracking(); return; }
  if (booking && stage === 'completed') { openDetails(); return; }

  // ── Everything else (engagement / marketing, payouts, alerts). Route by the
  //    explicit target the backend set, then by the type. ──
  if (target === 'OrderTracking' && booking) { openTracking(); return; }
  if (target === 'BookingDetails' && booking) { openDetails(); return; }
  if (goToScreen(nav, target)) return;

  // Fallback: a booking-linked notification of an unknown type → booking details.
  if (booking) { openDetails(); return; }
  goToScreen(nav, screenForKind(kind));
}
