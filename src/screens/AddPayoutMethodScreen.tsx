import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Landmark, AtSign, ShieldCheck, CircleCheck, CircleAlert, CircleX, Clock } from 'lucide-react-native';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';
import { PhoneVerificationModal } from '../components/shared/PhoneVerificationModal';
import { OtpInput } from '../components/shared/OtpInput';
import { WebFooter } from '../components/shared/WebFooter';
import { profileService } from '../services/profile';
import {
  payoutService, PayoutMethod, NewPayoutMethod, OTP_PURPOSE_ADD_METHOD,
  methodLabel, formatDateTime, payoutErrorMessage,
} from '../services/payout';
import { trackEvent } from '../utils/analytics';
import { showAlert } from '../utils/alert';
import { useTheme, makeStyles } from '../theme';

type Kind = 'bank' | 'upi';
type Step = 'form' | 'otp' | 'verifying' | 'result';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;
const NAME_REGEX = /^[a-zA-Z][a-zA-Z .'-]{1,99}$/;

const POLL_MS = 3000;
const POLL_GIVE_UP_MS = 120_000;
const RESEND_AFTER_S = 30;

const SUPPORT_EMAIL = 'info@0waste.co.in';

// Outside the screen so inputs keep focus across re-renders.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

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

export function AddPayoutMethodScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors } = useTheme();

  const [kind, setKind] = useState<Kind>('bank');
  const [step, setStep] = useState<Step>('form');

  const [holder, setHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountConfirm, setAccountConfirm] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [phone, setPhone] = useState('');
  const [phoneModal, setPhoneModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [method, setMethod] = useState<PayoutMethod | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    profileService.getProfile()
      .then((p: any) => {
        if (p?.phone) setPhone(String(p.phone));
        if (p?.name) setHolder((h) => h || String(p.name));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Razorpay's ₹1 check finishes by webhook; keep asking until it settles.
  const pollStart = useRef(0);
  useEffect(() => {
    if (step !== 'verifying' || !method) return;
    pollStart.current = Date.now();
    let alive = true;
    const t = setInterval(async () => {
      if (Date.now() - pollStart.current > POLL_GIVE_UP_MS) { setSlow(true); clearInterval(t); return; }
      try {
        const m = await payoutService.getMethod(method._id);
        if (!alive) return;
        if (m.status !== 'VALIDATING') {
          clearInterval(t);
          setMethod(m);
          setStep('result');
          trackEvent('payout_method_result', { method_type: m.type, status: m.status });
        }
      } catch {}
    }, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [step, method?._id]);

  const errors = {
    holder: !NAME_REGEX.test(holder.trim()) ? 'Enter the name as it appears on your bank account' : '',
    accountNumber: !ACCOUNT_NUMBER_REGEX.test(accountNumber) ? 'Account number must be 9 to 18 digits' : '',
    accountConfirm: accountConfirm !== accountNumber ? 'Account numbers do not match' : '',
    ifsc: !IFSC_REGEX.test(ifsc) ? 'Enter a valid IFSC, for example HDFC0001234' : '',
    upiId: !UPI_REGEX.test(upiId.trim()) ? 'Enter a valid UPI ID, for example name@okhdfcbank' : '',
  };
  const formValid = kind === 'bank'
    ? !errors.holder && !errors.accountNumber && !errors.accountConfirm && !errors.ifsc
    : !errors.upiId;

  const buildMethod = (): NewPayoutMethod => kind === 'bank'
    ? { type: 'bank', accountHolderName: holder.trim(), accountNumber, ifsc }
    : { type: 'upi', upiId: upiId.trim().toLowerCase() };

  const sendOtp = async () => {
    if (!phone) { setPhoneModal(true); return; }
    setSending(true);
    try {
      await payoutService.sendOtp(phone, OTP_PURPOSE_ADD_METHOD);
      setOtp('');
      setOtpError('');
      setResendIn(RESEND_AFTER_S);
      setStep('otp');
    } catch (e) {
      showAlert('Could not send the code', payoutErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const onContinue = () => {
    setTouched({ holder: true, accountNumber: true, accountConfirm: true, ifsc: true, upiId: true });
    if (!formValid) return;
    sendOtp();
  };

  const save = async () => {
    if (otp.length !== 6 || saving) return;
    setSaving(true);
    setOtpError('');
    let otpToken: string;
    try {
      otpToken = await payoutService.verifyOtp(phone, otp, OTP_PURPOSE_ADD_METHOD);
    } catch (e) {
      setOtpError(payoutErrorMessage(e, 'That code is not right. Please try again.'));
      setSaving(false);
      return;
    }
    try {
      const m = await payoutService.addMethod(buildMethod(), otpToken);
      setAccountNumber('');
      setAccountConfirm('');
      setMethod(m);
      trackEvent('payout_method_added', { method_type: m.type });
      if (m.status === 'VALIDATING') { setSlow(false); setStep('verifying'); }
      else setStep('result');
    } catch (e: any) {
      // An expired otpToken means a fresh code is needed; anything else is about the details.
      const msg = payoutErrorMessage(e);
      if (/code|otp/i.test(msg)) { setOtp(''); setOtpError(msg); }
      else { setStep('form'); showAlert('Could not add this account', msg); }
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === 'otp') { setStep('form'); return; }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Redeem');
  };

  const startOver = () => {
    setMethod(null);
    setOtp('');
    setTouched({});
    setStep('form');
  };

  const fieldError = (key: keyof typeof errors) =>
    touched[key] && errors[key] ? <Text style={styles.fieldError}>{errors[key]}</Text> : null;

  const renderForm = () => (
    <>
      <View style={styles.segment}>
        {(['bank', 'upi'] as Kind[]).map((k) => (
          <TouchableOpacity
            key={k}
            style={[styles.segmentItem, kind === k && styles.segmentItemActive]}
            onPress={() => setKind(k)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === k }}
          >
            {k === 'bank'
              ? <Landmark size={16} color={kind === k ? colors.primary : colors.textMuted} />
              : <AtSign size={16} color={kind === k ? colors.primary : colors.textMuted} />}
            <Text style={[styles.segmentText, kind === k && styles.segmentTextActive]}>{k === 'bank' ? 'Bank account' : 'UPI ID'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {kind === 'bank' ? (
        <>
          <Field label="Account holder name">
            <TextInput
              style={styles.input}
              value={holder}
              onChangeText={setHolder}
              onBlur={() => setTouched((t) => ({ ...t, holder: true }))}
              placeholder="Name as per bank account"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="words"
              maxLength={100}
            />
            {fieldError('holder')}
          </Field>
          <Field label="Account number">
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={(t) => setAccountNumber(t.replace(/\D/g, ''))}
              onBlur={() => setTouched((t) => ({ ...t, accountNumber: true }))}
              placeholder="9 to 18 digits"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={18}
              secureTextEntry
              autoComplete="off"
            />
            {fieldError('accountNumber')}
          </Field>
          <Field label="Confirm account number">
            <TextInput
              style={styles.input}
              value={accountConfirm}
              onChangeText={(t) => setAccountConfirm(t.replace(/\D/g, ''))}
              onBlur={() => setTouched((t) => ({ ...t, accountConfirm: true }))}
              placeholder="Enter the account number again"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={18}
              autoComplete="off"
              contextMenuHidden
            />
            {fieldError('accountConfirm')}
          </Field>
          <Field label="IFSC">
            <TextInput
              style={styles.input}
              value={ifsc}
              onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onBlur={() => setTouched((t) => ({ ...t, ifsc: true }))}
              placeholder="e.g. HDFC0001234"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
            />
            {fieldError('ifsc')}
          </Field>
        </>
      ) : (
        <Field label="UPI ID">
          <TextInput
            style={styles.input}
            value={upiId}
            onChangeText={(t) => setUpiId(t.replace(/\s/g, ''))}
            onBlur={() => setTouched((t) => ({ ...t, upiId: true }))}
            placeholder="e.g. name@okhdfcbank"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            maxLength={100}
          />
          {fieldError('upiId')}
        </Field>
      )}

      <View style={styles.infoCard}>
        <ShieldCheck size={18} color={colors.primary} />
        <Text style={styles.infoText}>
          We'll send ₹1 to check this account. The name on it must match your KarmaVerse profile. Only the last 4 digits are saved.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Continue" onPress={onContinue} loading={sending} />
      </View>
    </>
  );

  const renderOtp = () => (
    <>
      <Text style={styles.lead}>Confirm it is you</Text>
      <Text style={styles.muted}>
        Enter the code sent to your phone ******{phone.slice(-4)}.
      </Text>
      <OtpInput value={otp} onChange={(v) => { setOtp(v); if (otpError) setOtpError(''); }} disabled={saving} />
      {!!otpError && <Text style={styles.fieldError}>{otpError}</Text>}
      <TouchableOpacity onPress={sendOtp} disabled={resendIn > 0 || sending} style={styles.resendBtn}>
        <Text style={[styles.link, (resendIn > 0 || sending) && { color: colors.textFaint }]}>
          {sending ? 'Sending...' : resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
        </Text>
      </TouchableOpacity>
      <View style={styles.actions}>
        <PrimaryButton label="Verify and save" onPress={save} disabled={otp.length !== 6} loading={saving} />
      </View>
    </>
  );

  const renderVerifying = () => (
    <View style={styles.center}>
      <View style={[styles.resultIcon, { backgroundColor: slow ? colors.warning + '22' : colors.primarySoft }]}>
        {slow ? <Clock size={34} color={colors.warning} /> : <ActivityIndicator size="large" color={colors.primary} />}
      </View>
      <Text style={styles.resultTitle}>{slow ? 'Still verifying' : 'Verifying your account...'}</Text>
      <Text style={styles.resultText}>
        {slow
          ? `This is taking longer than usual. We'll let you know as soon as ${methodLabel(method)} is verified.`
          : `We're checking ${methodLabel(method)} with your bank. This usually takes under a minute.`}
      </Text>
      {slow && (
        <View style={[styles.actions, { alignSelf: 'stretch' }]}>
          <PrimaryButton label="Done" onPress={goBack} />
        </View>
      )}
    </View>
  );

  const renderResult = () => {
    if (!method) return null;
    const label = methodLabel(method);
    if (method.status === 'VERIFIED') {
      const until = method.usableFrom && new Date(method.usableFrom).getTime() > Date.now() ? formatDateTime(method.usableFrom) : '';
      return (
        <View style={styles.center}>
          <View style={[styles.resultIcon, { backgroundColor: colors.primarySoft }]}><CircleCheck size={34} color={colors.primary} /></View>
          <Text style={styles.resultTitle}>Account added</Text>
          <Text style={styles.resultText}>{label} is verified{method.verifiedName ? ` in the name of ${method.verifiedName}` : ''}.</Text>
          {!!until && (
            <Text style={styles.resultText}>For your safety, you can withdraw to it from {until}.</Text>
          )}
          <View style={[styles.actions, { alignSelf: 'stretch' }]}>
            <PrimaryButton label="Done" onPress={goBack} />
          </View>
        </View>
      );
    }
    const mismatch = method.status === 'NAME_MISMATCH';
    return (
      <View style={styles.center}>
        <View style={[styles.resultIcon, { backgroundColor: mismatch ? colors.warning + '22' : colors.dangerSoft }]}>
          {mismatch ? <CircleAlert size={34} color={colors.warning} /> : <CircleX size={34} color={colors.danger} />}
        </View>
        <Text style={styles.resultTitle}>{mismatch ? "Name doesn't match" : "Couldn't verify this account"}</Text>
        <Text style={styles.resultText}>
          {mismatch
            ? `The name on ${label} doesn't match your KarmaVerse profile. Please contact support at ${SUPPORT_EMAIL} and we'll help you sort it out.`
            : `Please check the details of ${label} and try again, or add a different account.`}
        </Text>
        <View style={[styles.actions, { alignSelf: 'stretch' }]}>
          {mismatch
            ? <PrimaryButton label="Done" onPress={goBack} />
            : <PrimaryButton label="Try again" onPress={startOver} />}
        </View>
      </View>
    );
  };

  const title = step === 'otp' ? 'Verify' : 'Add bank account or UPI';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <StatusBarFiller color="#064e3b" />
      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            {step === 'form' || step === 'otp' ? (
              <TouchableOpacity style={styles.backBtn} onPress={goBack} accessibilityLabel="Back">
                <ChevronLeft size={22} color="white" />
              </TouchableOpacity>
            ) : <View style={styles.headerSpacer} />}
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {step === 'form' ? renderForm()
            : step === 'otp' ? renderOtp()
            : step === 'verifying' ? renderVerifying()
            : renderResult()}
        </View>
        {Platform.OS === 'web' && <View style={{ marginTop: 40 }}><WebFooter /></View>}
      </ScrollView>

      <PhoneVerificationModal
        visible={phoneModal}
        reason="To keep your money safe, we need to verify your phone number before you add a bank account."
        onClose={() => setPhoneModal(false)}
        onVerified={() => {
          setPhoneModal(false);
          profileService.getProfile().then((p: any) => { if (p?.phone) setPhone(String(p.phone)); }).catch(() => {});
        }}
      />
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
  header: { paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '900', color: 'white', textAlign: 'center' },
  headerSpacer: { width: 40, height: 40 },
  scroll: { flexGrow: 1, paddingBottom: Platform.OS === 'web' ? 0 : 40 },
  body: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24 },
  center: { alignItems: 'center', paddingTop: 24 },

  segment: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 22 },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 11 },
  segmentItemActive: { backgroundColor: c.surface, shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 14.5, fontWeight: '700', color: c.textMuted },
  segmentTextActive: { color: c.primary },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 6, marginLeft: 4 },
  input: { height: 54, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, fontWeight: '600', color: c.text },
  fieldError: { color: c.danger, fontSize: 13, fontWeight: '600', marginTop: 6, marginLeft: 4 },

  infoCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: c.primarySoft, borderRadius: 14, padding: 14, marginTop: 6 },
  infoText: { flex: 1, fontSize: 13.5, color: c.text, fontWeight: '500', lineHeight: 19 },

  lead: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 10 },
  muted: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
  resendBtn: { alignSelf: 'flex-start', paddingVertical: 10 },
  link: { color: c.primary, fontSize: 14, fontWeight: '700' },

  resultIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  resultTitle: { fontSize: 21, fontWeight: '900', color: c.text, textAlign: 'center', marginTop: 4, marginBottom: 10 },
  resultText: { fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 8 },

  actions: { marginTop: 28, gap: 10 },
  primaryBtn: { height: 52, borderRadius: 14, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: 'white', fontSize: 15.5, fontWeight: '800' },
}));
