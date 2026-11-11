import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Coins, Landmark, AtSign, Plus, Trash2, Clock, CircleAlert, CircleX, CircleCheck, Loader, X } from 'lucide-react-native';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { OtpInput } from '../components/shared/OtpInput';
import { WithdrawalProgress, useLiveWithdrawal, isRefunded } from '../components/shared/WithdrawalProgress';
import { WebFooter } from '../components/shared/WebFooter';
import { profileService } from '../services/profile';
import { streakService } from '../services/streak';
import {
  payoutService, PayoutMethod, WithdrawQuote, MAX_PAYOUT_METHODS, OTP_PURPOSE_WITHDRAW,
  methodLabel, withdrawalAccountLabel, isUsable, formatDateTime, formatInr, payoutErrorMessage, newIdempotencyKey,
} from '../services/payout';
import { LedgerType, PICKUP_RATE } from '../utils/streakTiers';
import { showAlert } from '../utils/alert';
import { trackEvent } from '../utils/analytics';
import { useTheme, makeStyles } from '../theme';

const QUOTE_DEBOUNCE_MS = 400;
const METHOD_POLL_MS = 4000;
const RESEND_AFTER_S = 30;
const SHARES = [{ label: '25%', f: 0.25 }, { label: '50%', f: 0.5 }, { label: 'Max', f: 1 }];

