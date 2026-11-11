import type { NewPayoutMethod, PayoutMethod, PayoutService, WithdrawBody, Withdrawal, WithdrawQuote } from './payout';
import { profileService } from './profile';
import { streakService } from './streak';
import { LedgerType, PICKUP_RATE } from '../utils/streakTiers';

// In-memory stand-in for the RazorpayX backend, on only with EXPO_PUBLIC_PAYOUT_MOCK=1.
// Balances come from the real profile; everything else lives here until reload.
//
// Rules for testing:
//   OTP 123456 is correct.
//   Account number ending 0000, or UPI ID starting "mismatch" → NAME_MISMATCH.
//   Account number ending 1111, or UPI ID starting "fail" → FAILED.
//   Account number ending 2222 → NAME_MISMATCH, then REJECTED after 15 seconds.
//   Verified accounts become usable after 30 seconds (24 hours on the real backend).
//   Withdrawals of ₹1,000 or more need an OTP. A coin amount ending in 7 fails and refunds.
//   Fee as on the real backend: IMPS ₹4 / ₹5 / ₹10, UPI ₹5 / ₹6 / ₹11.

const MIN_RUPEES = 100;
const MAX_RUPEES = 2000;
const DAILY_RUPEES = 2000;
const MONTHLY_RUPEES = 10000;
const OTP_FROM_RUPEES = 1000;
const USABLE_AFTER_MS = 30_000;

const methods: PayoutMethod[] = [];
const withdrawals: Withdrawal[] = [];
const byKey = new Map<string, Withdrawal>();
const spent: Record<LedgerType, number> = { pickup: 0, reward: 0 };

const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

const fail = (status: number, message: string, data?: any) => {
  const e: any = new Error(message);
  e.response = { status, data: { success: false, message, data } };
  return e;
};

const BANKS: Record<string, string> = { HDFC: 'HDFC Bank', SBIN: 'State Bank of India', ICIC: 'ICICI Bank', UTIB: 'Axis Bank', KKBK: 'Kotak Mahindra Bank', PUNB: 'Punjab National Bank' };

async function balanceAndRate(ledger: LedgerType) {
  const profile = await profileService.getProfile().catch(() => ({} as any));
  const raw = ledger === 'pickup' ? (profile.pickupCoins ?? 0) : (profile.rewardCoins ?? profile.coins ?? 0);
  const rate = ledger === 'pickup' ? PICKUP_RATE : ((await streakService.getStatus())?.rewardRate ?? 100);
  return { balance: Math.max(0, raw - spent[ledger]), rate };
}

const paise = (coins: number, rate: number) => Math.floor((coins * 100) / rate);

const feeRupees = (amount: number, mode: 'IMPS' | 'UPI') =>
  amount < 1000 ? (mode === 'UPI' ? 5 : 4) : amount <= 25000 ? (mode === 'UPI' ? 6 : 5) : (mode === 'UPI' ? 11 : 10);
const masked = (input: NewPayoutMethod) => {
  if (input.type === 'bank') return `••${input.accountNumber.slice(-4)}`;
  const [handle, domain] = input.vpa.toLowerCase().split('@');
  return `${handle.slice(0, 2)}••@${domain}`;
};
const modeOf = (m: PayoutMethod): 'IMPS' | 'UPI' => (m.type === 'upi' ? 'UPI' : 'IMPS');
const usedRupees = () => withdrawals
  .filter((w) => !['FAILED', 'REVERSED', 'REJECTED'].includes(w.status))
  .reduce((sum, w) => sum + w.amountInRupees, 0);

