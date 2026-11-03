import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Pressable, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, CirclePause, Trash2, Lightbulb, Info, Check, CalendarClock } from 'lucide-react-native';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';
import { PhoneVerificationModal } from '../components/shared/PhoneVerificationModal';
import {
  accountService, errorCode, errorData, errorMessage, errorStatus, formatDay,
  AccountAction, DurationKey, ExitSurvey, SurveyAnswer, DeletionEligibility, OtpRequest, ConfirmResult, Ledger,
} from '../services/account';
import { authService } from '../services/auth';
import { forceLogout, setEndingSession } from '../utils/forceLogout';
import { showAlert } from '../utils/alert';
import { useTheme, makeStyles } from '../theme';

type Step = 'choose' | 'duration' | 'survey' | 'eligibility' | 'otp' | 'done';

const DURATIONS: { key: DurationKey; label: string; days?: number; months?: number }[] = [
  { key: '1w', label: '1 week', days: 7 },
  { key: '15d', label: '15 days', days: 15 },
  { key: '1m', label: '1 month', months: 1 },
  { key: '3m', label: '3 months', months: 3 },
  { key: '6m', label: '6 months', months: 6 },
  { key: '1y', label: '1 year', months: 12 },
];

const SOMETHING_ELSE = 'something_else';
const SURVEY_TEXT_MAX = 500;

// Shown on the OTP step before confirming; the server returns the exact date.
// Months are calendar months, clamped to the last day (31 Jan + 1 month = 28 Feb).
function estimateEnd(key: DurationKey) {
  const opt = DURATIONS.find((d) => d.key === key)!;
  const d = new Date();
  if (opt.days) {
    d.setDate(d.getDate() + opt.days);
    return d;
  }
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + (opt.months || 0));
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

const showHelp = () => showAlert(
  'Help & support',
  'Reach out to us anytime:\n\nEmail: info@0waste.co.in\nAddress: Plot 62, Sector 8, IMT Manesar, Gurugram, Haryana 122051'
);

