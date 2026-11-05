import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, ScrollView, Platform, KeyboardAvoidingView, Image, Animated, Easing, PanResponder } from 'react-native';
import { showAlert } from '../utils/alert';
import { consumePendingDeepLink } from '../utils/deepLink';
import { trackEvent } from '../utils/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { StateCityFields } from '../components/shared/StateCityFields';
import { ArrowRight, Lock, User, CheckCircle2, CalendarDays, Heart, Briefcase, Eye, EyeOff, Gift, Info, Check } from 'lucide-react-native';
import { authService } from '../services/auth';
import { BACKEND_BASE } from '../services/api';
import { profileService } from '../services/profile';
import { referralService } from '../services/referral';
import { useUserSocket } from '../context/UserSocketContext';
import { LaunchConfetti } from '../components/shared/LaunchConfetti';
import { EARLY_BIRD_COINS } from '../utils/earlyBird';
import { useTheme, makeStyles } from '../theme';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';
let GoogleSignin: any = null;
let isErrorWithCode: any = null;
let statusCodes: any = {};
try {
  const gs = require('@react-native-google-signin/google-signin');
  GoogleSignin = gs.GoogleSignin;
  isErrorWithCode = gs.isErrorWithCode;
  statusCodes = gs.statusCodes;
} catch (_) {}

let FBLoginManager: any = null;
let FBAccessToken: any = null;
try {
  const fb = require('react-native-fbsdk-next');
  FBLoginManager = fb.LoginManager;
  FBAccessToken = fb.AccessToken;
} catch (_) {}

// Apple authentication is iOS-only. The native module (expo-apple-authentication)
// is excluded from Android autolinking (package.json → expo.autolinking) after the
// Android launch-crash isolation, so only require it on iOS.
let AppleAuthentication: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (_) {}
}

// Web OAuth client (karmaverse.earth) — configured for Google Identity Services on web only.
// Native (Android/iOS) still uses the separate webClientId passed to GoogleSignin.configure in App.tsx.
const GOOGLE_WEB_CLIENT_ID = '152765471990-4g23up0gau0bclvkm3gk67fa1mpbe5r8.apps.googleusercontent.com';

let googleIdentityScriptPromise: Promise<void> | null = null;
function loadGoogleIdentityScript(): Promise<void> {
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;
  // Don't cache a failure forever — reject paths null this out first so a future
  // mount (e.g. navigating back to this step) can retry loading the script instead
  // of staying permanently stuck on one failed attempt.
  const failAndReset = (reject: (err: Error) => void, err: Error) => {
    googleIdentityScriptPromise = null;
    reject(err);
  };
  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.id) { resolve(); return; }
    // A script tag that never fires onload OR onerror (e.g. silently blocked by an ad
    // blocker/extension/network policy) would otherwise hang this promise forever,
    // leaving the button permanently invisible with no error shown.
    const timeout = setTimeout(() => {
      failAndReset(reject, new Error('Google Sign-In script timed out loading — check for an ad blocker, browser extension, or network/firewall blocking accounts.google.com.'));
    }, 8000);
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); failAndReset(reject, new Error('Could not load Google Sign-In. Check your connection.')); };
    document.head.appendChild(script);
  });
  return googleIdentityScriptPromise;
}

// Facebook Login for web — mirrors the Google Identity Services loader above.
// Native (Android/iOS) uses react-native-fbsdk-next instead (see handleFacebookSignInNative).
const FACEBOOK_APP_ID = '2040037600233582';
const FACEBOOK_GRAPH_VERSION = 'v25.0';

let facebookSdkScriptPromise: Promise<void> | null = null;
function loadFacebookSdkScript(): Promise<void> {
  if (facebookSdkScriptPromise) return facebookSdkScriptPromise;
  const failAndReset = (reject: (err: Error) => void, err: Error) => {
    facebookSdkScriptPromise = null;
    reject(err);
  };
  facebookSdkScriptPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).FB) { resolve(); return; }
    const timeout = setTimeout(() => {
      failAndReset(reject, new Error('Facebook Sign-In script timed out loading — check for an ad blocker, browser extension, or network/firewall blocking connect.facebook.net.'));
    }, 8000);
    (window as any).fbAsyncInit = () => {
      clearTimeout(timeout);
      (window as any).FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: FACEBOOK_GRAPH_VERSION,
      });
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onerror = () => { clearTimeout(timeout); failAndReset(reject, new Error('Could not load Facebook Sign-In. Check your connection.')); };
    document.head.appendChild(script);
  });
  return facebookSdkScriptPromise;
}

// Sign in with Apple for web — Apple's JS SDK in popup mode. Web logins are issued
// to this Services ID (not the app's bundle ID), so it must exist in the Apple
// Developer account with karmaverse.earth and the redirect URI below registered,
// and the backend must accept it as a token audience.
const APPLE_WEB_LOGIN_LIVE = true;
const APPLE_WEB_SERVICES_ID = 'com.karmacredits.web';

let appleJsScriptPromise: Promise<void> | null = null;
function loadAppleJsScript(): Promise<void> {
  if (appleJsScriptPromise) return appleJsScriptPromise;
  const failAndReset = (reject: (err: Error) => void, err: Error) => {
    appleJsScriptPromise = null;
    reject(err);
  };
  appleJsScriptPromise = new Promise<void>((resolve, reject) => {
    if ((window as any).AppleID?.auth) { resolve(); return; }
    const timeout = setTimeout(() => {
      failAndReset(reject, new Error('Apple Sign-In script timed out loading — check for an ad blocker, browser extension, or network/firewall blocking appleid.cdn-apple.com.'));
    }, 8000);
    const script = document.createElement('script');
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      (window as any).AppleID.auth.init({
        clientId: APPLE_WEB_SERVICES_ID,
        scope: 'name email',
        redirectURI: `${window.location.origin}/login`,
        usePopup: true,
      });
      resolve();
    };
    script.onerror = () => { clearTimeout(timeout); failAndReset(reject, new Error('Could not load Apple Sign-In. Check your connection.')); };
    document.head.appendChild(script);
  });
  return appleJsScriptPromise;
}

type Step = 'entry' | 'checking' | 'login' | 'signup' | 'verify_signup_otp' | 'welcome_celebration' | 'referral_bonus' | 'demographics' | 'reset_password';

// Covers the common emoji Unicode blocks — used to reject emojis in email fields.
// Two copies: EMOJI_REGEX (no 'g') for .test(), EMOJI_REGEX_GLOBAL for .replace() —
// a single 'g'-flagged regex would carry lastIndex state across repeated .test() calls.
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/u;
const EMOJI_REGEX_GLOBAL = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E0}-\u{1F1FF}]/gu;

