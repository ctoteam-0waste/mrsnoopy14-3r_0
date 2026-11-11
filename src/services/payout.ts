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

// NAME_MISMATCH is under review by our team; it ends VERIFIED or REJECTED.
export type PayoutMethodStatus = 'VALIDATING' | 'VERIFIED' | 'NAME_MISMATCH' | 'FAILED' | 'REJECTED';

// Full account numbers are never returned: maskedAccount is "••9012" for a bank
// account and "ra••@okhdfcbank" for a UPI ID.
export type PayoutMethod = {
  _id: string;
  type: 'bank' | 'upi';
  bankName?: string | null;
  maskedAccount: string;
  accountHolderName?: string | null;
  verifiedName?: string | null;
  status: PayoutMethodStatus;
  usableFrom?: string | null;
  // Shown to the user for NAME_MISMATCH, FAILED and REJECTED.
  failureReason?: string | null;
  createdAt?: string;
};

export type NewPayoutMethod =
  | { type: 'bank'; accountHolderName: string; accountNumber: string; ifsc: string }
  | { type: 'upi'; vpa: string };

export type BlockedCode =
  | 'WITHDRAWALS_PAUSED' | 'INSUFFICIENT_BALANCE' | 'BELOW_MINIMUM' | 'ABOVE_MAXIMUM'
  | 'WITHDRAWAL_IN_PROGRESS' | 'DAILY_LIMIT' | 'MONTHLY_LIMIT' | 'ACCOUNT_NOT_READY';

// A preview only; POST /redeem checks everything again. fee and youReceive are
// null until an account is chosen (IMPS and UPI fees differ).
export type WithdrawQuote = {
  ledger: LedgerType;
  coins: number;
  balance: number;
  rate: number;
  tier?: string | null;
  amountInRupees: number;
  payoutMethodId: string | null;
  payoutMode: 'IMPS' | 'UPI' | null;
  fee: number | null;
  youReceive: number | null;
  minRupees: number;
  maxRupees: number;
  remainingTodayRupees: number;
  remainingThisMonthRupees: number;
  withdrawalsEnabled: boolean;
  sufficientBalance: boolean;
  meetsMinimum: boolean;
  otpRequired: boolean;
  accountReady: boolean | null;
  canWithdraw: boolean;
  blockedReason: { code: BlockedCode; message: string } | null;
};

// REJECTED only appears on requests from the old manual flow.
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REVERSED' | 'REJECTED';

// payoutMethod is the account's id. Old manual requests have maskedAccount but no
// payoutMode or fee fields. failureReason is a code for support, not user text.
export type Withdrawal = {
  _id: string;
  status: WithdrawalStatus;
  ledger: LedgerType;
  coinsRedeemed: number;
  rateApplied: number;
  amountInRupees: number;
  streakTier?: string | null;
  payoutMethod?: string | null;
  maskedAccount?: string | null;
  payoutMode?: 'IMPS' | 'UPI' | null;
  feeInPaise?: number | null;
  payoutAmountInPaise?: number | null;
  utr?: string | null;
  failureReason?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  processedAt?: string | null;
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

  // With payoutMethodId the quote also has the fee and the amount received.
  getQuote: async (ledger: LedgerType, coins: number, payoutMethodId?: string | null): Promise<WithdrawQuote> =>
    unwrap(await api.get('/api/v1/redeem/quote', { params: { ledger, coins, ...(payoutMethodId ? { payoutMethodId } : {}) } })),

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

// One key per confirm screen (16-128 of letters, digits, - and _). A retry or a
// second tap reuses it, so the server creates at most one withdrawal.
export const newIdempotencyKey = () =>
  `wd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

export const methodLabel = (m?: Pick<PayoutMethod, 'type' | 'bankName' | 'maskedAccount'> | null) => {
  if (!m) return '';
  if (m.type === 'upi') return m.maskedAccount || 'UPI ID';
  return `${m.bankName || 'Bank account'} ${m.maskedAccount || ''}`.trim();
};

// The account a withdrawal went to, from its own masked number (the account may
// have been removed since). Falls back to the saved account when given.
export const withdrawalAccountLabel = (w: Pick<Withdrawal, 'maskedAccount' | 'payoutMode' | 'payoutMethod'>, methods: PayoutMethod[] = []) => {
  const saved = methods.find((m) => m._id === w.payoutMethod);
  if (saved) return methodLabel(saved);
  if (!w.maskedAccount) return '';
  if (w.payoutMode === 'UPI' || w.maskedAccount.includes('@')) return w.maskedAccount;
  return `Bank account ${w.maskedAccount}`;
};

// Rupees for a withdrawal: the amount, the fee and what reached the account.
export const withdrawalMoney = (w: Pick<Withdrawal, 'amountInRupees' | 'feeInPaise' | 'payoutAmountInPaise'>) => ({
  amount: Number(w.amountInRupees) || 0,
  fee: typeof w.feeInPaise === 'number' ? w.feeInPaise / 100 : null,
  received: typeof w.payoutAmountInPaise === 'number' ? w.payoutAmountInPaise / 100 : null,
});

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
    case 422: return 'Something changed since you opened this screen. Please check the details and confirm again.';
    case 409: return serverMsg || 'You already have a withdrawal in progress. Please wait for it to finish.';
    case 429: return serverMsg || "You've reached the withdrawal limit for today. Please try again tomorrow.";
    case 503: return serverMsg || 'Withdrawals are paused for a short while. Please try again later.';
  }
  const usableFrom = data?.data?.usableFrom;
  if (usableFrom) return `This account can be used from ${formatDateTime(usableFrom)}.`;
  return serverMsg || fallback;
};
