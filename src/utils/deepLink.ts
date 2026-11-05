import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Remembers a protected URL the user landed on while logged out (e.g. the email
// "Track pickup" link -> /OrderTracking?bookingId=...), so that after they log in
// we can send them straight to it instead of dropping them on the dashboard.
let pendingUrl: string | null = null;

// True when the app was opened via a referral link (?ref=CODE). Used to send a
// logged-out visitor to Login (the signup form) even when the link's path has no
// matching route and would otherwise resolve to NotFound.
let pendingReferral = false;

// Authenticated routes worth returning to after login. Path is matched
// case-insensitively against the link's pathname.
const PROTECTED = [
  '/ordertracking',
  '/bookingdetails',
  '/wallet',
  '/orders',
  '/store',
  '/profile',
  '/redeem',
  '/redeemhistory',
  '/quiz',
  '/referral',
  '/schedulepickup',
  '/knowledgehub',
  '/donation',
  '/transfer',
];

// Screens inside the tab navigator, which a navigate from the root stack must name
// through 'App'.
const TAB_SCREENS = ['Dashboard', 'Orders', 'Wallet', 'Store'];

function rememberIfProtected(pathname: string, search: string): void {
  const path = (pathname || '').replace(/\/+$/, '').toLowerCase();
  if (PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
    pendingUrl = pathname + search;
  }
}

// Capture as early as possible (before the router rewrites the URL). No-op unless
// the current URL is a protected route on web.
export function capturePendingDeepLink(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  // Referral link opened while logged out. The share link is /login?ref=CODE (older
  // links used /register?ref=CODE, which has no route and lands on NotFound). Grab the
  // code here, before the router rewrites the URL and drops the query string, and store
  // it under the same key the signup form reads. Also flag it so onReady can send the
  // user to Login regardless of the path they arrived on.
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && ref.trim()) {
      pendingReferral = true;
      AsyncStorage.setItem('pendingReferralCode', ref.trim().toUpperCase()).catch(() => {});
    }
  } catch (_) { /* URL not parseable */ }

  rememberIfProtected(window.location.pathname, window.location.search);
}

// Native: an App Link (https://karmaverse.earth/Wallet, an email "Track pickup" link)
// opened while logged out. Returns true if it was a protected link and was remembered.
export function capturePendingAppLink(url: string | null): boolean {
  const m = url?.match(/^https:\/\/karmaverse\.earth(\/[^?#]*)(\?[^#]*)?/i);
  if (!m) return false;
  rememberIfProtected(m[1], m[2] || '');
  return !!pendingUrl;
}

export function hasPendingReferral(): boolean {
  return pendingReferral;
}

export function clearPendingDeepLink(): void {
  pendingUrl = null;
}

export function hasPendingDeepLink(): boolean {
  return !!pendingUrl;
}

// After a successful login, send the user to the remembered deep link (once).
// Returns true if it navigated. Route name comes from the path; query params
// (e.g. ?bookingId=) become navigation params.
export function consumePendingDeepLink(navigation: any): boolean {
  if (!pendingUrl || !navigation) return false;
  const url = pendingUrl;
  pendingUrl = null;
  try {
    const qIdx = url.indexOf('?');
    const routeName = (qIdx >= 0 ? url.slice(0, qIdx) : url).replace(/^\/+|\/+$/g, '');
    if (!routeName) return false;
    const params: Record<string, string> = {};
    const query = qIdx >= 0 ? url.slice(qIdx + 1) : '';
    if (query) {
      query.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    if (TAB_SCREENS.includes(routeName)) {
      navigation.navigate('App', { screen: routeName, params });
    } else {
      navigation.navigate(routeName, params);
    }
    return true;
  } catch (_) {
    return false;
  }
}