function PrimaryButton({ label, onPress, disabled, loading }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, (disabled || loading) && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function WithdrawScreen({ navigation, route, initialMethods }: any) {
  const styles = useStyles();
  const { colors } = useTheme();

  const [ledger, setLedger] = useState<LedgerType>(route?.params?.ledger === 'reward' ? 'reward' : 'pickup');
  const [balances, setBalances] = useState<Record<LedgerType, number>>({
    pickup: route?.params?.ledger !== 'reward' ? route?.params?.balance || 0 : 0,
    reward: route?.params?.ledger === 'reward' ? route?.params?.balance || 0 : 0,
  });
  const [rewardRate, setRewardRate] = useState<number>(route?.params?.rewardRate || 100);
  const [tier, setTier] = useState<string>(route?.params?.tier || '');
  const [phone, setPhone] = useState('');

  const [methods, setMethods] = useState<PayoutMethod[]>(initialMethods || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const [coinsInput, setCoinsInput] = useState('');
  const [quote, setQuote] = useState<WithdrawQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteNonce, setQuoteNonce] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const idemKey = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  const otpToken = useRef('');

  const [withdrawal, setWithdrawal, statusSlow] = useLiveWithdrawal(null);

  const isPickup = ledger === 'pickup';
  const rate = isPickup ? PICKUP_RATE : rewardRate;
  const balance = balances[ledger];
  const coins = parseInt(coinsInput, 10) || 0;

  useEffect(() => {
    trackEvent('reward_view', { reward_context: 'withdraw', ledger });
  }, []);

  useEffect(() => {
    profileService.getProfile()
      .then((p: any) => {
        setBalances({ pickup: p.pickupCoins ?? 0, reward: p.rewardCoins ?? p.coins ?? 0 });
        if (p.phone) setPhone(String(p.phone));
      })
      .catch(() => {});
    streakService.getStatus().then((s) => {
      if (s) { setRewardRate(s.rewardRate); setTier(s.tier); }
    });
  }, []);

  const loadMethods = useCallback(async () => {
    try {
      const list = await payoutService.listMethods();
      if (list) setMethods(list);
    } catch {}
  }, []);

  // Coming back from Add account brings the new one in.
  useFocusEffect(useCallback(() => { loadMethods(); }, [loadMethods]));

  const validating = methods.some((m) => m.status === 'VALIDATING');
  useEffect(() => {
    if (!validating) return;
    const t = setInterval(loadMethods, METHOD_POLL_MS);
    return () => clearInterval(t);
  }, [validating, loadMethods]);

  // Re-check the 24-hour wait without a reload.
  const waiting = methods.some((m) => m.status === 'VERIFIED' && !isUsable(m, now));
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [waiting]);

  useEffect(() => {
    const current = methods.find((m) => m._id === selectedId);
    if (current && isUsable(current, now)) return;
    const firstUsable = methods.find((m) => isUsable(m, now));
    setSelectedId(firstUsable?._id ?? null);
  }, [methods, now]);

  const overBalance = coins > balance;
  const selectedForQuote = methods.find((m) => m._id === selectedId && isUsable(m, now))?._id ?? null;

  // The quote is only a preview; the server checks everything again on submit.
  // With the chosen account it also carries the fee and the amount received.
  const quoteSeq = useRef(0);
  useEffect(() => {
    setQuoteError('');
    if (coins <= 0 || overBalance) { setQuote(null); setQuoting(false); return; }
    const seq = ++quoteSeq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const q = await payoutService.getQuote(ledger, coins, selectedForQuote);
        if (seq !== quoteSeq.current) return;
        setQuote({ ...q, coins, ledger, payoutMethodId: q.payoutMethodId ?? selectedForQuote });
        if (typeof q.balance === 'number') setBalances((b) => ({ ...b, [ledger]: q.balance }));
      } catch (e) {
        if (seq !== quoteSeq.current) return;
        setQuote(null);
        setQuoteError(payoutErrorMessage(e, 'Could not work out the amount. Please try again.'));
      } finally {
        if (seq === quoteSeq.current) setQuoting(false);
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [coins, ledger, overBalance, quoteNonce, selectedForQuote]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // A failed or reversed payout puts the coins back.
  const refundedId = useRef('');
  useEffect(() => {
    if (!withdrawal || !isRefunded(withdrawal.status) || refundedId.current === withdrawal._id) return;
    refundedId.current = withdrawal._id;
    setBalances((b) => ({ ...b, [withdrawal.ledger]: b[withdrawal.ledger] + withdrawal.coinsRedeemed }));
  }, [withdrawal?.status]);

  const freshQuote = quote && quote.coins === coins && quote.ledger === ledger && (quote.payoutMethodId ?? null) === selectedForQuote ? quote : null;
  const selected = methods.find((m) => m._id === selectedId) || null;
  // The server decides: canWithdraw and blockedReason cover the minimum and
  // maximum, daily and monthly limits, a withdrawal in progress, a paused service
  // and an account still in its 24-hour wait.
  const blocked = freshQuote && !freshQuote.canWithdraw ? freshQuote.blockedReason : null;
  const canWithdraw = !!freshQuote && !quoting && !overBalance && freshQuote.canWithdraw && freshQuote.youReceive != null && !!selected && isUsable(selected, now);

  const switchLedger = (l: LedgerType) => {
    if (l === ledger) return;
    setLedger(l);
    setCoinsInput('');
    setQuote(null);
  };

  const sendWithdrawOtp = async () => {
    if (!phone) { setOtpError('Please add a phone number to your profile first.'); return; }
    setOtpSending(true);
    try {
      await payoutService.sendOtp(phone, OTP_PURPOSE_WITHDRAW);
      setResendIn(RESEND_AFTER_S);
    } catch (e) {
      setOtpError(payoutErrorMessage(e, 'Could not send the code. Please try again.'));
    } finally {
      setOtpSending(false);
    }
  };

  const openConfirm = () => {
    if (!canWithdraw) return;
    idemKey.current = newIdempotencyKey();
    otpToken.current = '';
    setOtp('');
    setOtpError('');
    setSheetError('');
    setConfirmOpen(true);
    if (freshQuote?.otpRequired) sendWithdrawOtp();
  };

  const closeConfirm = () => {
    if (submitting) return;
    setConfirmOpen(false);
  };

  const submit = async () => {
    if (!freshQuote || !selected || submitting) return;
    setSubmitting(true);
    setSheetError('');
    try {
      if (freshQuote.otpRequired && !otpToken.current) {
        try {
          otpToken.current = await payoutService.verifyOtp(phone, otp, OTP_PURPOSE_WITHDRAW);
        } catch (e) {
          setOtpError(payoutErrorMessage(e, 'That code is not right. Please try again.'));
          return;
        }
      }
      const w = await payoutService.withdraw(
        { ledger, coinsToRedeem: coins, payoutMethodId: selected._id, ...(otpToken.current ? { otpToken: otpToken.current } : {}) },
        idemKey.current,
      );
      trackEvent('reward_redeemed', {
        redemption_type: selected.type === 'upi' ? 'upi' : 'bank_transfer',
        ledger,
        coins_redeemed: coins,
        value: freshQuote.youReceive,
        currency: 'INR',
      });
      setBalances((b) => ({ ...b, [ledger]: Math.max(0, b[ledger] - coins) }));
      setConfirmOpen(false);
      setWithdrawal(w);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (e: any) {
      // No response: the request may or may not have landed. Keep the sheet and
      // the same key so "Try again" can't create a second withdrawal.
      if (!e?.response) { setSheetError('Please check your internet connection and tap Withdraw again.'); return; }
      const status = e.response.status;
      const msg = String(e.response.data?.message || '');
      // The same request is still being processed on the server: retry with the same key.
      if (status === 409 && /being processed/i.test(msg)) { setSheetError('Another withdrawal is being processed. Please wait a moment and tap Withdraw again.'); return; }
      // The key was used for a different withdrawal: the next confirm needs a new one.
      if (status === 422) idemKey.current = newIdempotencyKey();
      setConfirmOpen(false);
      showAlert('Withdrawal not started', payoutErrorMessage(e));
      loadMethods();
      setQuoteNonce((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const removeMethod = (m: PayoutMethod) => {
    showAlert('Remove account?', `${methodLabel(m)} will be removed. You can add it again later.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await payoutService.removeMethod(m._id);
            setMethods((list) => list.filter((x) => x._id !== m._id));
          } catch (e) {
            showAlert('Could not remove account', payoutErrorMessage(e));
          }
        },
      },
    ]);
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App'));

  const methodStatus = (m: PayoutMethod) => {
    switch (m.status) {
      case 'VALIDATING':
        return { icon: <Loader size={14} color={colors.textMuted} />, text: 'Verifying...', color: colors.textMuted };
      case 'NAME_MISMATCH':
        return { icon: <CircleAlert size={14} color={colors.warning} />, text: `Under review${m.failureReason ? `. ${m.failureReason}` : ''}`, color: colors.warning };
      case 'FAILED':
        return { icon: <CircleX size={14} color={colors.danger} />, text: `Couldn't verify${m.failureReason ? `. ${m.failureReason}` : '. Remove it and add again.'}`, color: colors.danger };
      case 'REJECTED':
        return { icon: <CircleX size={14} color={colors.danger} />, text: `Not approved${m.failureReason ? `. ${m.failureReason}` : '. Remove it and add another account.'}`, color: colors.danger };
      default:
        return isUsable(m, now)
          ? { icon: <CircleCheck size={14} color={colors.primary} />, text: 'Verified', color: colors.primary }
          : { icon: <Clock size={14} color={colors.textMuted} />, text: `Ready on ${formatDateTime(m.usableFrom)}`, color: colors.textMuted };
    }
  };

  const amountHelper = () => {
    if (coins <= 0) return null;
    if (overBalance) return { text: `You only have ${balance.toLocaleString('en-IN')} ${isPickup ? 'pickup' : 'reward'} coins`, error: true };
    if (quoteError) return { text: quoteError, error: true };
    if (blocked) return { text: blocked.message, error: true };
    return null;
  };

  const renderSuccess = () => {
    const w = withdrawal!;
    const amount = formatInr(w.amountInRupees);
    const label = withdrawalAccountLabel(w, methods) || 'your account';
    const refunded = isRefunded(w.status);
    return (
      <View style={styles.body}>
        <View style={styles.center}>
          <View style={[styles.resultIcon, { backgroundColor: refunded ? colors.dangerSoft : colors.primarySoft }]}>
            {refunded ? <CircleX size={34} color={colors.danger} />
              : w.status === 'PAID' ? <CircleCheck size={34} color={colors.primary} />
              : <ActivityIndicator size="large" color={colors.primary} />}
          </View>
          <Text style={styles.resultTitle}>
            {refunded ? 'Withdrawal failed' : w.status === 'PAID' ? `${amount} sent` : `Withdrawal of ${amount} started`}
          </Text>
          <Text style={styles.resultText}>
            {refunded
              ? `${w.coinsRedeemed.toLocaleString('en-IN')} coins are back in your wallet.`
              : w.status === 'PAID'
                ? `The money has reached ${label}.`
                : statusSlow
                  ? `This is taking longer than usual. We'll notify you when it reaches ${label}.`
                  : `We're sending it to ${label}. This usually takes a few minutes.`}
          </Text>
        </View>

        {!refunded && <WithdrawalProgress withdrawal={w} />}

        <View style={styles.actions}>
          <PrimaryButton label="View details" onPress={() => navigation.navigate('Withdrawal', { id: w._id })} />
          <TouchableOpacity style={styles.secondaryBtn} onPress={goBack} activeOpacity={0.8}>
            <Text style={styles.secondaryBtnText}>Back to wallet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const helper = amountHelper();

  const renderForm = () => (
    <View style={styles.body}>
      <View style={styles.segment}>
        {(['pickup', 'reward'] as LedgerType[]).map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.segmentItem, ledger === l && styles.segmentItemActive]}
            onPress={() => switchLedger(l)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: ledger === l }}
          >
            <Text style={[styles.segmentText, ledger === l && styles.segmentTextActive]}>{l === 'pickup' ? 'Pickup coins' : 'Reward coins'}</Text>
            <Text style={styles.segmentSub}>{balances[l].toLocaleString('en-IN')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Coins to withdraw</Text>
      <View style={[styles.amountWrap, helper?.error && { borderColor: colors.danger }]}>
        <Coins size={18} color={colors.textFaint} />
        <TextInput
          style={styles.amountInput}
          value={coinsInput}
          onChangeText={(t) => setCoinsInput(t.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9))}
          keyboardType="number-pad"
          placeholder="Enter coins"
          placeholderTextColor={colors.textFaint}
          accessibilityLabel="Coins to withdraw"
        />
      </View>
      <View style={styles.chips}>
        {SHARES.map((s) => {
          const value = Math.floor(balance * s.f);
          return (
            <TouchableOpacity
              key={s.label}
              style={[styles.chip, coins === value && value > 0 && styles.chipActive]}
              onPress={() => setCoinsInput(value > 0 ? String(value) : '')}
              disabled={value <= 0}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, coins === value && value > 0 && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {helper && <Text style={[styles.helper, helper.error && styles.helperError]}>{helper.text}</Text>}

      {coins > 0 && !overBalance && !quoteError && (
        <View style={[styles.card, { marginTop: 18 }]}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Rate</Text>
            <Text style={styles.rowValue}>{rate} coins = ₹1</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Amount</Text>
            <Text style={styles.rowValue}>{freshQuote ? formatInr(freshQuote.amountInRupees) : '...'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Fee</Text>
            <Text style={styles.rowValue}>{!freshQuote ? '...' : freshQuote.fee == null ? 'Choose an account' : freshQuote.fee ? formatInr(freshQuote.fee) : 'Free'}</Text>
          </View>
          <View style={[styles.row, styles.rowTotal]}>
            <Text style={styles.totalLabel}>You receive</Text>
            {!freshQuote ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.totalValue}>{freshQuote.youReceive != null ? formatInr(freshQuote.youReceive) : '—'}</Text>}
          </View>
        </View>
      )}

      <Text style={[styles.label, { marginTop: 26 }]}>Send to</Text>
      {methods.map((m) => {
        const st = methodStatus(m);
        const usable = isUsable(m, now);
        const isSelected = m._id === selectedId;
        return (
          <TouchableOpacity
            key={m._id}
            style={[styles.methodCard, isSelected && styles.methodCardActive]}
            onPress={() => usable && setSelectedId(m._id)}
            activeOpacity={usable ? 0.85 : 1}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled: !usable }}
          >
            <View style={[styles.radio, isSelected && { borderColor: colors.primary }, !usable && { opacity: 0.4 }]}>
              {isSelected && <View style={styles.radioDot} />}
            </View>
            <View style={styles.methodIcon}>
              {m.type === 'upi' ? <AtSign size={18} color={colors.primary} /> : <Landmark size={18} color={colors.primary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle} numberOfLines={2}>{methodLabel(m)}</Text>
              <View style={styles.methodStatusRow}>
                {st.icon}
                <Text style={[styles.methodStatus, { color: st.color }]} numberOfLines={2}>{st.text}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => removeMethod(m)} style={styles.removeBtn} accessibilityLabel={`Remove ${methodLabel(m)}`}>
              <Trash2 size={17} color={colors.textFaint} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
      {methods.length < MAX_PAYOUT_METHODS ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddPayoutMethod')} activeOpacity={0.85}>
          <Plus size={18} color={colors.primary} />
          <Text style={styles.addBtnText}>{methods.length ? 'Add another account' : 'Add bank account or UPI ID'}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.note}>You can save up to {MAX_PAYOUT_METHODS} accounts. Remove one to add another.</Text>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          label={freshQuote && canWithdraw ? `Withdraw ${formatInr(freshQuote.amountInRupees)}` : 'Withdraw'}
          onPress={openConfirm}
          disabled={!canWithdraw}
        />
      </View>
      <Text style={styles.note}>
        Coins leave your wallet when you confirm. If the bank transfer fails, they come straight back.
      </Text>
    </View>
  );

  const renderConfirm = () => {
    if (!freshQuote || !selected) return null;
    const needsOtp = freshQuote.otpRequired;
    return (
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={closeConfirm}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Confirm withdrawal</Text>
              <TouchableOpacity onPress={closeConfirm} accessibilityLabel="Close" style={styles.closeBtn}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetLead}>
              Withdraw {coins.toLocaleString('en-IN')} {isPickup ? 'pickup' : 'reward'} coins ({formatInr(freshQuote.amountInRupees)}).
              {freshQuote.fee ? ` Fee ${formatInr(freshQuote.fee)}.` : ''} You receive{' '}
              <Text style={styles.bold}>{formatInr(freshQuote.youReceive ?? 0)}</Text> in <Text style={styles.bold}>{methodLabel(selected)}</Text>.
            </Text>

            {needsOtp && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.muted}>For larger withdrawals, enter the code sent to ******{phone.slice(-4)}.</Text>
                <OtpInput value={otp} onChange={(v) => { setOtp(v); if (otpError) setOtpError(''); }} disabled={submitting} />
                {!!otpError && <Text style={styles.fieldError}>{otpError}</Text>}
                <TouchableOpacity onPress={sendWithdrawOtp} disabled={resendIn > 0 || otpSending} style={styles.resendBtn}>
                  <Text style={[styles.link, (resendIn > 0 || otpSending) && { color: colors.textFaint }]}>
                    {otpSending ? 'Sending...' : resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!!sheetError && <Text style={styles.fieldError}>{sheetError}</Text>}

            <View style={styles.actions}>
              <PrimaryButton
                label={`Withdraw ${formatInr(freshQuote.amountInRupees)}`}
                onPress={submit}
                disabled={needsOtp && !otpToken.current && otp.length !== 6}
                loading={submitting}
              />
              <TouchableOpacity style={styles.secondaryBtn} onPress={closeConfirm} disabled={submitting} activeOpacity={0.8}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <StatusBarFiller color="#064e3b" />
      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={goBack} accessibilityLabel="Back">
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Withdraw coins</Text>
            <View style={styles.headerSpacer} />
          </View>
          {!withdrawal && (
            <>
              <View style={styles.balancePill}>
                <KarmaCoin size={22} />
                <Text style={styles.balanceText}>{balance.toLocaleString('en-IN')} available</Text>
              </View>
              <Text style={styles.rateNote}>
                {isPickup ? `Fixed rate · ${PICKUP_RATE} coins = ₹1` : `${tier ? tier + ' tier · ' : ''}${rewardRate} coins = ₹1`}
              </Text>
            </>
          )}
        </SafeAreaView>
      </LinearGradient>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {withdrawal ? renderSuccess() : renderForm()}
        {Platform.OS === 'web' && <View style={{ marginTop: 40 }}><WebFooter /></View>}
      </ScrollView>

      {renderConfirm()}
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  header: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '900', color: 'white', textAlign: 'center' },
  headerSpacer: { width: 40, height: 40 },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16 },
  balanceText: { color: 'white', fontWeight: '800', fontSize: 13 },
  rateNote: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 12, textAlign: 'center', marginTop: 8 },

  scroll: { flexGrow: 1, paddingBottom: Platform.OS === 'web' ? 0 : 40 },
  body: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 22 },
  center: { alignItems: 'center', paddingTop: 8 },

  segment: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 22 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 11 },
  segmentItemActive: { backgroundColor: c.surface, shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  segmentTextActive: { color: c.primary },
  segmentSub: { fontSize: 12, fontWeight: '600', color: c.textFaint, marginTop: 2 },

  label: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 8, marginLeft: 4 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingHorizontal: 16 },
  amountInput: { flex: 1, height: '100%', fontSize: 20, fontWeight: '800', color: c.text },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface },
  chipActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
  chipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  chipTextActive: { color: c.primary },
  helper: { fontSize: 13, color: c.textMuted, fontWeight: '600', marginTop: 8, marginLeft: 4 },
  helperError: { color: c.danger },

  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, paddingVertical: 6, marginTop: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  rowLabel: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
  rowValue: { fontSize: 14, color: c.text, fontWeight: '700' },
  rowTotal: { borderTopWidth: 1, borderTopColor: c.border, marginTop: 2, paddingTop: 12, paddingBottom: 10 },
  totalLabel: { fontSize: 15, color: c.text, fontWeight: '800' },
  totalValue: { fontSize: 20, color: c.primary, fontWeight: '900' },

  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, paddingVertical: 12, paddingLeft: 14, paddingRight: 6, marginBottom: 10 },
  methodCardActive: { borderColor: c.primary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: c.primary },
  methodIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 15, fontWeight: '800', color: c.text },
  methodStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  methodStatus: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  removeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.primary, backgroundColor: c.primarySoft },
  addBtnText: { color: c.primary, fontSize: 15, fontWeight: '800' },

  note: { fontSize: 12.5, color: c.textFaint, marginTop: 12, lineHeight: 18, textAlign: 'center' },
  actions: { marginTop: 24, gap: 10 },
  primaryBtn: { height: 52, borderRadius: 14, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: 'white', fontSize: 15.5, fontWeight: '800' },
  secondaryBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: c.textMuted, fontSize: 15, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 460, backgroundColor: c.surface, borderRadius: 22, padding: 22 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetTitle: { fontSize: 19, fontWeight: '900', color: c.text },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  sheetLead: { fontSize: 15, color: c.textMuted, lineHeight: 22 },
  bold: { fontWeight: '800', color: c.text },
  muted: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
  fieldError: { color: c.danger, fontSize: 13, fontWeight: '600', marginTop: 6 },
  resendBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  link: { color: c.primary, fontSize: 14, fontWeight: '700' },

  resultIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  resultTitle: { fontSize: 21, fontWeight: '900', color: c.text, textAlign: 'center', marginBottom: 10 },
  resultText: { fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
}));
