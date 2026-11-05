import api from './api';
import { authService } from './auth';
import { redeemService } from './redeem';
import { extractList } from '../utils/apiList';
import { LedgerType } from '../utils/streakTiers';
import { mockPayoutService } from './payoutMock';

// Coin withdrawal through RazorpayX. The app only talks to our backend; the
// backend talks to Razorpay. Until the backend ships /payout-methods (404), the
// Redeem screen keeps the old manual bank form.
//
// EXPO_PUBLIC_PAYOUT_MOCK=1 swaps in an in-memory backend (see payoutMock.ts) so
// the flow can be built and QA'd before the real one is deployed.
export const PAYOUT_MOCK = process.env.EXPO_PUBLIC_PAYOUT_MOCK === '1';

export const OTP_PURPOSE_ADD_METHOD = 'add-payout-method';
export const OTP_PURPOSE_WITHDRAW = 'withdrawal';
export const MAX_PAYOUT_METHODS = 3;

export type PayoutMethodStatus = 'VALIDATING' | 'VERIFIED' | 'NAME_MISMATCH' | 'FAILED';

export type PayoutMethod = {
  _id: string;
  type: 'bank' | 'upi';
  bankName?: string;
  last4?: string;
  upiId?: string;
  status: PayoutMethodStatus;
  usableFrom?: string | null;
  verifiedName?: string;
  createdAt?: string;
};

export type NewPayoutMethod =
  | { type: 'bank'; accountHolderName: string; accountNumber: string; ifsc: string }
  | { type: 'upi'; upiId: string };

export type WithdrawQuote = {
  balance: number;
  rate: number;
  amountInRupees: number;
  fee: number;
  youReceive: number;
  minRupees: number;
  maxRupees?: number;
  meetsMinimum: boolean;
  otpRequired: boolean;
};

// REJECTED only appears on requests from the old manual flow.
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REVERSED' | 'REJECTED';

export type Withdrawal = {
  _id: string;
  status: WithdrawalStatus;
  ledger: LedgerType;
  coinsRedeemed: number;
  rateApplied: number;
  amountInRupees: number;
  streakTier?: string;
  payoutMethod?: Pick<PayoutMethod, 'type' | 'bankName' | 'last4' | 'upiId'>;
  utr?: string;
  failureReason?: string;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
};

export type WithdrawBody = {
  ledger: LedgerType;
  coinsToRedeem: number;
  payoutMethodId: string;
  otpToken?: string;
};

const unwrap = (response: any) => response.data?.data ?? response.data;

const realPayoutService = {
  // null when the backend doesn't have payouts yet.
  listMethods: async (): Promise<PayoutMethod[] | null> => {
    try {
      return extractList<PayoutMethod>((await api.get('/api/v1/payout-methods')).data);
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  addMethod: async (method: NewPayoutMethod, otpToken: string): Promise<PayoutMethod> =>
    unwrap(await api.post('/api/v1/payout-methods', { ...method, otpToken })),

  getMethod: async (id: string): Promise<PayoutMethod> =>
    unwrap(await api.get(`/api/v1/payout-methods/${id}`)),

  removeMethod: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/payout-methods/${id}`);
  },

  getQuote: async (ledger: LedgerType, coins: number): Promise<WithdrawQuote> =>
    unwrap(await api.get('/api/v1/redeem/quote', { params: { ledger, coins } })),

  // The app sends coins only; the server works out the rupees.
  withdraw: async (body: WithdrawBody, idempotencyKey: string): Promise<Withdrawal> =>
    unwrap(await api.post('/api/v1/redeem', body, { headers: { 'Idempotency-Key': idempotencyKey } })),

  getWithdrawal: async (id: string): Promise<Withdrawal> =>
    unwrap(await api.get(`/api/v1/redeem/${id}`)),

  getMyWithdrawals: async (): Promise<Withdrawal[]> => redeemService.getMyRequests(),

  sendOtp: async (phone: string, purpose: string): Promise<void> => {
    await authService.sendOtp(phone, purpose);
  },

  verifyOtp: async (phone: string, otp: string, purpose: string): Promise<string> => {
    const res = await authService.verifyOtp(phone, otp, purpose);
    const token = res?.data?.otpToken ?? res?.otpToken;
    if (!token) throw new Error('No otpToken received');
    return token;
  },
};

export type PayoutService = typeof realPayoutService;

export const payoutService: PayoutService = PAYOUT_MOCK ? mockPayoutService : realPayoutService;

// One key per confirm screen. A retry or a second tap reuses it, so the server
// creates at most one withdrawal.
export const newIdempotencyKey = () =>
  `wd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

export const methodLabel = (m?: Pick<PayoutMethod, 'type' | 'bankName' | 'last4' | 'upiId'> | null) => {
  if (!m) return '';
  if (m.type === 'upi') return m.upiId || 'UPI';
  return `${m.bankName || 'Bank account'} ••${m.last4 || ''}`;
};

export const isUsable = (m: PayoutMethod, now = Date.now()) =>
  m.status === 'VERIFIED' && (!m.usableFrom || new Date(m.usableFrom).getTime() <= now);

export const formatDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const formatInr = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`;

// The design doc names HTTP statuses, not error codes, so map by status and
// prefer the server's own message when there is one. 429s are plain text.
export const payoutErrorMessage = (error: any, fallback = 'Something went wrong. Please try again.') => {
  if (!error?.response) return 'Please check your internet connection and try again.';
  const { status, data } = error.response;
  const serverMsg = typeof data === 'string' ? data.trim() : data?.message;
  switch (status) {
    case 409: return serverMsg || 'You already have a withdrawal in progress. Please wait for it to finish.';
    case 429: return serverMsg || "You've reached the withdrawal limit for today. Please try again tomorrow.";
    case 503: return serverMsg || 'Withdrawals are paused for a short while. Please try again later.';
  }
  const usableFrom = data?.data?.usableFrom;
  if (usableFrom) return `This account can be used from ${formatDateTime(usableFrom)}.`;
  return serverMsg || fallback;
};