export const mockPayoutService: PayoutService = {
  listMethods: async () => { await wait(); return methods.map((m) => ({ ...m })); },

  addMethod: async (input: NewPayoutMethod, otpToken: string) => {
    await wait(900);
    if (otpToken !== 'mock-otp-token') throw fail(400, 'Your code has expired. Please request a new one.');
    if (methods.length >= 3) throw fail(400, 'You can save up to 3 accounts. Remove one to add another.');
    const key = input.type === 'bank' ? input.accountNumber : input.vpa.toLowerCase();
    if (methods.some((x) => x.type === input.type && x.maskedAccount === masked(input))) throw fail(409, 'You have already saved this account');
    const reject = input.type === 'bank' && key.endsWith('2222');
    const outcome =
      (input.type === 'bank' && (key.endsWith('0000') || reject)) || (input.type === 'upi' && key.startsWith('mismatch')) ? 'NAME_MISMATCH'
      : (input.type === 'bank' && key.endsWith('1111')) || (input.type === 'upi' && key.startsWith('fail')) ? 'FAILED'
      : 'VERIFIED';
    const m: PayoutMethod = {
      _id: id('pm'), type: input.type, maskedAccount: masked(input), status: 'VALIDATING', createdAt: new Date().toISOString(),
      bankName: input.type === 'bank' ? BANKS[input.ifsc.slice(0, 4)] || null : null,
      accountHolderName: input.type === 'bank' ? input.accountHolderName : null,
      verifiedName: null, usableFrom: null, failureReason: null,
    };
    methods.push(m);
    setTimeout(() => {
      m.status = outcome;
      if (outcome === 'VERIFIED') {
        m.verifiedName = input.type === 'bank' ? input.accountHolderName.toUpperCase() : 'VERIFIED NAME';
        m.usableFrom = new Date(Date.now() + USABLE_AFTER_MS).toISOString();
      } else if (outcome === 'NAME_MISMATCH') {
        m.verifiedName = 'SOMEONE ELSE';
        m.failureReason = 'The name at the bank does not match your profile name.';
      } else {
        m.failureReason = 'The bank said this account is closed or invalid.';
      }
    }, 5000);
    if (reject) {
      setTimeout(() => { m.status = 'REJECTED'; m.failureReason = 'Our team could not confirm this account belongs to you.'; }, 15000);
    }
    return { ...m };
  },

  getMethod: async (methodId: string) => {
    await wait(300);
    const m = methods.find((x) => x._id === methodId);
    if (!m) throw fail(404, 'Account not found');
    return { ...m };
  },

  removeMethod: async (methodId: string) => {
    await wait();
    const i = methods.findIndex((x) => x._id === methodId);
    if (i >= 0) methods.splice(i, 1);
  },

  getQuote: async (ledger: LedgerType, coins: number, payoutMethodId?: string | null): Promise<WithdrawQuote> => {
    await wait(350);
    const { balance, rate } = await balanceAndRate(ledger);
    const amountInRupees = paise(coins, rate) / 100;
    const m = payoutMethodId ? methods.find((x) => x._id === payoutMethodId) : undefined;
    if (payoutMethodId && !m) throw fail(404, 'Payout account not found');
    const mode = m ? modeOf(m) : null;
    const fee = mode ? feeRupees(amountInRupees, mode) : null;
    const used = usedRupees();
    const accountReady = m ? m.status === 'VERIFIED' && (!m.usableFrom || new Date(m.usableFrom).getTime() <= Date.now()) : null;
    const blockedReason: WithdrawQuote['blockedReason'] =
      coins > balance ? { code: 'INSUFFICIENT_BALANCE', message: `You only have ${balance.toLocaleString('en-IN')} coins in this wallet` }
      : amountInRupees < MIN_RUPEES ? { code: 'BELOW_MINIMUM', message: `Minimum withdrawal is ₹${MIN_RUPEES}` }
      : amountInRupees > MAX_RUPEES ? { code: 'ABOVE_MAXIMUM', message: `Maximum withdrawal is ₹${MAX_RUPEES.toLocaleString('en-IN')}` }
      : withdrawals.some((w) => w.status === 'PENDING' || w.status === 'PROCESSING') ? { code: 'WITHDRAWAL_IN_PROGRESS', message: 'You already have a withdrawal in progress' }
      : used + amountInRupees > DAILY_RUPEES ? { code: 'DAILY_LIMIT', message: `You can withdraw ₹${Math.max(0, DAILY_RUPEES - used)} more today` }
      : m && !accountReady ? { code: 'ACCOUNT_NOT_READY', message: m.status === 'VERIFIED' ? `This account can be used from ${new Date(m.usableFrom as string).toLocaleString('en-IN')}` : 'This account is not verified yet' }
      : null;
    return {
      ledger, coins, balance, rate, tier: null, amountInRupees,
      payoutMethodId: m?._id ?? null, payoutMode: mode,
      fee, youReceive: fee == null ? null : Math.max(0, amountInRupees - fee),
      minRupees: MIN_RUPEES, maxRupees: MAX_RUPEES,
      remainingTodayRupees: Math.max(0, DAILY_RUPEES - used),
      remainingThisMonthRupees: Math.max(0, MONTHLY_RUPEES - used),
      withdrawalsEnabled: true, sufficientBalance: coins <= balance, meetsMinimum: amountInRupees >= MIN_RUPEES,
      otpRequired: amountInRupees >= OTP_FROM_RUPEES, accountReady,
      canWithdraw: !blockedReason, blockedReason,
    };
  },

  withdraw: async (body: WithdrawBody, idempotencyKey: string) => {
    await wait(1000);
    const earlier = byKey.get(idempotencyKey);
    if (earlier) return { ...earlier };
    const m = methods.find((x) => x._id === body.payoutMethodId);
    if (!m || m.status !== 'VERIFIED') throw fail(400, 'This account is not verified yet.');
    if (m.usableFrom && new Date(m.usableFrom).getTime() > Date.now()) throw fail(400, 'New account', { usableFrom: m.usableFrom });
    if (withdrawals.some((w) => w.status === 'PENDING' || w.status === 'PROCESSING')) throw fail(409, 'You already have a withdrawal in progress. Please wait for it to finish.');
    const { balance, rate } = await balanceAndRate(body.ledger);
    if (body.coinsToRedeem > balance) throw fail(400, `Insufficient ${body.ledger} coins. Available: ${balance.toLocaleString('en-IN')}`);
    const amountInRupees = paise(body.coinsToRedeem, rate) / 100;
    if (amountInRupees < MIN_RUPEES) throw fail(400, `Minimum withdrawal is ₹${MIN_RUPEES}.`);
    if (amountInRupees > MAX_RUPEES) throw fail(400, `Maximum withdrawal is ₹${MAX_RUPEES.toLocaleString('en-IN')}.`);
    if (amountInRupees >= OTP_FROM_RUPEES && body.otpToken !== 'mock-otp-token') throw fail(400, 'An OTP is needed for withdrawals of ₹1000 or more');

    spent[body.ledger] += body.coinsToRedeem;
    const w: Withdrawal = {
      _id: id('wd'), status: 'PENDING', ledger: body.ledger, coinsRedeemed: body.coinsToRedeem,
      rateApplied: rate, amountInRupees,
      payoutMethod: m._id, maskedAccount: m.maskedAccount, payoutMode: modeOf(m),
      feeInPaise: feeRupees(amountInRupees, modeOf(m)) * 100,
      payoutAmountInPaise: Math.round((amountInRupees - feeRupees(amountInRupees, modeOf(m))) * 100),
      createdAt: new Date().toISOString(),
    };
    withdrawals.unshift(w);
    byKey.set(idempotencyKey, w);
    setTimeout(() => { w.status = 'PROCESSING'; }, 3000);
    setTimeout(() => {
      if (body.coinsToRedeem % 10 === 7) {
        w.status = 'FAILED';
        w.failureReason = 'beneficiary_bank_down';
        spent[body.ledger] -= body.coinsToRedeem;
      } else {
        w.status = 'PAID';
        w.utr = `HDFCR5${Date.now().toString().slice(-12)}`;
      }
      w.processedAt = new Date().toISOString();
    }, 9000);
    return { ...w };
  },

  getWithdrawal: async (withdrawalId: string) => {
    await wait(300);
    const w = withdrawals.find((x) => x._id === withdrawalId);
    if (!w) throw fail(404, 'Withdrawal not found');
    return { ...w };
  },

  getMyWithdrawals: async () => { await wait(); return withdrawals.map((w) => ({ ...w })); },

  sendOtp: async () => { await wait(); },

  verifyOtp: async (_phone: string, otp: string) => {
    await wait();
    if (otp !== '123456') throw fail(400, 'That code is not right. Please try again.');
    return 'mock-otp-token';
  },
};
