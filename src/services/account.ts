import { Platform } from 'react-native';
import api from './api';

// Deactivate / delete account (Settings > Account) and notification preferences.
// Every /account/* endpoint 404s until the backend turns on ACCOUNT_LIFECYCLE_ENABLED.

export type AccountAction = 'deactivate' | 'delete';
export type DurationKey = '1w' | '15d' | '1m' | '3m' | '6m' | '1y';
export type Ledger = 'pickup' | 'reward';

export type QuickFix =
  | { type: 'screen'; target: string }
  | { type: 'suggest'; target: string }
  | { type: 'text_input' }
  | null;

export type SurveyAnswer = { key: string; label: string; quickFix: QuickFix };
export type ExitSurvey = { path: AccountAction; question: string; answers: SurveyAnswer[] };

export type EligibilityBlocker = {
  code: string;
  message: string;
  meta?: { ledger?: Ledger; balance?: number; minimum?: number };
};

export type DeletionEligibility = {
  eligible: boolean;
  blockers: EligibilityBlocker[];
  balances: Record<Ledger, number>;
  minimums: Record<Ledger, number>;
  forfeitable: Record<Ledger, number>;
  willLose: { key: string; label: string }[];
};

export type OtpRequest = {
  requestId: string;
  otpChannel: string;
  maskedDestination: string;
  retryAfter: number;
  expiresAt: string;
};

export type ConfirmResult = {
  accountStatus: 'deactivated' | 'pending_deletion';
  effectiveUntil: string;
  autoReactivate?: boolean;
  cancelledBookings: number;
};

export type StartRequestBody = {
  type: AccountAction;
  durationKey?: DurationKey;
  autoReactivate?: boolean;
  surveyAnswer: string;
  surveyText?: string;
  acceptForfeit?: boolean;
};

export type NotificationChannel = 'push' | 'email' | 'sms';
export type NotificationKind = 'offers' | 'updates';
export type NotificationPrefs = Record<NotificationChannel, Record<NotificationKind, boolean>>;

const PLATFORM = Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android';

const unwrap = (response: any) => response.data?.data ?? response.data;

// Branch on the error `code`, never on `message`.
export const errorCode = (error: any): string | undefined => error?.response?.data?.code;
export const errorData = (error: any): any => error?.response?.data?.data;
export const errorStatus = (error: any): number | undefined => error?.response?.status;

// 429s come back as plain text, not JSON.
export const errorMessage = (error: any, fallback = 'Something went wrong. Please try again.') => {
  if (!error?.response) return 'Please check your internet connection and try again.';
  const body = error.response.data;
  if (typeof body === 'string' && body.trim()) return body.trim();
  return body?.message || fallback;
};

export const accountService = {
  // 404 means the feature isn't live yet — callers hide the entry point.
  getStatus: async () => unwrap(await api.get('/api/v1/account/status')),

  getExitSurvey: async (path: AccountAction): Promise<ExitSurvey> =>
    unwrap(await api.get('/api/v1/account/exit-survey', { params: { path } })),

  // Fire and forget: only analytics on which quick fix pulled the user out.
  reportQuickFix: (path: AccountAction, answer: string, requestId?: string) => {
    api.post('/api/v1/account/exit-survey/quick-fix', { path, answer, ...(requestId ? { requestId } : {}) }).catch(() => {});
  },

  getDeletionEligibility: async (): Promise<DeletionEligibility> =>
    unwrap(await api.get('/api/v1/account/deletion-eligibility')),

  // Sends the OTP.
  startRequest: async (body: StartRequestBody): Promise<OtpRequest> =>
    unwrap(await api.post('/api/v1/account/requests', { ...body, platform: PLATFORM })),

  resendOtp: async (requestId: string): Promise<{ retryAfter: number }> =>
    unwrap(await api.post(`/api/v1/account/requests/${requestId}/resend-otp`)),

  // On success the session (including this token) is already revoked server-side.
  confirm: async (requestId: string, otp: string): Promise<ConfirmResult> =>
    unwrap(await api.post(`/api/v1/account/requests/${requestId}/confirm`, { otp })),

  getNotificationPrefs: async (): Promise<NotificationPrefs> =>
    unwrap(await api.get('/api/v1/users/notification-preferences')),

  // Send only what changed; the response is the full updated set.
  updateNotificationPrefs: async (patch: Partial<Record<NotificationChannel, Partial<Record<NotificationKind, boolean>>>>): Promise<NotificationPrefs> =>
    unwrap(await api.patch('/api/v1/users/notification-preferences', patch)),
};

export const formatDay = (iso?: string | Date | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
