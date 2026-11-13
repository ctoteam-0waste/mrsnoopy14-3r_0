import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Phone } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { profileService } from '../../services/profile';
import { useTheme, makeStyles } from '../../theme';
import { OTP_AUTOFILL } from '../../utils/otpBoxes';

// Phone number -> OTP -> save, for a signed-in user (send-otp and verify-otp with
// purpose 'change-phone', then PUT /users/change-phone). Errors show inline, never
// as a pop-up, so it works inside a modal on iOS too. onVerified fires once the
// number is saved (the backend has then set isPhoneVerified, and credited any
// pending referral).
export function PhoneVerifyForm({ onVerified, initialPhone = '' }: {
  onVerified: () => void | Promise<void>;
  initialPhone?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const validPhone = /^[6-9]\d{9}$/.test(phone);
  const phoneError = phone.length === 10 && !validPhone ? 'Enter a valid mobile number starting with 6, 7, 8 or 9' : '';

  const sendOtp = async () => {
    if (!validPhone || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await authService.sendOtp(phone, 'change-phone');
      if (!mounted.current) return;
      setOtp('');
      setStep('otp');
      setResendIn(res?.data?.retryAfter || 60);
    } catch (e: any) {
      if (!mounted.current) return;
      setError(!e?.response ? 'No internet connection. Please try again.' : (e.response.data?.message || 'Could not send the OTP. Please try again.'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const verify = async () => {
    if (otp.length !== 6 || loading) return;
    setLoading(true);
    setError('');
    let otpToken = '';
    try {
      const res = await authService.verifyOtp(phone, otp, 'change-phone');
      otpToken = res?.data?.otpToken || '';
      if (!otpToken) throw new Error('no token');
    } catch (e: any) {
      if (!mounted.current) return;
      setLoading(false);
      setError(!e?.response && e?.message !== 'no token' ? 'No internet connection. Please try again.' : 'Incorrect OTP. Check the code or resend it.');
      return;
    }
    try {
      await profileService.changePhone(phone, otpToken);
      if (!mounted.current) return;
      await onVerified();
    } catch (e: any) {
      if (!mounted.current) return;
      const msg = String(e?.response?.data?.message || '');
      if (/already/i.test(msg)) {
        setStep('phone');
        setError('This number is already linked to another account. Please use a different number.');
      } else if (/token|expire|otp/i.test(msg)) {
        setStep('phone');
        setError('Your OTP has expired. Please request a new one.');
      } else {
        setError(!e?.response ? 'No internet connection. Please try again.' : (msg || 'Could not save your number. Please try again.'));
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <View>
        <View style={[styles.inputRow, (!!phoneError || !!error) && styles.inputRowError]}>
          <Phone size={18} color={colors.textFaint} style={{ marginRight: 10 }} />
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            value={phone}
            onChangeText={(v) => { setPhone(v.replace(/[^0-9]/g, '').slice(0, 10)); setError(''); }}
            maxLength={10}
            autoFocus
          />
        </View>
        {!!(phoneError || error) && <Text style={styles.error}>{phoneError || error}</Text>}
        <TouchableOpacity style={[styles.primaryBtn, (!validPhone || loading) && styles.btnDisabled]} onPress={sendOtp} disabled={!validPhone || loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send OTP</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sentTo}>Enter the 6-digit code sent to +91 {phone}</Text>
      <View style={[styles.inputRow, !!error && styles.inputRowError]}>
        <TextInput
          style={[styles.input, styles.otpInput]}
          placeholder="------"
          placeholderTextColor={colors.borderStrong}
          keyboardType="number-pad"
          {...OTP_AUTOFILL}
          value={otp}
          onChangeText={(v) => { setOtp(v.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
          maxLength={6}
          autoFocus
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={[styles.primaryBtn, (otp.length !== 6 || loading) && styles.btnDisabled]} onPress={verify} disabled={otp.length !== 6 || loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & continue</Text>}
      </TouchableOpacity>
      <View style={styles.linkRow}>
        <TouchableOpacity onPress={() => { setStep('phone'); setError(''); }} disabled={loading}>
          <Text style={styles.linkText}>Change number</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={sendOtp} disabled={loading || resendIn > 0}>
          <Text style={[styles.linkText, resendIn > 0 && { color: colors.textFaint }]}>
            {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 52, marginBottom: 8 },
  inputRowError: { borderColor: c.danger },
  prefix: { fontSize: 15, color: c.textMuted, fontWeight: '700', marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: c.text, fontWeight: '600' },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 20 },
  sentTo: { fontSize: 14, color: c.textMuted, lineHeight: 20, marginBottom: 12 },
  error: { fontSize: 12.5, color: c.danger, fontWeight: '600', marginBottom: 8, lineHeight: 18 },
  primaryBtn: { height: 52, borderRadius: 14, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  linkText: { color: '#16a34a', fontSize: 14, fontWeight: '700' },
}));
