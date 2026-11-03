import { removeToken } from './tokenStore';
import { navigationRef } from '../navigation/navRef';

// 401 codes meaning the account was deactivated/deleted (or the session revoked)
// on another device. Sent on any API call and on socket connect_error.
export const FORCE_LOGOUT_CODES = new Set([
  'ACCOUNT_DEACTIVATED',
  'ACCOUNT_PENDING_DELETION',
  'ACCOUNT_BEING_DELETED',
  'ACCOUNT_DELETED',
  'SESSION_REVOKED',
]);

// While the user's own deactivate/delete confirms, the backend revokes the session
// and drops the socket. Those failures are expected: the account screen shows its
// own result, so they must not bounce the user to Login mid-flow.
let endingSession = false;
export function setEndingSession(value: boolean) {
  endingSession = value;
}

export async function forceLogout(reason?: string) {
  await removeToken();
  if (endingSession) return;
  try {
    const current = navigationRef.current?.getCurrentRoute?.()?.name;
    if (navigationRef.current && current && !['Login', 'Splash'].includes(current)) {
      navigationRef.current.reset({ index: 0, routes: [{ name: 'Login', params: reason ? { reason } : undefined }] });
    }
  } catch (_) { /* navigator not ready */ }
}