function Radio({ selected, danger }: { selected: boolean; danger?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const tint = danger ? colors.danger : colors.primary;
  return (
    <View style={[styles.radio, selected && { borderColor: tint }]}>
      {selected && <View style={[styles.radioDot, { backgroundColor: tint }]} />}
    </View>
  );
}

function OtpBoxes({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const styles = useStyles();
  const inputRef = useRef<TextInput>(null);
  return (
    <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={[styles.otpBox, i === Math.min(value.length, 5) && styles.otpBoxActive]}>
          <Text style={styles.otpDigit}>{value[i] || ''}</Text>
        </View>
      ))}
      {/* One real input under the boxes, so SMS autofill and paste fill all six. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        editable={!disabled}
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        caretHidden
        style={styles.otpInput}
        accessibilityLabel="6-digit code"
      />
    </Pressable>
  );
}

export function ManageAccountScreen({ navigation, route }: any) {
  const styles = useStyles();
  const { colors } = useTheme();

  const [gate, setGate] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  const [step, setStep] = useState<Step>('choose');
  const [kind, setKind] = useState<AccountAction>(route?.params?.mode === 'delete' ? 'delete' : 'deactivate');

  const [durationKey, setDurationKey] = useState<DurationKey>('1m');
  const [autoReactivate, setAutoReactivate] = useState(true);

  const [surveys, setSurveys] = useState<Partial<Record<AccountAction, ExitSurvey>>>({});
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyFailed, setSurveyFailed] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [surveyText, setSurveyText] = useState('');

  const [eligibility, setEligibility] = useState<DeletionEligibility | null>(null);
  const [eligLoading, setEligLoading] = useState(false);
  const [eligFailed, setEligFailed] = useState(false);
  const [acceptForfeit, setAcceptForfeit] = useState(false);

  const [starting, setStarting] = useState(false);
  const [startCooldown, setStartCooldown] = useCountdown();
  const [phoneModal, setPhoneModal] = useState(false);

  const [otpReq, setOtpReq] = useState<OtpRequest | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useCountdown();

  const [result, setResult] = useState<ConfirmResult | null>(null);

  // Set right before our own navigation away so beforeRemove lets it through.
  const leavingRef = useRef(false);

  const checkStatus = useCallback(() => {
    setGate('loading');
    accountService.getStatus()
      .then(() => setGate('ready'))
      .catch((e) => setGate(errorStatus(e) === 404 ? 'unavailable' : 'error'));
  }, []);
  useEffect(checkStatus, [checkStatus]);

  const prevStep = (s: Step): Step | null => {
    switch (s) {
      case 'duration': return 'choose';
      case 'survey': return kind === 'deactivate' ? 'duration' : 'choose';
      case 'eligibility': return 'survey';
      case 'otp': return kind === 'deactivate' ? 'survey' : 'eligibility';
      default: return null;
    }
  };

  const leave = () => {
    leavingRef.current = true;
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Profile');
  };

  // The session is gone after a confirm, so the only way out is to Login.
  const finish = () => {
    setEndingSession(false);
    leavingRef.current = true;
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const goBack = () => {
    if (step === 'done') { finish(); return; }
    const prev = prevStep(step);
    if (prev) setStep(prev);
    else leave();
  };

  // Hardware / browser back steps through the flow instead of leaving it. Resets
  // (e.g. a forced sign-out) and our own navigation pass straight through.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      if (leavingRef.current) return;
      const type = e?.data?.action?.type;
      if (type === 'RESET' || type === 'REPLACE' || type === 'NAVIGATE') return;
      if (step === 'done') { e.preventDefault(); finish(); return; }
      const prev = prevStep(step);
      if (!prev) return;
      e.preventDefault();
      setStep(prev);
    });
    return sub;
  }, [navigation, step, kind]);

  const switchKind = (next: AccountAction) => {
    if (next === kind) return;
    setKind(next);
    setAnswer(null);
    setSurveyText('');
    setAcceptForfeit(false);
  };

  // ── Survey ────────────────────────────────────────────────────────────────
  const loadSurvey = useCallback(async (path: AccountAction) => {
    setSurveyLoading(true);
    setSurveyFailed(false);
    try {
      const survey = await accountService.getExitSurvey(path);
      setSurveys((s) => ({ ...s, [path]: survey }));
    } catch (e) {
      if (errorStatus(e) !== 401) setSurveyFailed(true);
    } finally {
      setSurveyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'survey' && !surveys[kind]) loadSurvey(kind);
  }, [step, kind, surveys, loadSurvey]);

  const survey = surveys[kind];
  const picked = survey?.answers.find((a) => a.key === answer);
  const needsText = answer === SOMETHING_ELSE || picked?.quickFix?.type === 'text_input';
  const surveyDone = !!answer && (!needsText || surveyText.trim().length > 0);

  // ── Eligibility (delete only) ─────────────────────────────────────────────
  const loadEligibility = useCallback(async () => {
    setEligLoading(true);
    setEligFailed(false);
    try {
      setEligibility(await accountService.getDeletionEligibility());
    } catch (e) {
      if (errorStatus(e) !== 401) setEligFailed(true);
    } finally {
      setEligLoading(false);
    }
  }, []);

  // On entering the step, and again on returning from the Withdraw (Redeem) screen.
  useFocusEffect(useCallback(() => {
    if (step === 'eligibility') loadEligibility();
  }, [step, loadEligibility]));

  const blockers = eligibility?.blockers || [];
  const forfeitReward = eligibility?.forfeitable?.reward || 0;
  const forfeitPickup = eligibility?.forfeitable?.pickup || 0;
  const needsForfeit = !!eligibility && blockers.length === 0 && (forfeitReward > 0 || forfeitPickup > 0);
  const canDelete = !!eligibility && blockers.length === 0 && (!needsForfeit || acceptForfeit);

  // ── Start request (sends the OTP) ─────────────────────────────────────────
  const startRequest = async () => {
    if (starting || startCooldown > 0 || !answer) return;
    setStarting(true);
    try {
      const req = await accountService.startRequest({
        type: kind,
        ...(kind === 'deactivate' ? { durationKey, autoReactivate } : {}),
        surveyAnswer: answer,
        ...(needsText ? { surveyText: surveyText.trim() } : {}),
        ...(kind === 'delete' && needsForfeit && acceptForfeit ? { acceptForfeit: true } : {}),
      });
      setOtpReq(req);
      setOtp('');
      setOtpError('');
      setResendIn(req.retryAfter || 60);
      setStep('otp');
    } catch (e) {
      const code = errorCode(e);
      const status = errorStatus(e);
      if (status === 401) return; // the api client already signed the user out
      switch (code) {
        case 'PHONE_REQUIRED':
          setPhoneModal(true);
          return;
        case 'BOOKING_IN_PROGRESS':
          showAlert('Pickup in progress', 'You have a pickup in progress. Please finish it first.');
          return;
        case 'NOT_ELIGIBLE':
          showAlert('Something changed', 'Please review the details and try again.');
          loadEligibility();
          return;
        case 'FORFEIT_CONSENT_REQUIRED':
          setAcceptForfeit(false);
          showAlert('Please review your coins', 'Some of your coins are below the minimum withdrawal. Tick the box to continue.');
          loadEligibility();
          return;
        case 'DELETE_REQUEST_EXISTS':
          showAlert('Request in progress', 'A delete request is already in progress for this account.');
          return;
      }
      if (status === 403) {
        showAlert('Not available', "This option isn't available for your account.");
        return;
      }
      if (status === 429) {
        setStartCooldown(60);
        showAlert('Too many attempts', errorMessage(e));
        return;
      }
      showAlert('Could not continue', errorMessage(e));
    } finally {
      setStarting(false);
    }
  };

  // ── OTP ───────────────────────────────────────────────────────────────────
  const startAgain = (message: string) => {
    showAlert('Please start again', message);
    setOtpReq(null);
    setOtp('');
    setStep('survey');
  };

  const backToEligibility = (title: string, message: string) => {
    showAlert(title, message);
    setOtpReq(null);
    setOtp('');
    setAcceptForfeit(false);
    setStep('eligibility');
  };

  const handleOtpError = (e: any) => {
    const code = errorCode(e);
    const status = errorStatus(e);
    if (status === 401) { forceLogout(code); return; }
    switch (code) {
      case 'OTP_INVALID': {
        const left = errorData(e)?.attemptsLeft;
        setOtp('');
        setOtpError(typeof left === 'number'
          ? `That code is incorrect. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`
          : 'That code is incorrect.');
        return;
      }
      case 'OTP_ATTEMPTS_EXCEEDED':
        startAgain('Too many wrong codes. Please start again.');
        return;
      case 'REQUEST_EXPIRED':
        startAgain('This code has expired. Please start again.');
        return;
      case 'REQUEST_ALREADY_USED':
        // Already confirmed (e.g. a double tap) — the session is gone.
        setEndingSession(true);
        authService.endSession().finally(finish);
        return;
      case 'BOOKING_IN_PROGRESS':
        showAlert('Pickup in progress', 'Your pickup has started. Please finish it first.');
        leave();
        return;
      case 'FORFEIT_CONSENT_REQUIRED':
        backToEligibility('Coin balance changed', 'Your coin balance has changed. Please review and try again.');
        return;
      case 'NOT_ELIGIBLE':
        backToEligibility('Something changed', 'Please review the details and try again.');
        return;
      case 'OTP_SERVICE_UNAVAILABLE':
        setOtpError("We couldn't check your code right now. Please try again.");
        return;
    }
    if (status === 404) {
      showAlert('Request not found', 'Please start again.');
      leave();
      return;
    }
    if (status === 429) {
      showAlert('Too many attempts', errorMessage(e));
      return;
    }
    setOtpError(errorMessage(e));
  };

  const confirm = async () => {
    if (!otpReq || otp.length !== 6 || confirming) return;
    setConfirming(true);
    setOtpError('');
    setEndingSession(true);
    try {
      const res = await accountService.confirm(otpReq.requestId, otp);
      // The backend has already revoked this session; drop it locally too.
      await authService.endSession();
      setResult(res);
      setStep('done');
    } catch (e) {
      setEndingSession(false);
      handleOtpError(e);
    } finally {
      setConfirming(false);
    }
  };

  const resend = async () => {
    if (!otpReq || resendIn > 0 || resending) return;
    setResending(true);
    setOtpError('');
    try {
      const res = await accountService.resendOtp(otpReq.requestId);
      setOtp('');
      setResendIn(res?.retryAfter || 60);
    } catch (e) {
      handleOtpError(e);
    } finally {
      setResending(false);
    }
  };

  // ── Rendering ─────────────────────────────────────────────────────────────
  const title = step === 'choose' || step === 'done'
    ? 'Deactivate or delete'
    : kind === 'deactivate' ? 'Deactivate account' : 'Delete account';

  const PrimaryButton = ({ label, onPress, disabled, loading, danger }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; danger?: boolean }) => (
    <TouchableOpacity
      style={[styles.primaryBtn, danger && styles.dangerBtn, (disabled || loading) && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </TouchableOpacity>
  );

  const QuickFixCard = ({ text, actions }: { text: string; actions: { label: string; onPress: () => void }[] }) => (
    <View style={styles.fixCard}>
      <View style={styles.fixHead}>
        <Lightbulb size={18} color={colors.primary} />
        <Text style={styles.fixText}>{text}</Text>
      </View>
      <View style={styles.fixActions}>
        {actions.map((a) => (
          <TouchableOpacity key={a.label} style={styles.fixBtn} onPress={a.onPress} activeOpacity={0.8}>
            <Text style={styles.fixBtnText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQuickFix = (a: SurveyAnswer) => {
    const fix = a.quickFix;
    if (!fix || fix.type === 'text_input') return null;
    const take = (go: () => void) => () => {
      accountService.reportQuickFix(kind, a.key);
      go();
    };
    if (fix.type === 'suggest') {
      if (fix.target !== 'deactivate') return null;
      return (
        <QuickFixCard
          text="Not using it right now? You can deactivate instead and keep your coins."
          actions={[{ label: 'Deactivate instead', onPress: take(() => { switchKind('deactivate'); setStep('duration'); }) }]}
        />
      );
    }
    switch (fix.target) {
      case 'settings.notifications':
        return (
          <QuickFixCard
            text="Too many notifications? You can turn off just the ones you don't want."
            actions={[{ label: 'Open notification settings', onPress: take(() => navigation.navigate('NotificationSettings')) }]}
          />
        );
      case 'earn.top_ways':
        return (
          <QuickFixCard
            text="Here are the top ways to earn more coins."
            actions={[
              { label: 'Schedule a pickup', onPress: take(() => navigation.navigate('SchedulePickup')) },
              { label: 'Play the daily quiz', onPress: take(() => navigation.navigate('Quiz')) },
              { label: 'Refer a friend', onPress: take(() => navigation.navigate('Referral')) },
            ]}
          />
        );
      case 'settings.privacy':
        return (
          <QuickFixCard
            text="See how we use and protect your data."
            actions={[{ label: 'Read the privacy policy', onPress: take(() => navigation.navigate('Legal', { type: 'privacy' })) }]}
          />
        );
      case 'help':
        return (
          <QuickFixCard
            text="Having trouble with coins or payouts? We can help."
            actions={[{ label: 'Contact support', onPress: take(showHelp) }]}
          />
        );
      default:
        return null;
    }
  };

  const renderChoose = () => (
    <>
      <Text style={styles.lead}>What would you like to do?</Text>
      {([
        { key: 'deactivate', title: 'Deactivate', sub: 'Take a break. Profile is hidden. Coins stay safe.', Icon: CirclePause },
        { key: 'delete', title: 'Delete', sub: 'Gone after 30 days. Restore till then.', Icon: Trash2 },
      ] as const).map(({ key, title: t, sub, Icon }) => {
        const selected = kind === key;
        const danger = key === 'delete';
        return (
          <TouchableOpacity
            key={key}
            style={[styles.choiceCard, selected && (danger ? styles.choiceCardDanger : styles.choiceCardActive)]}
            onPress={() => switchKind(key)}
            activeOpacity={0.85}
          >
            <View style={[styles.choiceIcon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
              <Icon size={20} color={danger ? colors.danger : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>{t}</Text>
              <Text style={styles.choiceSub}>{sub}</Text>
            </View>
            <Radio selected={selected} danger={danger} />
          </TouchableOpacity>
        );
      })}
      <View style={styles.actions}>
        <PrimaryButton label="Continue" onPress={() => setStep(kind === 'deactivate' ? 'duration' : 'survey')} />
      </View>
    </>
  );

  const renderDuration = () => (
    <>
      <Text style={styles.sectionLabel}>Hide my account for:</Text>
      <View style={styles.chips}>
        {DURATIONS.map((d) => {
          const selected = durationKey === d.key;
          return (
            <TouchableOpacity key={d.key} style={[styles.chip, selected && styles.chipActive]} onPress={() => setDurationKey(d.key)} activeOpacity={0.8}>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Turn my account back on after this time?</Text>
      <View style={styles.card}>
        {[
          { value: true, label: 'Yes, automatically' },
          { value: false, label: 'No, I will sign in' },
        ].map((o, i) => (
          <TouchableOpacity
            key={o.label}
            style={[styles.optionRow, i > 0 && styles.optionRowBorder]}
            onPress={() => setAutoReactivate(o.value)}
            activeOpacity={0.8}
          >
            <Radio selected={autoReactivate === o.value} />
            <Text style={styles.optionText}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Continue" onPress={() => setStep('survey')} />
      </View>
    </>
  );

  const renderSurvey = () => {
    if (!survey) {
      return (
        <View style={styles.center}>
          {surveyLoading || !surveyFailed ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={styles.mutedText}>Could not load this step.</Text>
              <TouchableOpacity onPress={() => loadSurvey(kind)} style={styles.linkBtn}>
                <Text style={styles.linkText}>Try again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    }
    return (
      <>
        <Text style={styles.lead}>{survey.question}</Text>
        <View style={styles.card}>
          {survey.answers.map((a, i) => (
            <TouchableOpacity
              key={a.key}
              style={[styles.optionRow, i > 0 && styles.optionRowBorder]}
              onPress={() => setAnswer(a.key)}
              activeOpacity={0.8}
            >
              <Radio selected={answer === a.key} />
              <Text style={styles.optionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {needsText && (
          <View style={styles.textAreaWrap}>
            <TextInput
              style={styles.textArea}
              value={surveyText}
              onChangeText={setSurveyText}
              placeholder="Tell us a little more"
              placeholderTextColor={colors.textFaint}
              maxLength={SURVEY_TEXT_MAX}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{surveyText.length}/{SURVEY_TEXT_MAX}</Text>
          </View>
        )}

        {picked && renderQuickFix(picked)}

        <View style={styles.actions}>
          <PrimaryButton
            label={startCooldown > 0 ? `Try again in ${startCooldown}s` : 'Continue'}
            onPress={kind === 'deactivate' ? startRequest : () => setStep('eligibility')}
            disabled={!surveyDone || startCooldown > 0}
            loading={starting}
          />
        </View>
      </>
    );
  };

  const ledgerName = (l?: Ledger) => (l === 'reward' ? 'reward' : 'pickup');

  const renderBlockers = () => {
    const first = blockers[0];
    const shown = first.code === 'WITHDRAWABLE_BALANCE'
      ? blockers.filter((b) => b.code === 'WITHDRAWABLE_BALANCE')
      : [first];
    return shown.map((b, i) => {
      let text = b.message;
      if (b.code === 'WITHDRAWABLE_BALANCE') {
        text = `You have ${(b.meta?.balance ?? 0).toLocaleString()} ${ledgerName(b.meta?.ledger)} coins. Withdraw them first so you keep them.`;
      } else if (b.code === 'WITHDRAWAL_IN_PROGRESS') {
        text = "A withdrawal is still being processed. You can delete your account once it's complete.";
      } else if (b.code === 'BOOKING_IN_PROGRESS') {
        text = 'You have a pickup in progress. Please finish it first.';
      }
      return (
        <View key={`${b.code}-${i}`} style={styles.warnCard}>
          <View style={styles.fixHead}>
            <Info size={18} color={colors.warning} />
            <Text style={styles.warnText}>{text}</Text>
          </View>
          {b.code === 'WITHDRAWABLE_BALANCE' && (
            <TouchableOpacity
              style={styles.warnBtn}
              onPress={() => navigation.navigate('Redeem', { ledger: ledgerName(b.meta?.ledger), balance: b.meta?.balance })}
              activeOpacity={0.85}
            >
              <Text style={styles.warnBtnText}>Withdraw coins</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    });
  };

  const forfeitText = () => {
    const parts: string[] = [];
    const mins: string[] = [];
    if (forfeitReward > 0) {
      parts.push(`${forfeitReward.toLocaleString()} reward coins`);
      mins.push(`${(eligibility?.minimums?.reward ?? 0).toLocaleString()} reward coins`);
    }
    if (forfeitPickup > 0) {
      parts.push(`${forfeitPickup.toLocaleString()} pickup coins`);
      mins.push(`${(eligibility?.minimums?.pickup ?? 0).toLocaleString()} pickup coins`);
    }
    return `I understand my remaining ${parts.join(' and ')} are below the minimum withdrawal of ${mins.join(' and ')} and will be given up.`;
  };

  const renderEligibility = () => {
    if (!eligibility) {
      return (
        <View style={styles.center}>
          {eligLoading || !eligFailed ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={styles.mutedText}>Could not check your account.</Text>
              <TouchableOpacity onPress={loadEligibility} style={styles.linkBtn}>
                <Text style={styles.linkText}>Try again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    }
    return (
      <>
        <Text style={styles.lead}>Before you delete</Text>
        <Text style={styles.sectionLabel}>You will lose:</Text>
        <View style={[styles.card, { paddingVertical: 8 }]}>
          {eligibility.willLose.map((item) => (
            <View key={item.key} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {blockers.length > 0 && renderBlockers()}

        {needsForfeit && (
          <TouchableOpacity style={styles.consentRow} onPress={() => setAcceptForfeit((v) => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, acceptForfeit && styles.checkboxOn]}>
              {acceptForfeit && <Check size={14} color="#fff" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentText}>{forfeitText()}</Text>
              <Text style={styles.consentNote}>Nothing is removed until day 30. Restore before then and you keep them.</Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.note}>Upcoming pickups will be cancelled.</Text>

        <View style={styles.actions}>
          <PrimaryButton
            label={startCooldown > 0 ? `Try again in ${startCooldown}s` : 'Continue'}
            onPress={startRequest}
            disabled={!canDelete || eligLoading || startCooldown > 0}
            loading={starting}
            danger
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={leave} activeOpacity={0.8}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderOtp = () => {
    const footer = kind === 'delete'
      ? 'Deleted in 30 days. Sign in before then to restore it.'
      : autoReactivate
        ? `Your account will be off until ${formatDay(estimateEnd(durationKey))}.`
        : 'Your account will stay off until you sign in again.';
    return (
      <>
        <Text style={styles.lead}>Confirm it is you</Text>
        <Text style={styles.mutedText}>
          Enter the code sent to your phone{otpReq?.maskedDestination ? ` ${otpReq.maskedDestination}` : ''}.
        </Text>

        <OtpBoxes value={otp} onChange={(v) => { setOtp(v); if (otpError) setOtpError(''); }} disabled={confirming} />
        {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}

        <TouchableOpacity onPress={resend} disabled={resendIn > 0 || resending} style={styles.resendBtn}>
          <Text style={[styles.linkText, (resendIn > 0 || resending) && { color: colors.textFaint }]}>
            {resending ? 'Sending...' : resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <CalendarClock size={16} color={colors.textMuted} />
          <Text style={styles.footerText}>{footer}</Text>
        </View>
        <Text style={styles.note}>Upcoming pickups will be cancelled.</Text>

        <View style={styles.actions}>
          <PrimaryButton
            label={kind === 'delete' ? 'Delete account' : 'Deactivate'}
            onPress={confirm}
            disabled={otp.length !== 6}
            loading={confirming}
            danger={kind === 'delete'}
          />
        </View>
      </>
    );
  };

  const renderDone = () => {
    const date = formatDay(result?.effectiveUntil);
    const cancelled = (result?.cancelledBookings || 0) > 0;
    const isDelete = result?.accountStatus === 'pending_deletion' || kind === 'delete';
    return (
      <View style={styles.doneWrap}>
        <View style={[styles.doneIcon, { backgroundColor: isDelete ? colors.dangerSoft : colors.primarySoft }]}>
          {isDelete ? <Trash2 size={30} color={colors.danger} /> : <CirclePause size={30} color={colors.primary} />}
        </View>
        <Text style={styles.doneTitle}>{isDelete ? 'Account scheduled for deletion' : 'Account deactivated'}</Text>
        {isDelete ? (
          <Text style={styles.doneText}>
            Your account will be deleted on <Text style={styles.bold}>{date}</Text>. Changed your mind? Sign in before then and tap Restore.
          </Text>
        ) : result?.autoReactivate !== false && date ? (
          <Text style={styles.doneText}>
            Your account is off until <Text style={styles.bold}>{date}</Text>. It will turn back on by itself. Sign in any time to come back early.
          </Text>
        ) : (
          <Text style={styles.doneText}>Your account is off. Sign in any time to turn it back on.</Text>
        )}
        {cancelled && <Text style={styles.doneText}>We cancelled your upcoming pickups.</Text>}
        <View style={[styles.actions, { alignSelf: 'stretch' }]}>
          <PrimaryButton label="OK" onPress={finish} />
        </View>
      </View>
    );
  };

  const renderGate = () => (
    <View style={styles.center}>
      {gate === 'loading' ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Text style={styles.mutedText}>
            {gate === 'unavailable' ? "This option isn't available yet." : 'Could not load your account. Please try again.'}
          </Text>
          {gate === 'error' && (
            <TouchableOpacity onPress={checkStatus} style={styles.linkBtn}>
              <Text style={styles.linkText}>Try again</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <StatusBarFiller color="#064e3b" />
      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            {step !== 'done' ? (
              <TouchableOpacity style={styles.backBtn} onPress={goBack} accessibilityLabel="Back">
                <ChevronLeft size={22} color="white" />
              </TouchableOpacity>
            ) : <View style={styles.headerSpacer} />}
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {gate !== 'ready' ? renderGate()
            : step === 'choose' ? renderChoose()
            : step === 'duration' ? renderDuration()
            : step === 'survey' ? renderSurvey()
            : step === 'eligibility' ? renderEligibility()
            : step === 'otp' ? renderOtp()
            : renderDone()}
        </View>
      </ScrollView>

      <PhoneVerificationModal
        visible={phoneModal}
        reason="To keep your account safe, we need to verify your phone number before you continue."
        onClose={() => setPhoneModal(false)}
        onVerified={() => { setPhoneModal(false); startRequest(); }}
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
  scroll: { paddingBottom: 40 },
  body: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24 },
  center: { alignItems: 'center', paddingVertical: 48, gap: 10 },

  lead: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: c.textMuted, marginBottom: 10 },
  mutedText: { fontSize: 14, color: c.textMuted, lineHeight: 20, textAlign: 'left' },
  note: { fontSize: 12.5, color: c.textFaint, marginTop: 14, lineHeight: 18 },
  bold: { fontWeight: '800', color: c.text },

  choiceCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1.5, borderColor: c.border, padding: 16, marginBottom: 12 },
  choiceCardActive: { borderColor: c.primary },
  choiceCardDanger: { borderColor: c.danger },
  choiceIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 3 },
  choiceSub: { fontSize: 13, color: c.textMuted, lineHeight: 18 },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface },
  chipActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
  chipText: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  chipTextActive: { color: c.primary },

  card: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  optionRowBorder: { borderTopWidth: 1, borderTopColor: c.border },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600', color: c.text },

  textAreaWrap: { marginTop: 14 },
  textArea: { minHeight: 96, backgroundColor: c.inputBg, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, fontSize: 15, color: c.text },
  counter: { alignSelf: 'flex-end', fontSize: 12, color: c.textFaint, marginTop: 6 },

  fixCard: { marginTop: 16, backgroundColor: c.primarySoft, borderRadius: 16, padding: 16 },
  fixHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  fixText: { flex: 1, fontSize: 14, color: c.text, fontWeight: '600', lineHeight: 20 },
  fixActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  fixBtn: { backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.primary, paddingHorizontal: 14, paddingVertical: 9 },
  fixBtnText: { color: c.primary, fontSize: 13.5, fontWeight: '800' },

  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.textMuted },
  bulletText: { flex: 1, fontSize: 14.5, color: c.text, fontWeight: '500' },

  warnCard: { marginTop: 16, backgroundColor: c.warning + '1f', borderRadius: 16, borderWidth: 1, borderColor: c.warning + '55', padding: 16 },
  warnText: { flex: 1, fontSize: 14, color: c.text, fontWeight: '600', lineHeight: 20 },
  warnBtn: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: c.warning, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  warnBtnText: { color: c.onPrimary, fontSize: 14, fontWeight: '800' },

  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 18, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: c.danger, borderColor: c.danger },
  consentText: { fontSize: 14, color: c.text, fontWeight: '600', lineHeight: 20 },
  consentNote: { fontSize: 12.5, color: c.textMuted, marginTop: 6, lineHeight: 18 },

  otpRow: { flexDirection: 'row', gap: 8, marginTop: 24, marginBottom: 8 },
  otpBox: { flex: 1, maxWidth: 52, height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  otpBoxActive: { borderColor: c.primary },
  otpDigit: { fontSize: 22, fontWeight: '800', color: c.text },
  otpInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent', fontSize: 1 },
  errorText: { color: c.danger, fontSize: 13.5, fontWeight: '600', marginTop: 6 },
  resendBtn: { alignSelf: 'flex-start', paddingVertical: 10 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  footerText: { flex: 1, fontSize: 14, color: c.textMuted, fontWeight: '600', lineHeight: 20 },

  actions: { marginTop: 28, gap: 10 },
  primaryBtn: { height: 52, borderRadius: 14, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  dangerBtn: { backgroundColor: '#dc2626' },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: 'white', fontSize: 15.5, fontWeight: '800' },
  secondaryBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: c.textMuted, fontSize: 15, fontWeight: '700' },
  linkBtn: { paddingVertical: 8 },
  linkText: { color: c.primary, fontSize: 14, fontWeight: '700' },

  doneWrap: { alignItems: 'center', paddingTop: 24 },
  doneIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  doneTitle: { fontSize: 21, fontWeight: '900', color: c.text, textAlign: 'center', marginBottom: 10 },
  doneText: { fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
}));