// Reusable Components
function InputField({ placeholder, value, onChange, secureTextEntry = false, icon, autoFocus = false, keyboardType = 'default', maxLength, showToggle = false, onSubmitEditing, returnKeyType, inputRef, textContentType, autoComplete, guardAutofill = false }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(secureTextEntry);
  // Bulletproof anti-autofill: on web the field starts read-only so the browser's
  // password manager can't dump (and mask) a saved password into it on load. It
  // becomes editable the moment the user focuses it, so typing is unaffected.
  const [autofillLocked, setAutofillLocked] = useState(guardAutofill && Platform.OS === 'web');
  // Tell password-manager extensions (LastPass / 1Password / Bitwarden / Dashlane)
  // to leave this field alone — they overlay and MASK fields they think are
  // passwords, even a plain text input, which was turning the typed mobile number
  // into dots. Web-only, and only for fields that opt in via guardAutofill.
  const ignoreProps: any = (guardAutofill && Platform.OS === 'web')
    ? { 'data-lpignore': 'true', 'data-1p-ignore': 'true', 'data-bwignore': 'true', 'data-form-type': 'other', name: 'kv-mobile', nativeID: 'kv-mobile' }
    : {};
  return (
    <View style={styles.inputContainer}>
      {icon && <View style={[styles.iconWrapper, { pointerEvents: 'none' }]}>{icon}</View>}
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          icon ? { paddingLeft: 48 } : {},
          showToggle ? { paddingRight: 48 } : {},
          // Force characters to render as plain text on web — overrides any
          // password-style masking (CSS text-security) an extension/UA applies.
          (guardAutofill && Platform.OS === 'web') ? ({ WebkitTextSecurity: 'none' } as any) : {},
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={value}
        onChangeText={onChange}
        secureTextEntry={guardAutofill ? false : hidden}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        textContentType={textContentType}
        autoComplete={autoComplete}
        editable={autofillLocked ? false : undefined}
        onFocus={() => { if (autofillLocked) setAutofillLocked(false); }}
        autoCorrect={false}
        autoCapitalize="none"
        {...ignoreProps}
      />
      {showToggle && (
        <TouchableOpacity style={{ position: 'absolute', right: 16, zIndex: 1 }} onPress={() => setHidden((h: boolean) => !h)} activeOpacity={0.7}>
          {hidden ? <EyeOff size={18} color={colors.textFaint} /> : <Eye size={18} color={colors.textFaint} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

function PrimaryButton({ onPress, disabled, loading, children, style }: any) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={[styles.button, disabled && !loading ? styles.buttonDisabled : undefined, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color="#fff" /> : children}
    </TouchableOpacity>
  );
}

function SelectionPills({ options, selected, onSelect }: { options: string[], selected: string, onSelect: (v: string) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.pillsContainer}>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            {isActive && <CheckCircle2 size={14} color="white" style={{ marginRight: 6 }} />}
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const JOURNEY_STAGES = ['Register', 'Claim Reward', 'Start Your Eco Journey'] as const;

function SignupJourneyProgress({ stage }: { stage: 0 | 1 | 2 }) {
  const styles = useStyles();
  return (
    <View style={styles.journeyProgress}>
      {JOURNEY_STAGES.map((label, i) => (
        <React.Fragment key={label}>
          <Text style={[styles.journeyStage, i <= stage && styles.journeyStageActive]}>{label}</Text>
          {i < JOURNEY_STAGES.length - 1 && <Text style={styles.journeyArrow}>→</Text>}
        </React.Fragment>
      ))}
    </View>
  );
}

export function LoginScreen({ navigation }: any) {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets(); // bottom inset so "Skip for now" clears the Android gesture pill
  const { reconnect } = useUserSocket();
  const [step, setStep] = useState<Step>('entry');
  const [checkingSlow, setCheckingSlow] = useState(false);

  // Backend runs on a free-tier host that cold-starts after inactivity — if the
  // account check takes a while, let the user know it's not stuck.
  useEffect(() => {
    if (step !== 'checking') { setCheckingSlow(false); return; }
    const t = setTimeout(() => setCheckingSlow(true), 4000);
    return () => clearTimeout(t);
  }, [step]);

  // This whole flow (Welcome/email entry → login/signup → OTP → ...) lives in one
  // screen driven by local `step` state, not separate navigator routes — so the
  // browser/hardware back button has no history entry for "Welcome" and would pop
  // straight out to the landing page, skipping it. Intercept back and step the
  // local flow backward instead, same as the on-screen back controls do.
  useEffect(() => {
    const backStep: Partial<Record<Step, Step>> = {
      checking: 'entry',
      login: 'entry',
      signup: 'entry',
      verify_signup_otp: 'signup',
      reset_password: 'login',
    };
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      // Let our own forward navigation through — replace('App') after a
      // successful login dispatches REPLACE/NAVIGATE and MUST NOT be cancelled,
      // or a valid login bounces back to the email step. Everything else
      // (hardware GO_BACK/POP, and browser back which arrives as RESET_ROOT via
      // web linking) steps the local flow backward instead.
      const actionType = e?.data?.action?.type;
      if (actionType === 'REPLACE' || actionType === 'NAVIGATE') return;
      const prevStep = backStep[step];
      if (!prevStep) return;
      e.preventDefault();
      setStep(prevStep);
    });
    return sub;
  }, [navigation, step]);

  const [identifier, setIdentifier] = useState('');
  // Phone linked to the account, captured from check-user during login detection —
  // lets "Forgot password" pre-fill the user's mobile number (where the OTP is sent)
  // instead of the email they logged in with.
  const [linkedPhone, setLinkedPhone] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [signupOtp, setSignupOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<Array<any>>([]);
  const newPasswordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);
  const [resetSubStep, setResetSubStep] = useState<'send_otp' | 'verify_otp' | 'new_password'>('send_otp');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Per-provider loading so a spinner only shows on the button that was tapped
  // (Google's flow used the shared isLoading, which lit up the Facebook button).
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const appleInFlight = useRef(false);
  const [isOffline, setIsOffline] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [signupErrors, setSignupErrors] = useState<{ name?: string; email?: string; phone?: string; password?: string; general?: string }>({});
  // OTP token — memory only, never persisted (valid 10 min)
  const [otpToken, setOtpToken] = useState('');
  // Resend countdown timer (seconds), driven by server retryAfter
  const [resendTimer, setResendTimer] = useState(0);
  // Phone used in forgot password flow
  const [forgotPhone, setForgotPhone] = useState('');
  // Welcome Celebration scratch card — has the user revealed their signup bonus yet
  const [scratched, setScratched] = useState(false);
  const scratchedRef = useRef(false);
  const scratchDist = useRef(0);
  const scratchFoilAnim = useRef(new Animated.Value(0)).current;
  const scratchRevealAnim = useRef(new Animated.Value(0)).current;
  // Set when Google Identity Services fails to load/init on web (e.g. origin not authorized yet)
  const [googleBtnError, setGoogleBtnError] = useState('');

  // Referral code (optional, signup only)
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [referralValidName, setReferralValidName] = useState('');
  const referralTimerRef = useRef<any>(null);

  // Deep link — auto-fill referral code if the app/page was opened via a referral
  // link. Native stores the code (App.tsx); web reads ?ref= from the URL (the
  // backend /r/:code route redirects to /register?ref=CODE, rewritten to /login).
  React.useEffect(() => {
    AsyncStorage.getItem('pendingReferralCode').then(code => {
      if (code) {
        setReferralCode(code);
        AsyncStorage.removeItem('pendingReferralCode');
      }
    });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const ref = new URLSearchParams(window.location.search).get('ref');
        if (ref) setReferralCode(ref.trim().toUpperCase());
      } catch (_) { /* URL not parseable */ }
    }
  }, []);

  // Demographics State
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [sexualOrientation, setSexualOrientation] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [employment, setEmployment] = useState('');
  const [stateName, setStateName] = useState(''); // required
  const [city, setCity] = useState('');           // required

  // BUG-002: Check connectivity immediately when signup step opens
  React.useEffect(() => {
    if (step === 'signup' || step === 'login') {
      fetch(`${BACKEND_BASE}/`, { method: 'HEAD' })
        .then(() => setIsOffline(false))
        .catch(() => setIsOffline(true));
    } else {
      setIsOffline(false);
    }
  }, [step]);

  // Resend OTP countdown timer
  React.useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Debounced referral code validation (500ms)
  React.useEffect(() => {
    if (referralTimerRef.current) clearTimeout(referralTimerRef.current);
    const code = referralCode.trim().toUpperCase();
    if (!code) { setReferralStatus('idle'); setReferralValidName(''); return; }
    setReferralStatus('loading');
    referralTimerRef.current = setTimeout(async () => {
      try {
        const data = await referralService.validateCode(code);
        if (data.valid) {
          setReferralValidName(data.referrerName || '');
          setReferralStatus('valid');
        } else {
          setReferralStatus('invalid');
          setReferralValidName('');
        }
      } catch {
        setReferralStatus('invalid');
        setReferralValidName('');
      }
    }, 500);
    return () => { if (referralTimerRef.current) clearTimeout(referralTimerRef.current); };
  }, [referralCode]);

  // Focus new password field via ref when substep opens (avoids autoFocus + secureTextEntry iOS bug)
  React.useEffect(() => {
    if (resetSubStep === 'new_password') {
      const t = setTimeout(() => newPasswordRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [resetSubStep]);

  const finishGoogleLogin = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await authService.googleLogin(idToken);
      trackEvent('login', { method: 'google' });
      reconnect();
      navigation.replace('App');
      // If they arrived from a protected email/share link while logged out, send
      // them on to it now (e.g. the specific booking's tracking page).
      consumePendingDeepLink(navigation);
    } catch (error: any) {
      showAlert('Google sign-in failed', error?.response?.data?.message || 'Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const finishAppleLogin = async (
    identityToken: string,
    authorizationCode?: string | null,
    fullName?: string | null,
  ) => {
    setAppleLoading(true);
    try {
      await authService.appleLogin(identityToken, authorizationCode, fullName);
      reconnect();
      navigation.replace('App');
      consumePendingDeepLink(navigation);
    } catch (error: any) {
      showAlert('Apple sign-in failed', error?.response?.data?.message || 'Please try again.');
    } finally {
      setAppleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!AppleAuthentication) {
      showAlert('Not available', 'Apple Sign-In requires a native iOS build.');
      return;
    }
    // A second tap while Apple's sheet is opening starts a new request, which makes
    // AuthKit cancel the first one — block re-entry for the whole native prompt.
    if (appleInFlight.current) return;
    appleInFlight.current = true;
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token received from Apple');
      // Apple returns the user's name ONLY on the very first authorization — capture
      // it when present so the backend can save it; it's null on every later sign-in.
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ') || null
        : null;
      await finishAppleLogin(credential.identityToken, credential.authorizationCode, fullName);
    } catch (e: any) {
      // Backing out of the native Apple sheet (ASAuthorizationError 1001) is a quiet no-op.
      const canceled = e?.code === 'ERR_REQUEST_CANCELED' || /cancel/i.test(String(e?.message ?? ''));
      if (!canceled) showAlert('Apple sign-in failed', 'Please try again.');
    } finally {
      appleInFlight.current = false;
      setAppleLoading(false);
    }
  };

  const handleAppleSignInWeb = async () => {
    if (appleInFlight.current) return;
    appleInFlight.current = true;
    setAppleLoading(true);
    try {
      await loadAppleJsScript();
      const res = await (window as any).AppleID.auth.signIn();
      const identityToken = res?.authorization?.id_token;
      if (!identityToken) throw new Error('No identity token received from Apple');
      // As on iOS, Apple sends the name only on the first authorization.
      const name = res?.user?.name;
      const fullName = name ? [name.firstName, name.lastName].filter(Boolean).join(' ') || null : null;
      await finishAppleLogin(identityToken, res?.authorization?.code, fullName);
    } catch (e: any) {
      // Closing Apple's popup rejects with { error: 'popup_closed_by_user' } — a quiet no-op.
      const canceled = /popup_closed_by_user|user_cancelled_authorize|user_trigger_new_signin_flow/.test(String(e?.error ?? ''));
      if (!canceled) showAlert('Apple sign-in failed', e?.message || 'Please try again.');
    } finally {
      appleInFlight.current = false;
      setAppleLoading(false);
    }
  };

  // Mounts Google's own "Sign in with Google" button into `node` (web only).
  // Used as a ref callback so it re-attaches whenever the container remounts.
  const mountGoogleButton = useCallback((node: any) => {
    if (!node || Platform.OS !== 'web') return;
    (async () => {
      try {
        await loadGoogleIdentityScript();
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          callback: (resp: any) => {
            if (resp?.credential) finishGoogleLogin(resp.credential);
            else showAlert('Google sign-in failed', 'Please try again.');
          },
          log_level: 'debug',
        });
        node.innerHTML = '';
        // Defer rendering until after layout settles (the ref callback can fire before
        // the container has a real size) — a double rAF guarantees at least one paint.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          // Icon-only circular Google button layered transparently over our own icon.
          google.accounts.id.renderButton(node, { type: 'icon', shape: 'circle', theme: 'outline', size: 'large' });
          // GIS fails silently (logs to console, doesn't throw) when the origin isn't
          // authorized for this client ID — detect the empty result and surface it.
          setTimeout(() => {
            if (!node.children || node.children.length === 0) {
              setGoogleBtnError(
                `Google didn't render a button for origin ${window.location.origin}. ` +
                `This origin is most likely not yet added as an Authorized JavaScript origin for client ID ${GOOGLE_WEB_CLIENT_ID} in Google Cloud Console. Check the browser console for the exact GSI error.`
              );
            }
          }, 1200);
        }));
      } catch (error: any) {
        setGoogleBtnError(error?.message || 'Failed to load Google Sign-In.');
        console.warn('Google Identity Services failed to load', error);
      }
    })();
  }, []);

  const handleGoogleSignInNative = async () => {
    if (!GoogleSignin) {
      showAlert('Not available', 'Google Sign-In requires a native build. Use APK to test.');
      return;
    }
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      // v13+ no longer throws SIGN_IN_CANCELLED on cancel — it returns
      // { type: 'cancelled' }. Treat that as a quiet no-op (user backed out),
      // not an error, so no "Google sign-in failed" dialog appears.
      if (response?.type === 'cancelled') { setGoogleLoading(false); return; }
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('No ID token received from Google');
      await finishGoogleLogin(idToken); // clears googleLoading in its finally
    } catch (error: any) {
      setGoogleLoading(false);
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          showAlert('Not available', 'Google Play Services not available on this device.');
          return;
        }
      }
      showAlert('Google sign-in failed', error?.response?.data?.message || 'Please try again.');
    }
  };

  const finishFacebookLogin = async (accessToken: string) => {
    if (__DEV__) console.log('[Facebook Login] accessToken:', accessToken);
    setFacebookLoading(true);
    try {
      await authService.facebookLogin(accessToken);
      trackEvent('login', { method: 'facebook' });
      reconnect();
      navigation.replace('App');
      // If they arrived from a protected email/share link while logged out, send
      // them on to it now (e.g. the specific booking's tracking page).
      consumePendingDeepLink(navigation);
    } catch (error: any) {
      const isNetworkError = !error?.response;
      showAlert(
        isNetworkError ? 'No internet connection' : 'Facebook sign-in failed',
        isNetworkError
          ? 'Please check your network connection and try again.'
          : (error?.response?.data?.message || 'Please try again.')
      );
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleFacebookSignInNative = async () => {
    if (!FBLoginManager || !FBAccessToken) {
      showAlert('Not available', 'Facebook Sign-In requires a native build. Use APK to test.');
      return;
    }
    setFacebookLoading(true);
    try {
      // Clear any cached Facebook session first so the login always starts fresh.
      // Otherwise Facebook silently reuses the previous account and a different
      // ID can't be chosen ("Continue as <previous user>" with no way to switch).
      try { await FBLoginManager.logOut(); } catch (_) {}
      const result = await FBLoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) { setFacebookLoading(false); return; }
      const data = await FBAccessToken.getCurrentAccessToken();
      if (!data?.accessToken) throw new Error('No access token received from Facebook');
      await finishFacebookLogin(data.accessToken); // clears facebookLoading in its finally
    } catch (error: any) {
      setFacebookLoading(false);
      showAlert('Facebook sign-in failed', error?.response?.data?.message || 'Please try again.');
    }
  };

  const handleFacebookSignInWeb = async () => {
    setFacebookLoading(true);
    try {
      await loadFacebookSdkScript();
    } catch (error: any) {
      setFacebookLoading(false);
      showAlert('Facebook sign-in failed', error?.message || 'Could not load Facebook Sign-In. Check your connection.');
      return;
    }
    const FB = (window as any).FB;
    if (!FB) {
      setFacebookLoading(false);
      showAlert('Facebook sign-in failed', 'Facebook Sign-In is unavailable right now. It may be blocked by an ad blocker or browser extension.');
      return;
    }
    try {
      FB.login((response: any) => {
        const accessToken = response?.authResponse?.accessToken;
        if (accessToken) {
          finishFacebookLogin(accessToken); // clears facebookLoading in its finally
          return;
        }
        // User closed/cancelled the popup — stop the spinner.
        setFacebookLoading(false);
        if (response?.status === 'not_authorized') {
          showAlert('Facebook sign-in failed', 'Permission was not granted. Please try again.');
        }
      }, { scope: 'public_profile,email' });
    } catch (error: any) {
      setFacebookLoading(false);
      // FB.login throws synchronously if the login popup is blocked by the browser.
      showAlert('Facebook sign-in failed', 'The Facebook login popup was blocked. Please allow popups for this site and try again.');
    }
  };

  const handleContinue = async () => {
    const raw = identifier.trim();
    if (!raw) {
      setEmailError('Please enter your email address or mobile number.');
      return;
    }

    // All digits → treat as a mobile number, otherwise as an email
    const isPhoneInput = /^\d+$/.test(raw);

    if (isPhoneInput) {
      if (!/^[6-9]\d{9}$/.test(raw)) {
        setEmailError('Please enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.');
        return;
      }
    } else {
      if (raw.length > 254) {
        setEmailError('Email address cannot exceed 254 characters.');
        return;
      }
      if (EMOJI_REGEX.test(identifier)) {
        setEmailError('Email address cannot contain emojis.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(raw)) {
        setEmailError('Please enter a valid email address or mobile number.');
        return;
      }
    }

    setEmailError('');

    // check-user now supports both email and phone — route to the password step
    // only if an account actually exists, otherwise send the user to sign up.
    setStep('checking');
    const routeByResult = (res: any) => {
      if (res?.data?.isRegistered) {
        // Remember the account's linked mobile number (any field the backend uses),
        // but only a real 10-digit one — a masked value can't be used to send OTP.
        const d = res?.data || {};
        const lp = d.phone || d.mobile || d.user?.phone || d.user?.mobile || '';
        setLinkedPhone(/^[6-9]\d{9}$/.test(String(lp)) ? String(lp) : '');
        setStep('login');
      } else {
        // Pre-fill the right field on the sign-up form based on what they typed
        if (isPhoneInput) setPhone(raw);
        else setEmail(raw);
        setStep('signup');
      }
    };
    try {
      routeByResult(await authService.checkUser(raw));
    } catch (error: any) {
      const browserOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      // No response but the browser IS online → the Render free-tier backend is
      // cold-starting (first request after it sleeps can exceed the timeout). Keep
      // retrying in the background — the screen stays on the "Waking up the server…"
      // loader — instead of asking the user to tap Continue again. It resolves on its
      // own the moment the server is awake (usually within ~30–60s).
      if (!error?.response && !browserOffline) {
        for (let attempt = 0; attempt < 2; attempt++) {
          await new Promise((r) => setTimeout(r, 2500)); // brief pause between tries
          try {
            routeByResult(await authService.checkUser(raw));
            return;
          } catch (_) { /* still waking — keep trying */ }
        }
      }
      if (!error?.response) {
        showAlert(
          browserOffline ? 'No internet connection' : "Couldn't reach the server",
          browserOffline
            ? 'Please check your network connection and try again.'
            : 'The server is taking longer than usual to respond. Please try again in a moment.',
        );
      } else {
        showAlert('Error', error?.response?.data?.message || 'Failed to check account.');
      }
      setStep('entry');
    }
  };

  const handleSignupSubmit = async () => {
    const errs: { name?: string; email?: string; phone?: string; password?: string; general?: string } = {};
    if (!name.trim() || !email.trim() || !phone.trim() || !password) return;
    if (EMOJI_REGEX.test(email)) errs.email = 'Email address cannot contain emojis.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Please enter a valid email address.';
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) errs.name = 'Full name should contain only letters.';
    if (!/^[6-9]\d{9}$/.test(phone.trim())) errs.phone = 'Please enter a valid Indian mobile number (must start with 6, 7, 8 or 9).';
    if (password.length < 8 || !/\d/.test(password)) errs.password = 'Password must be at least 8 characters and include a number.';
    if (Object.keys(errs).length > 0) { setSignupErrors(errs); return; }
    setSignupErrors({});

    setIsLoading(true);
    try {
      const res = await authService.sendOtp(phone.trim(), 'registration');
      setResendTimer(res?.data?.retryAfter || res?.retryAfter || 60);
      setSignupOtp(['', '', '', '', '', '']);
      setStep('verify_signup_otp');
    } catch (error: any) {
      const isNetworkError = !error?.response;
      const d = error?.response?.data;
      const serverMsg = d?.message || d?.error || d?.msg || (typeof d === 'string' ? d : null);
      setSignupErrors({
        general: isNetworkError
          ? 'No internet connection. Please check your network and try again.'
          : (serverMsg || 'Could not send OTP. Please try again.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignupOtp = async () => {
    const otp = signupOtp.join('');
    if (otp.length < 6) return;
    setIsLoading(true);
    try {
      const verifyRes = await authService.verifyOtp(phone.trim(), otp, 'registration');
      const token = verifyRes?.data?.otpToken;
      if (!token) throw new Error('OTP verification failed — no token received.');
      await authService.register({
        name, email, phone: phone.trim(), password, otpToken: token,
        ...(referralStatus === 'valid' && referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
      });
      // The automatic login below is part of sign-up, so it deliberately sends no login event.
      trackEvent('sign_up', { method: 'phone_otp' });
      try {
        await authService.login(email, password);
        setStep('welcome_celebration');
      } catch (_) {
        showAlert('Account created!', 'Your account was created. Please log in.', [{ text: 'Login', onPress: () => setStep('login') }]);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message;
      // 429 = too many attempts, send back to phone entry
      if (error?.response?.status === 429) {
        setSignupOtp(['', '', '', '', '', '']);
        setStep('signup');
        setSignupErrors({ general: msg || 'Too many attempts. Please request a new OTP.' });
      } else {
        showAlert('Verification failed', msg || 'Invalid or expired OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleScratchCard = () => {
    if (scratchedRef.current) return;
    scratchedRef.current = true;
    setScratched(true);
    Animated.parallel([
      Animated.timing(scratchFoilAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scratchRevealAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();
  };

  // Real scratch gesture: reveal only after the finger/mouse is dragged across the
  // foil (a plain tap won't do it) — matches the "Scratch to reveal" label.
  const scratchPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !scratchedRef.current,
      onMoveShouldSetPanResponder: () => !scratchedRef.current,
      onPanResponderGrant: () => { scratchDist.current = 0; },
      onPanResponderMove: (_e, g) => {
        scratchDist.current += Math.abs(g.dx) + Math.abs(g.dy);
        if (scratchDist.current > 45) handleScratchCard();
      },
    })
  ).current;

  const continueFromWelcomeCelebration = () => {
    setStep(referralStatus === 'valid' ? 'referral_bonus' : 'demographics');
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...signupOtp];
    newOtp[index] = text.replace(/[^0-9]/g, '');
    setSignupOtp(newOtp);
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !signupOtp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleLoginSubmit = async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      await authService.login(identifier, password);
      trackEvent('login', { method: 'password' });
      reconnect();
      navigation.replace('App');
      // If they arrived from a protected email/share link while logged out, send
      // them on to it now (e.g. the specific booking's tracking page).
      consumePendingDeepLink(navigation);
    } catch (error: any) {
      const status = error?.response?.status;
      const isNetworkError = !error?.response;
      if (status === 429) {
        showAlert(
          'Too many attempts',
          error?.response?.data?.message ||
            'Too many login attempts. Please wait a while and try again.'
        );
      } else {
        const isPhoneId = /^\d+$/.test(identifier.trim());
        const backendMsg = error?.response?.data?.message || '';
        // A 500 with the raw bcrypt error ("Illegal arguments: string, undefined")
        // means the server couldn't read the stored password hash — a backend
        // issue, not a wrong password. Show a neutral message, not the raw error.
        const serverHashError = status === 500 && /illegal arguments|data and hash arguments required/i.test(backendMsg);
        showAlert(
          isNetworkError ? 'No internet connection' : 'Login failed',
          isNetworkError
            ? 'Please check your network connection and try again.'
            : serverHashError
              ? 'We couldn’t verify your password right now due to a server issue. Please try again in a moment, or use “Forgot password” to reset it. If it keeps failing, contact support.'
              : isPhoneId && status === 401
                ? 'Incorrect password, or no account exists with this mobile number. New here? Go back and sign up with your email.'
                : (backendMsg || 'Incorrect email or password. Please try again.')
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 100) {
      showAlert('Invalid age', 'You must be at least 13 years old to use KarmaVerse.');
      return;
    }
    setIsLoading(true);
    try {
      await profileService.updateDemographics({ age: ageNum, gender, sexualOrientation, maritalStatus, employment, state: stateName.trim(), city: city.trim() });
      reconnect();
      navigation.replace('App', { screen: 'Dashboard', params: { justClaimedWelcomeBonus: true } });
    } catch (error: any) {
      const isNetworkError = !error?.response;
      showAlert(
        isNetworkError ? 'No Internet Connection' : 'Failed to Save',
        isNetworkError
          ? 'Could not save your details. Please check your connection.'
          : 'Failed to save profile details. Please try again.',
        [
          { text: 'Retry', onPress: handleCompleteRegistration },
          { text: 'Skip', style: 'cancel', onPress: () => { reconnect(); navigation.replace('App', { screen: 'Dashboard', params: { justClaimedWelcomeBonus: true } }); } }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showAlert('Invalid password', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match', 'New password and confirm password must be the same.');
      return;
    }
    if (!otpToken) {
      showAlert('Session expired', 'OTP session expired. Please start again.');
      setResetSubStep('send_otp');
      return;
    }
    setIsLoading(true);
    try {
      await authService.resetPassword(forgotPhone.trim(), newPassword, otpToken);
      setOtpToken('');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setForgotPhone('');
      showAlert('Password reset!', 'Your password has been reset successfully. Please log in.');
      setStep('login');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to reset password.';
      // expired/invalid token — restart flow
      if (error?.response?.status === 400 && msg.toLowerCase().includes('expired')) {
        setOtpToken('');
        setResetSubStep('send_otp');
        showAlert('Session expired', 'OTP expired. Please request a new one.');
      } else {
        showAlert('Reset failed', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 'entry') {
      return (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.stepContent}>
          <View>
            <Text style={styles.title}>Welcome 👋</Text>
            <Text style={styles.subtitle}>Enter your email or mobile number to get started</Text>
          </View>
          <InputField
            key="entry-email"
            placeholder="Email or mobile number"
            value={identifier}
            onChange={(t: string) => {
              const cleaned = t.replace(EMOJI_REGEX_GLOBAL, '');
              // Numeric input = phone: digits only, capped at 10
              setIdentifier(/^\d+$/.test(cleaned) ? cleaned.slice(0, 10) : cleaned);
              if (emailError) setEmailError('');
            }}
            icon={<User size={18} color={colors.textFaint} />}
            keyboardType="email-address"
            maxLength={254}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleContinue}
          />
          {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
          <PrimaryButton onPress={handleContinue} disabled={!identifier} loading={isLoading}>
            <Text style={styles.buttonText}>Continue</Text>
            <ArrowRight size={18} color="#fff" />
          </PrimaryButton>

          {/* Social login — brand icon buttons only */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.socialRow}>
              {Platform.OS === 'web' ? (
                googleBtnError ? (
                  <TouchableOpacity
                    style={[styles.socialIconBtn, { borderColor: '#fca5a5' }]}
                    activeOpacity={0.8}
                    onPress={() => showAlert('Google sign-in unavailable', googleBtnError)}
                  >
                    <Info size={22} color="#dc2626" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.socialIconWrap}>
                    <View style={[styles.socialIconBtn, { pointerEvents: 'none' }]}>
                      {googleLoading ? (
                        <ActivityIndicator color="#4285F4" size="small" />
                      ) : (
                        <Svg width="26" height="26" viewBox="0 0 48 48">
                          <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                          <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </Svg>
                      )}
                    </View>
                    <View ref={mountGoogleButton} style={[styles.googleOverlayMount, googleLoading && { display: 'none' }]} />
                  </View>
                )
              ) : (
                <TouchableOpacity style={styles.socialIconBtn} activeOpacity={0.8} disabled={googleLoading} onPress={handleGoogleSignInNative}>
                  {googleLoading ? (
                    <ActivityIndicator color="#4285F4" size="small" />
                  ) : (
                    <Svg width="28" height="28" viewBox="0 0 48 48">
                      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </Svg>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.socialIconBtn, facebookLoading && styles.facebookFullBtnDisabled]}
                activeOpacity={0.8}
                disabled={facebookLoading}
                onPress={Platform.OS === 'web' ? handleFacebookSignInWeb : handleFacebookSignInNative}
              >
                {facebookLoading ? (
                  <ActivityIndicator color="#1877F2" size="small" />
                ) : (
                  <Svg width="32" height="32" viewBox="0 0 24 24">
                    <Path fill="#1877F2" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
                  </Svg>
                )}
              </TouchableOpacity>

              {(Platform.OS === 'ios' || (Platform.OS === 'web' && APPLE_WEB_LOGIN_LIVE)) && (
                <TouchableOpacity
                  style={styles.socialIconBtn}
                  activeOpacity={0.8}
                  disabled={appleLoading}
                  onPress={Platform.OS === 'web' ? handleAppleSignInWeb : handleAppleSignIn}
                >
                  {appleLoading ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <Svg width="26" height="26" viewBox="0 0 384 512">
                      <Path fill={colors.text} d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                    </Svg>
                  )}
                </TouchableOpacity>
              )}
          </View>

          {/* Social sign-up skips the signup form's consent checkbox, so state the
              terms here before the account is created (DPDP consent). */}
          <Text style={styles.socialConsentText}>
            By continuing, you agree to the{' '}
            <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal', { type: 'terms' })}>Terms & Conditions</Text>
            {', '}
            <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal', { type: 'terms-of-use' })}>Terms of Use</Text>
            {' '}and{' '}
            <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      );
    }

    if (step === 'checking') {
      return (
        <View style={[styles.stepContent, { alignItems: 'center', justifyContent: 'center', marginTop: 40 }]}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>
            {checkingSlow ? 'Waking up the server, this can take up to a minute...' : 'Checking your account...'}
          </Text>
        </View>

      );
    }

    if (step === 'login') {
      return (
        <View style={styles.stepContent}>
          <View>
            <Text style={styles.title}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>Account found. Enter your password to continue.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, borderWidth: 1, borderColor: colors.border }}>
              <CheckCircle2 size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', flex: 1 }}>{identifier}</Text>
            </View>
          </View>
          <InputField
            placeholder="Password"
            value={password}
            onChange={setPassword}
            secureTextEntry
            showToggle
            icon={<Lock size={18} color={colors.textFaint} />}
            autoFocus
          />
          <PrimaryButton onPress={handleLoginSubmit} disabled={!password || isLoading} loading={isLoading}>
            <Text style={styles.buttonText}>Login</Text>
            <ArrowRight size={18} color="#fff" />
          </PrimaryButton>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <TouchableOpacity onPress={() => { setStep('entry'); setIdentifier(''); }}>
               <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Change account</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { const id = identifier.trim(); const prefill = linkedPhone || (/^[6-9]\d{9}$/.test(id) ? id : (id.includes('@') ? id : '')); setForgotPhone(prefill); setResetSubStep('send_otp'); setOtpValue(''); setNewPassword(''); setConfirmPassword(''); setStep('reset_password'); }}>
               <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'reset_password') {
      // â”€â”€ Sub-step 1: Send OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (resetSubStep === 'send_otp') {
        return (
          <View style={styles.stepContent}>
            <View>
              <Text style={styles.title}>Forgot password 🔐</Text>
              <Text style={styles.subtitle}>Enter your registered mobile number or email</Text>
            </View>
            <InputField
              placeholder="Mobile number or email"
              value={forgotPhone}
              onChange={(v: string) => setForgotPhone(v.replace(/\s/g, ''))}
              keyboardType="email-address"
              maxLength={254}
              icon={<User size={18} color={colors.textFaint} />}
              autoComplete="username"
              guardAutofill
            />
            <PrimaryButton onPress={async () => {
              const raw = forgotPhone.trim();
              const isEmail = raw.includes('@');
              if (isEmail) {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
                  showAlert('Invalid email', 'Please enter a valid email address.');
                  return;
                }
              } else if (!/^[6-9]\d{9}$/.test(raw)) {
                showAlert('Invalid mobile number', 'Please enter a valid Indian mobile number (must start with 6, 7, 8 or 9), or use your email.');
                return;
              }
              setIsLoading(true);
              try {
                const res = await authService.sendForgotOtp(isEmail ? { email: raw } : { phone: raw });
                // The backend echoes/resolves the phone the OTP was sent to — this
                // becomes the canonical phone for verify-otp and reset-password.
                const resolvedPhone = res?.data?.phone || res?.phone || (isEmail ? '' : raw);
                if (!resolvedPhone) throw new Error('Could not resolve the phone number for this account.');
                setForgotPhone(resolvedPhone);
                setResendTimer(res?.data?.retryAfter || res?.retryAfter || 60);
                setOtpValue('');
                setResetSubStep('verify_otp');
              } catch (error: any) {
                const status = error?.response?.status;
                const d = error?.response?.data;
                const msg = d?.message || d?.error || d?.msg || (typeof d === 'string' ? d : null);
                if (status === 404) {
                  showAlert('No account found', 'No account found with this email. Please check the address or sign up.');
                } else if (status === 400 && /no phone number is linked/i.test(msg || '')) {
                  showAlert('No phone number linked', 'This account has no phone number on file. Please add and verify a phone number from your profile first, or contact support.');
                } else {
                  showAlert('Could not send OTP', msg || 'Please try again.');
                }
              } finally {
                setIsLoading(false);
              }
            }} disabled={!forgotPhone.trim()} loading={isLoading}>
              <Text style={styles.buttonText}>Send OTP</Text>
              <ArrowRight size={18} color="#fff" />
            </PrimaryButton>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('login')}>
              <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Back to login</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // â”€â”€ Sub-step 2: Verify OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (resetSubStep === 'verify_otp') {
        return (
          <View style={styles.stepContent}>
            <View>
              <Text style={styles.title}>Enter OTP 📩</Text>
              <Text style={styles.subtitle}>OTP sent to +91 {forgotPhone}</Text>
            </View>
            <InputField
              placeholder="Enter 6-digit OTP"
              value={otpValue}
              onChange={(v: string) => {
                const clean = v.replace(/[^0-9]/g, '');
                setOtpValue(clean);
              }}
              keyboardType="number-pad"
              maxLength={6}
              icon={<CheckCircle2 size={18} color={colors.textFaint} />}
              autoFocus
            />
            <PrimaryButton onPress={async () => {
              if (otpValue.length < 6) return;
              setIsLoading(true);
              try {
                const res = await authService.verifyOtp(forgotPhone.trim(), otpValue, 'forgot-password');
                const token = res?.data?.otpToken;
                if (!token) throw new Error('Verification failed.');
                setOtpToken(token);
                setResetSubStep('new_password');
              } catch (error: any) {
                const msg = error?.response?.data?.message || error?.message;
                if (error?.response?.status === 429) {
                  // Max attempts hit — force back to phone entry
                  setOtpToken('');
                  setOtpValue('');
                  setResetSubStep('send_otp');
                  showAlert('Too many attempts', msg || 'Please request a new OTP.');
                } else {
                  showAlert('Verification failed', msg || 'Invalid or expired OTP.');
                }
              } finally {
                setIsLoading(false);
              }
            }} disabled={otpValue.length < 6} loading={isLoading}>
              <Text style={styles.buttonText}>Verify OTP</Text>
              <ArrowRight size={18} color="#fff" />
            </PrimaryButton>
            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 10 }}
              disabled={resendTimer > 0}
              onPress={async () => {
                if (resendTimer > 0) return;
                setIsLoading(true);
                try {
                  const res = await authService.sendOtp(forgotPhone.trim(), 'forgot-password');
                  setResendTimer(res?.data?.retryAfter || 60);
                  setOtpValue('');
                } catch (error: any) {
                  showAlert('Could not resend', error?.response?.data?.message || 'Please try again.');
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              <Text style={{ color: resendTimer > 0 ? colors.textFaint : colors.primary, fontWeight: 'bold' }}>
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 8 }} onPress={() => { setResetSubStep('send_otp'); setOtpValue(''); }}>
              <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Back to login</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // â”€â”€ Sub-step 3: New Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (resetSubStep === 'new_password') {
        return (
          <View style={styles.stepContent}>
            <View>
              <Text style={styles.title}>New password 🔑</Text>
              <Text style={styles.subtitle}>Set a new password for {identifier}</Text>
            </View>
            <InputField
              inputRef={newPasswordRef}
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={setNewPassword}
              secureTextEntry
              showToggle
              icon={<Lock size={18} color={colors.textFaint} />}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              textContentType="newPassword"
              autoComplete="password-new"
            />
            <InputField
              inputRef={confirmPasswordRef}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              secureTextEntry
              showToggle
              icon={<Lock size={18} color={colors.textFaint} />}
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
              textContentType="newPassword"
              autoComplete="password-new"
            />
            <PrimaryButton onPress={handleResetPassword} disabled={!newPassword || !confirmPassword || isLoading} loading={isLoading}>
              <Text style={styles.buttonText}>Reset password</Text>
              <CheckCircle2 size={18} color="#fff" />
            </PrimaryButton>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('login')}>
              <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Back to login</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    if (step === 'signup') {
      return (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.stepContent}>
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>⚠️ No internet connection. Please check your network.</Text>
            </View>
          )}
          <SignupJourneyProgress stage={0} />
            <View>
              <Text style={styles.title}>Create your account 🌱</Text>
              <Text style={styles.subtitle}>Join us and earn KarmaCoins XP!</Text>
            </View>
            <InputField
              placeholder="Email address"
              value={email}
              onChange={(v: string) => { setEmail(v.replace(EMOJI_REGEX_GLOBAL, '')); setSignupErrors(e => ({ ...e, email: undefined })); }}
              keyboardType="email-address"
              icon={<User size={18} color={colors.textFaint} />}
            />
            {signupErrors.email ? <Text style={styles.fieldError}>{signupErrors.email}</Text> : null}
            <InputField
              placeholder="Full name"
              value={name}
              onChange={(v: string) => { setName(v.replace(/[^a-zA-Z\s]/g, '')); setSignupErrors(e => ({ ...e, name: undefined })); }}
              icon={<User size={18} color={colors.textFaint} />}
            />
            {signupErrors.name ? <Text style={styles.fieldError}>{signupErrors.name}</Text> : null}
            <InputField
              placeholder="Mobile number (10 digits)"
              value={phone}
              onChange={(v: string) => { setPhone(v.replace(/[^0-9]/g, '')); setSignupErrors(e => ({ ...e, phone: undefined })); }}
              keyboardType="number-pad"
              maxLength={10}
              icon={<User size={18} color={colors.textFaint} />}
            />
            {signupErrors.phone ? <Text style={styles.fieldError}>{signupErrors.phone}</Text> : null}
            <InputField
              placeholder="Create password"
              value={password}
              onChange={(v: string) => { setPassword(v); setSignupErrors(e => ({ ...e, password: undefined })); }}
              secureTextEntry
              showToggle
              icon={<Lock size={18} color={colors.textFaint} />}
            />
            {signupErrors.password ? <Text style={styles.fieldError}>{signupErrors.password}</Text> : null}
            {!signupErrors.password && password.length > 0 && (
              (password.length >= 8 && /\d/.test(password))
                ? <Text style={[styles.referralHint, { color: colors.success }]}>✓ Password looks good</Text>
                : <Text style={[styles.referralHint, { color: colors.danger }]}>Use at least 8 characters including 1 number</Text>
            )}
            <InputField
              placeholder="Referral code (optional)"
              value={referralCode}
              onChange={(v: string) => setReferralCode(v.replace(/\s/g, '').toUpperCase())}
              icon={<Gift size={18} color={colors.textFaint} />}
              autoCapitalize="characters"
            />
            {referralStatus === 'loading' && (
              <Text style={styles.referralHint}>Checking code...</Text>
            )}
            {referralStatus === 'valid' && (
              <Text style={[styles.referralHint, { color: colors.success }]}>
                ✓ Referred by {referralValidName} — you'll both get 1,000 KarmaCoins XP!
              </Text>
            )}
            {referralStatus === 'invalid' && (
              <Text style={[styles.referralHint, { color: colors.danger }]}>Invalid referral code</Text>
            )}
            {signupErrors.general ? <Text style={styles.fieldError}>{signupErrors.general}</Text> : null}

            <View style={styles.termsRow}>
              <TouchableOpacity
                style={[styles.checkbox, agreedToTerms && styles.checkboxOn]}
                onPress={() => setAgreedToTerms(v => !v)}
                activeOpacity={0.7}
              >
                {agreedToTerms && <Check size={14} color="#fff" strokeWidth={3} />}
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal', { type: 'terms' })}>Terms & Conditions</Text>
                {', '}
                <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal', { type: 'terms-of-use' })}>Terms of Use</Text>
                {' '}and{' '}
                <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>Privacy Policy</Text>
              </Text>
            </View>

            <PrimaryButton onPress={handleSignupSubmit} disabled={!(password.length >= 8 && /\d/.test(password)) || !name || !email || !phone || !agreedToTerms || isLoading} loading={isLoading}>
              <Text style={styles.buttonText}>Sign up</Text>
              <ArrowRight size={18} color="#fff" />
            </PrimaryButton>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('entry')}>
              <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Already have an account? Login</Text>
            </TouchableOpacity>
          </ScrollView>
      );
    }

    if (step === 'verify_signup_otp') {
      return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.otpContainer}>
            <SignupJourneyProgress stage={0} />
            <View style={styles.otpIconBg}>
              <Lock size={28} color={colors.primary} />
            </View>
            <Text style={styles.otpTitle}>Verify your mobile number</Text>
            <Text style={styles.otpSubtitle}>We've sent a 6-digit OTP to</Text>
            <Text style={styles.otpEmail}>+91 {phone}</Text>

            <View style={styles.otpBoxRow}>
              {signupOtp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => { otpRefs.current[i] = ref; }}
                  style={[styles.otpBox, digit ? styles.otpBoxFilled : {}]}
                  value={digit}
                  onChangeText={(t) => handleOtpChange(t, i)}
                  onKeyPress={(e) => handleOtpKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  autoFocus={i === 0}
                  selectionColor="#15803d"
                />
              ))}
            </View>

            <PrimaryButton
              onPress={handleVerifySignupOtp}
              disabled={signupOtp.join('').length < 6}
              loading={isLoading}
              style={{ width: '100%' }}
            >
              <Text style={styles.buttonText}>Verify & create account</Text>
            </PrimaryButton>

            <TouchableOpacity
              style={styles.otpResendBtn}
              disabled={resendTimer > 0}
              onPress={async () => {
                if (resendTimer > 0) return;
                try {
                  setIsLoading(true);
                  const res = await authService.sendOtp(phone.trim(), 'registration');
                  setResendTimer(res?.data?.retryAfter || 60);
                  setSignupOtp(['', '', '', '', '', '']);
                } catch (error: any) {
                  showAlert('Failed', error?.response?.data?.message || 'Could not resend OTP.');
                } finally { setIsLoading(false); }
              }}
            >
              <Text style={[styles.otpResendText, resendTimer > 0 && { color: colors.textFaint }]}>
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Didn't receive? Resend OTP"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('signup')} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>← Back to signup</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (step === 'welcome_celebration') {
      const foilOpacity = scratchFoilAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
      const foilScale = scratchFoilAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
      const revealScale = scratchRevealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

      return (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
          {scratched && <LaunchConfetti />}

          <SignupJourneyProgress stage={1} />

          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.primaryDeep, textAlign: 'center', marginBottom: 8 }}>
            🎉 Congratulations!{'\n'}You're officially a KarmaVerse Early Bird.
          </Text>
          <Text style={{ fontSize: 15, color: colors.primary, fontWeight: '600', textAlign: 'center', marginBottom: 32 }}>
            {scratched
              ? `✅ ${EARLY_BIRD_COINS.toLocaleString()} Karma Coins Successfully Added!`
              : `As a welcome reward, you've earned ${EARLY_BIRD_COINS.toLocaleString()} Karma Coins. Scratch your reward card to reveal and claim your bonus.`}
          </Text>

          <View style={{ width: '100%', maxWidth: 300, aspectRatio: 1.4, borderRadius: 24, overflow: 'hidden', marginBottom: 28, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 }}>
            {/* Revealed content, underneath the foil */}
            <LinearGradient colors={['#052e16', '#166534', '#15803d']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={{ alignItems: 'center', opacity: scratchRevealAnim, transform: [{ scale: revealScale }] }}>
                <KarmaCoin size={48} glow />
                <Text style={{ fontSize: 30, fontWeight: '900', color: 'white', marginTop: 10 }}>+{EARLY_BIRD_COINS.toLocaleString()}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#86efac' }}>KarmaCoins XP</Text>
              </Animated.View>
            </LinearGradient>

            {/* Foil cover — tap to scratch */}
            {!scratched ? (
              <View {...scratchPan.panHandlers} style={StyleSheet.absoluteFill}>
                <LinearGradient colors={['#fde68a', '#fbbf24', '#d97706']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 36 }}>🎁</Text>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#78350f' }}>Scratch to reveal</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400e' }}>Swipe across the card</Text>
                </LinearGradient>
              </View>
            ) : (
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: foilOpacity, transform: [{ scale: foilScale }], pointerEvents: 'none' }]}>
                <LinearGradient colors={['#fde68a', '#fbbf24', '#d97706']} style={{ flex: 1 }} />
              </Animated.View>
            )}
          </View>

          {scratched && (
            <TouchableOpacity
              style={{ backgroundColor: '#15803d', width: '100%', maxWidth: 300, paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
              onPress={continueFromWelcomeCelebration}
              activeOpacity={0.85}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>Continue</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      );
    }

    if (step === 'referral_bonus') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
          <SignupJourneyProgress stage={2} />

          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: colors.border }}>
            <KarmaCoin size={56} glow animated />
          </View>

          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.primaryDeep, textAlign: 'center', marginBottom: 8 }}>
            Welcome gift unlocked!
          </Text>
          <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '700', textAlign: 'center', marginBottom: 4 }}>
            +1,000 KarmaCoins XP added to your wallet
          </Text>
          {referralValidName ? (
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
              You and {referralValidName} both received 1,000 KarmaCoins XP for joining together.
            </Text>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: '500', textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
              You've both been rewarded with 1,000 KarmaCoins XP each.
            </Text>
          )}

          <View style={{ width: '100%', backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 32, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <KarmaCoin size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Your starting balance</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }}>1,000 coins waiting in your wallet</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>♻️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Schedule your first pickup</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500' }}>Make an impact & earn even more coins</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={{ backgroundColor: '#15803d', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
            onPress={() => setStep('demographics')}
            activeOpacity={0.85}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>Continue to setup profile</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'demographics') {
      // age + state + city are required on this onboarding PATCH (backend requires
      // state/city here, not at account creation); gender/orientation/marital/employment
      // stay optional. A recycling signup must never be blocked on sexual orientation.
      const isComplete = !!age && !!stateName.trim() && !!city.trim();

      return (
        <ScrollView style={{flex: 1, marginHorizontal: 0}} contentContainerStyle={[styles.scrollStepContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <SignupJourneyProgress stage={2} />
          <View style={styles.demoHeader}>
            <Text style={styles.demoTitle}>Personalize profile</Text>
            <Text style={styles.demoSubtitle}>Help us tailor the best eco-rewards directly for you.</Text>
          </View>

          <View style={styles.formCard}>

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <CalendarDays size={18} color={colors.text} />
                <Text style={styles.fieldLabel}>Your age</Text>
              </View>
              <InputField
                placeholder="e.g. 25"
                value={age}
                onChange={setAge}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <User size={18} color={colors.text} />
                <Text style={styles.fieldLabel}>Identity (gender)</Text>
              </View>
              <SelectionPills
                options={['Male', 'Female', 'Other']}
                selected={gender}
                onSelect={setGender}
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <Heart size={18} color={colors.text} />
                <Text style={styles.fieldLabel}>Sexual orientation</Text>
              </View>
              <SelectionPills
                options={['Straight', 'Lesbian', 'Gay', 'Others']}
                selected={sexualOrientation}
                onSelect={setSexualOrientation}
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <Heart size={18} color={colors.text} />
                <Text style={styles.fieldLabel}>Marital status</Text>
              </View>
              <SelectionPills 
                options={['Single', 'Married']} 
                selected={maritalStatus} 
                onSelect={setMaritalStatus} 
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <Briefcase size={18} color={colors.text} />
                <Text style={styles.fieldLabel}>Employment</Text>
              </View>
              <SelectionPills
                options={['Student', 'Employed', 'Business', 'Unemployed']}
                selected={employment}
                onSelect={setEmployment}
              />
            </View>

            <View style={styles.fieldDivider} />

            <StateCityFields state={stateName} city={city} setState={setStateName} setCity={setCity} />

          </View>

          <PrimaryButton
            onPress={handleCompleteRegistration}
            disabled={!isComplete}
            loading={isLoading}
            style={{marginTop: 8}}
          >
            <Text style={styles.buttonText}>Complete registration</Text>
            <CheckCircle2 size={20} color="#fff" />
          </PrimaryButton>
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 12 }} onPress={() => { reconnect(); navigation.replace('App', { screen: 'Dashboard', params: { justClaimedWelcomeBonus: true } }); }}>
            <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 14 }}>Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.rootContainer, { backgroundColor: isDark ? colors.bg : ((step === 'demographics' || step === 'referral_bonus' || step === 'welcome_celebration') ? '#f0fdf4' : '#ffffff') }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <StatusBarFiller color="#064e3b" />

      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
          {/* Decorative shapes so the header reads as a designed panel, not a flat block */}
          <View style={[styles.headerCircle, { top: -50, right: -40, width: 160, height: 160, opacity: 0.08 }]} />
          <View style={[styles.headerCircle, { bottom: -60, left: -50, width: 140, height: 140, opacity: 0.06 }]} />
          {/* Crisp vector lockup (icon + real text) instead of a flat raster —
              the baked-in tagline in logo-nav.png went blurry at header size.
              Text renders sharp at every screen density. */}
          <View style={styles.logoCard}>
            <Image source={require('../../assets/logo-icon.webp')} style={styles.logoIconImg} resizeMode="contain" />
            <View>
              <Text style={styles.logoWordText}>
                <Text style={{ color: '#ffffff' }}>Karma</Text>
                <Text style={{ color: '#4ade80' }}>Ver$e</Text>
              </Text>
              <Text style={styles.logoTagline}>
                <Text style={{ color: '#86efac' }}>EARN</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)' }}>  •  </Text>
                <Text style={{ color: '#86efac' }}>IMPACT</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)' }}>  •  </Text>
                <Text style={{ color: '#fbbf24' }}>ELEVATE</Text>
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.body, (step === 'demographics' || step === 'referral_bonus' || step === 'welcome_celebration') && { paddingHorizontal: 0, paddingBottom: 0 }]}>
          {renderStep()}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  rootContainer: { flex: 1, backgroundColor: '#064e3b' },
  journeyProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  journeyStage: { fontSize: 11, fontWeight: '700', color: c.textFaint },
  journeyStageActive: { color: c.primary },
  journeyArrow: { fontSize: 11, fontWeight: '700', color: c.borderStrong },
  offlineBanner: { backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.danger, borderRadius: 12, padding: 12, marginBottom: 8 },
  offlineBannerText: { color: c.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  fieldError: { color: c.danger, fontSize: 12, fontWeight: '600', marginTop: -16, paddingLeft: 4 },
  referralHint: { fontSize: 12, fontWeight: '600', marginTop: -16, paddingLeft: 4, color: c.textMuted },
  container: { flex: 1, backgroundColor: c.bg, maxWidth: 900, width: '100%', alignSelf: 'center' },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerCircle: { position: 'absolute', borderRadius: 999, backgroundColor: 'white' },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 12, letterSpacing: 0.5 },
  // Matched 1:1 to the home-page navbar lockup so the login logo reads identically
  // crisp (same icon crop + real text, same sizes).
  logoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoIconImg: { width: 70, height: 73 },
  logoWordText: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32 },
  logoTagline: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9, marginTop: 3 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  termsText: { flex: 1, fontSize: 13, color: c.textMuted, lineHeight: 19, fontWeight: '500' },
  termsLink: { color: c.primary, fontWeight: '800' },
  
  // 460 keeps the form a comfortable centred column on desktop — at 800 the
  // input/button stretched the full width and the page read as sparse. Mobile
  // (< 460) is unaffected.
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24, width: '100%', maxWidth: 460, alignSelf: 'center' },

  stepContent: { gap: 14 },
  scrollStepContent: { paddingHorizontal: 24, paddingBottom: 50, gap: 16 },
  
  title: { fontSize: 24, fontWeight: '900', color: c.text },
  subtitle: { fontSize: 13, color: c.textMuted, marginTop: 6, lineHeight: 20, fontWeight: '500' },
  successTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  successTagText: { fontSize: 12, color: c.success, fontWeight: '800' },

  inputContainer: { position: 'relative', justifyContent: 'center' },
  iconWrapper: { position: 'absolute', left: 16, zIndex: 1 },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: c.inputBg,
    borderWidth: 1.5,
    borderColor: c.border,
    paddingHorizontal: 16,
    fontSize: 15,
    color: c.text,
    fontWeight: '700'
  },
  
  button: {
    height: 60,
    backgroundColor: '#16a34a',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: { marginHorizontal: 16, color: c.textFaint, fontSize: 13, fontWeight: '700' },

  // Full-width "Continue with Google" button (native) / mount point (web, where
  // Google's own GIS button renders itself inside this container).
  googleFullBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  googleFullBtnText: { color: c.text, fontWeight: '700', fontSize: 15 },
  googleFullBtnMount: { width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  // Web: our own button renders immediately (so the slot is never blank while GIS
  // loads); Google's real button is layered exactly on top, fully transparent, so
  // clicks land on the genuine iframe (required for the OAuth popup to be trusted).
  googleFullBtnWrap: { width: '100%', height: 56, position: 'relative' },
  googleOverlayMount: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.01, overflow: 'hidden', zIndex: 2,
    alignItems: 'center', justifyContent: 'center',
  },

  // Zomato/Swiggy-style brand tiles (Google / Facebook / Apple) under "or continue with"
  socialIconWrap: { width: 88, height: 56, position: 'relative' },
  socialIconBtn: {
    width: 88, height: 56, borderRadius: 14,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: c.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
  },

  // Full-width "Continue with Facebook" button — native uses react-native-fbsdk-next,
  // web uses the Facebook JS SDK (both routed through handleFacebookSignIn{Native,Web}).
  facebookFullBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1877F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  facebookFullBtnDisabled: { opacity: 0.7 },
  facebookFullBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  socialRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: 4 },
  socialConsentText: { fontSize: 12, color: c.textMuted, lineHeight: 18, textAlign: 'center', marginTop: 20, paddingHorizontal: 8 },
  socialIconBtnZomato: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  // Demographics Premium UI Redesign
  demoHeader: { alignItems: 'center', marginBottom: 12, marginTop: 10 },
  demoTitle: { fontSize: 28, fontWeight: '900', color: c.text, textAlign: 'center' },
  demoSubtitle: { fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 20, lineHeight: 20 },

  formCard: {
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: 20
  },

  fieldSection: { marginVertical: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  fieldLabel: { fontSize: 15, fontWeight: '900', color: c.text },
  fieldDivider: { height: 1, backgroundColor: c.border, marginVertical: 16 },

  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1.5,
    borderColor: c.border
  },
  pillActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  pillText: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  pillTextActive: { color: 'white', fontWeight: '800' },
  readonlyEmailBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
  readonlyEmailText: { flex: 1, fontSize: 15, color: c.textMuted, fontWeight: '500' },

  // OTP Verification
  otpContainer: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  otpIconBg: { width: 64, height: 64, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: '#86efac' },
  otpTitle: { fontSize: 24, fontWeight: '900', color: c.text, marginBottom: 8, textAlign: 'center' },
  otpSubtitle: { fontSize: 14, color: c.textMuted, fontWeight: '500', textAlign: 'center' },
  otpEmail: { fontSize: 15, color: c.primary, fontWeight: '800', marginBottom: 28, textAlign: 'center' },
  // Boxes flex down on narrow phones (6 fixed 48px boxes + gaps need ~390px,
  // small screens are 320-360) — maxWidth keeps them at 48px on wide screens.
  otpBoxRow: { flexDirection: 'row', gap: 8, marginBottom: 28, justifyContent: 'center', width: '100%', maxWidth: 360, alignSelf: 'center' },
  otpBox: { flex: 1, minWidth: 0, maxWidth: 48, height: 56, borderRadius: 14, borderWidth: 2, borderColor: c.border, backgroundColor: c.inputBg, textAlign: 'center', fontSize: 22, fontWeight: '900', color: c.text },
  otpBoxFilled: { borderColor: '#15803d', backgroundColor: c.primarySoft },
  otpResendBtn: { marginTop: 16 },
  otpResendText: { color: c.primary, fontWeight: '700', fontSize: 14 },
}));
