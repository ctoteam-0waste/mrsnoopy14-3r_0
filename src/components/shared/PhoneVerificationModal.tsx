import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Phone, ShieldCheck, X } from 'lucide-react-native';
import { authService } from '../../services/auth';
import { profileService } from '../../services/profile';
import { showAlert } from '../../utils/alert';
import { useTheme, makeStyles } from '../../theme';

// Reuses the existing send-otp -> verify-otp -> change-phone flow so OAuth users
// (Google/Facebook) who never verified a phone can do it inline before booking.
// On success `isPhoneVerified` is true server-side and onVerified() fires so the
// caller can retry whatever was blocked.
export function PhoneVerificationModal({
  visible,
  onClose,
  onVerified,
  initialPhone = '',
  reason = 'Please verify a phone number to continue booking your pickup.',
}: {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
  initialPhone?: string;
  reason?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  // True once the user has dismissed the modal — used to swallow the result of an
  // in-flight OTP verify so a request that resolves AFTER close (e.g. they hit X
  // while it was verifying) can't pop a stray "Verification failed" alert.
  const dismissedRef = useRef(false);
  useEffect(() => { if (visible) dismissedRef.current = false; }, [visible]);

  const reset = () => {
    setStep('phone');
    setPhone(initialPhone);
    setOtp('');
    setLoading(false);
  };

  const close = () => {
    dismissedRef.current = true;
    reset();
    onClose();
  };

  const sendOtp = async () => {
    if (phone.trim().length !== 10) {
      showAlert('Invalid number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      await authService.sendOtp(phone.trim(), 'change-phone');
      if (dismissedRef.current) return;
      setOtp('');
      setStep('otp');
    } catch (error: any) {
      if (dismissedRef.current) return;
      showAlert('Could not send OTP', error?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndSave = async () => {
    if (otp.trim().length !== 6) {
      showAlert('Invalid OTP', 'Please enter the 6-digit code sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      const verifyRes = await authService.verifyOtp(phone.trim(), otp.trim(), 'change-phone');
      const otpToken = verifyRes?.data?.otpToken;
      if (!otpToken) throw new Error('Verification failed. Please try again.');
      await profileService.changePhone(phone.trim(), otpToken);
      if (dismissedRef.current) return; // user closed while verifying — stay silent
      reset();
      onVerified();
    } catch (error: any) {
      if (dismissedRef.current) return; // closed mid-flight — don't pop a stray alert
      showAlert('Verification failed', error?.response?.data?.message || error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.closeBtn} onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.textFaint} />
            </TouchableOpacity>

            <View style={styles.iconWrap}>
              <ShieldCheck size={28} color="#16a34a" />
            </View>
            <Text style={styles.title}>Verify your phone number</Text>
            <Text style={styles.sub}>
              {step === 'phone'
                ? reason
                : `Enter the 6-digit code sent to +91 ${phone}.`}
            </Text>

            {step === 'phone' ? (
              <>
                <View style={styles.inputRow}>
                  <Phone size={18} color={colors.textFaint} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="number-pad"
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ''))}
                    maxLength={10}
                    autoFocus
                  />
                </View>
                <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={sendOtp} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send OTP</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="------"
                    placeholderTextColor={colors.borderStrong}
                    keyboardType="number-pad"
                    value={otp}
                    onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ''))}
                    maxLength={6}
                    autoFocus
                  />
                </View>
                <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={verifyAndSave} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & continue</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('phone')} disabled={loading} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  overlay: { flex: 1, backgroundColor: c.overlay },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: c.surface, borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, alignSelf: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  iconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 19, fontWeight: '800', color: c.text, marginBottom: 8 },
  sub: { fontSize: 14, color: c.textMuted, lineHeight: 20, marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 52, marginBottom: 16 },
  input: { flex: 1, fontSize: 15, color: c.text, fontWeight: '600' },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 20 },
  primaryBtn: { height: 52, borderRadius: 14, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  linkBtn: { alignItems: 'center', marginTop: 14 },
  linkText: { color: '#16a34a', fontSize: 14, fontWeight: '700' },
}));
