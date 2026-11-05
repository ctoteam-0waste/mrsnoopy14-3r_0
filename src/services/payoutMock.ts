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
//   Verified accounts become usable after 30 seconds (24 hours on the real backend).
//   Withdrawals above ₹1,000 need an OTP. A coin amount ending in 7 fails and refunds.

const MIN_RUPEES = 50;
const MAX_RUPEES = 2000;
const OTP_ABOVE_RUPEES = 1000;
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

export const mockPayoutService: PayoutService = {
  listMethods: async () => { await wait(); return methods.map((m) => ({ ...m })); },

  addMethod: async (input: NewPayoutMethod, otpToken: string) => {
    await wait(900);
    if (otpToken !== 'mock-otp-token') throw fail(400, 'Your code has expired. Please request a new one.');
    if (methods.length >= 3) throw fail(400, 'You can save up to 3 accounts. Remove one to add another.');
    const key = input.type === 'bank' ? input.accountNumber : input.upiId.toLowerCase();
    const outcome =
      (input.type === 'bank' && key.endsWith('0000')) || (input.type === 'upi' && key.startsWith('mismatch')) ? 'NAME_MISMATCH'
      : (input.type === 'bank' && key.endsWith('1111')) || (input.type === 'upi' && key.startsWith('fail')) ? 'FAILED'
      : 'VERIFIED';
    const m: PayoutMethod = input.type === 'bank'
      ? { _id: id('pm'), type: 'bank', bankName: BANKS[input.ifsc.slice(0, 4)] || `${input.ifsc.slice(0, 4)} Bank`, last4: input.accountNumber.slice(-4), status: 'VALIDATING', createdAt: new Date().toISOString() }
      : { _id: id('pm'), type: 'upi', upiId: input.upiId.toLowerCase(), status: 'VALIDATING', createdAt: new Date().toISOString() };
    methods.push(m);
    setTimeout(() => {
      m.status = outcome;
      if (outcome === 'VERIFIED') {
        m.verifiedName = input.type === 'bank' ? input.accountHolderName.toUpperCase() : 'VERIFIED NAME';
        m.usableFrom = new Date(Date.now() + USABLE_AFTER_MS).toISOString();
      }
    }, 5000);
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

  getQuote: async (ledger: LedgerType, coins: number): Promise<WithdrawQuote> => {
    await wait(350);
    const { balance, rate } = await balanceAndRate(ledger);
    const amountInRupees = paise(coins, rate) / 100;
    return {
      balance, rate, amountInRupees, fee: 0, youReceive: amountInRupees,
      minRupees: MIN_RUPEES, maxRupees: MAX_RUPEES,
      meetsMinimum: amountInRupees >= MIN_RUPEES,
      otpRequired: amountInRupees > OTP_ABOVE_RUPEES,
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
    if (amountInRupees > OTP_ABOVE_RUPEES && body.otpToken !== 'mock-otp-token') throw fail(400, 'Please confirm this withdrawal with the code sent to your phone.');

    spent[body.ledger] += body.coinsToRedeem;
    const w: Withdrawal = {
      _id: id('wd'), status: 'PENDING', ledger: body.ledger, coinsRedeemed: body.coinsToRedeem,
      rateApplied: rate, amountInRupees,
      payoutMethod: { type: m.type, bankName: m.bankName, last4: m.last4, upiId: m.upiId },
      createdAt: new Date().toISOString(),
    };
    withdrawals.unshift(w);
    byKey.set(idempotencyKey, w);
    setTimeout(() => { w.status = 'PROCESSING'; }, 3000);
    setTimeout(() => {
      if (body.coinsToRedeem % 10 === 7) {
        w.status = 'FAILED';
        w.failureReason = 'The bank declined this transfer.';
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
