import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { ArrowRight, Lock, User, CheckCircle2, CalendarDays, Heart, Briefcase, Eye, EyeOff } from 'lucide-react-native';
import { authService } from '../services/auth';
import { profileService } from '../services/profile';
import { useUserSocket } from '../context/UserSocketContext';
let GoogleSignin: any = null;
let isErrorWithCode: any = null;
let statusCodes: any = {};
try {
  const gs = require('@react-native-google-signin/google-signin');
  GoogleSignin = gs.GoogleSignin;
  isErrorWithCode = gs.isErrorWithCode;
  statusCodes = gs.statusCodes;
} catch (_) {}

type Step = 'entry' | 'checking' | 'login' | 'signup' | 'verify_signup_otp' | 'demographics' | 'reset_password';

// Reusable Components
function InputField({ placeholder, value, onChange, secureTextEntry = false, icon, autoFocus = false, keyboardType = 'default', maxLength, showToggle = false, onSubmitEditing, returnKeyType }: any) {
  const [hidden, setHidden] = useState(secureTextEntry);
  return (
    <View style={styles.inputContainer}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <TextInput
        style={[styles.input, icon ? { paddingLeft: 48 } : {}, showToggle ? { paddingRight: 48 } : {}]}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChange}
        secureTextEntry={hidden}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
      />
      {showToggle && (
        <TouchableOpacity style={{ position: 'absolute', right: 16, zIndex: 1 }} onPress={() => setHidden((h: boolean) => !h)} activeOpacity={0.7}>
          {hidden ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
        </TouchableOpacity>
      )}
    </View>
  );
}

function PrimaryButton({ onPress, disabled, loading, children, style }: any) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled || loading ? styles.buttonDisabled : undefined, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color="#fff" /> : children}
    </TouchableOpacity>
  );
}

function SelectionPills({ options, selected, onSelect }: { options: string[], selected: string, onSelect: (v: string) => void }) {
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

export function LoginScreen({ navigation }: any) {
  const { reconnect } = useUserSocket();
  const [step, setStep] = useState<Step>('entry');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [signupOtp, setSignupOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<Array<any>>([]);
  const [resetSubStep, setResetSubStep] = useState<'send_otp' | 'verify_otp' | 'new_password'>('send_otp');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [signupErrors, setSignupErrors] = useState<{ name?: string; phone?: string; password?: string; general?: string }>({});

  // Demographics State
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [employment, setEmployment] = useState('');

  // BUG-002: Check connectivity immediately when signup step opens
  React.useEffect(() => {
    if (step === 'signup' || step === 'login') {
      fetch('https://karmacoin-backend-8.onrender.com/', { method: 'HEAD' })
        .then(() => setIsOffline(false))
        .catch(() => setIsOffline(true));
    } else {
      setIsOffline(false);
    }
  }, [step]);

  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      Alert.alert('Not available', 'Google Sign-In requires a native build. Use APK to test.');
      return;
    }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('No ID token received from Google');
      setIsLoading(true);
      await authService.googleLogin(idToken);
      reconnect();
      navigation.replace('App');
    } catch (error: any) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert('Not available', 'Google Play Services not available on this device.');
          return;
        }
      }
      Alert.alert('Google sign-in failed', error?.response?.data?.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!identifier.trim()) {
      setEmailError('Please enter your email address.');
      return;
    }

    if (identifier.trim().length > 254) {
      setEmailError('Email address cannot exceed 254 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError('');

    setStep('checking');
    try {
      const res = await authService.checkUser(identifier.trim());
      
      if (res?.data?.isRegistered) {
        setStep('login');
      } else {
        setEmail(identifier.trim());
        setStep('signup');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to check account.');
      setStep('entry');
    }
  };

  const handleSignupSubmit = async () => {
    const errs: { name?: string; phone?: string; password?: string; general?: string } = {};
    if (!name.trim() || !email.trim() || !phone.trim() || !password) return;
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) errs.name = 'Full name should contain only letters.';
    if (!/^\d{10}$/.test(phone.trim())) errs.phone = 'Please enter a valid 10-digit phone number.';
    if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (Object.keys(errs).length > 0) { setSignupErrors(errs); return; }
    setSignupErrors({});

    setIsLoading(true);
    try {
      await authService.sendSignupOtp(email);
      setSignupOtp(['', '', '', '', '', '']);
      setStep('verify_signup_otp');
    } catch (error: any) {
      const isNetworkError = !error?.response;
      setSignupErrors({
        general: isNetworkError
          ? 'No internet connection. Please check your network and try again.'
          : (error?.response?.data?.message || 'Could not send OTP. Please try again.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignupOtp = async () => {
    const otp = signupOtp.join('');
    if (otp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP sent to your email.');
      return;
    }
    setIsLoading(true);
    try {
      await authService.verifySignupOtp(email, otp);
      await authService.register({ name, email, phone, password });
      try {
        await authService.login(email, password);
        setStep('demographics');
      } catch (_) {
        Alert.alert(
          'Account created!',
          'Your account was created successfully. Please login with your credentials.',
          [{ text: 'Login', onPress: () => setStep('login') }]
        );
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      Alert.alert('Verification failed', msg || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      reconnect();
      navigation.replace('App');
    } catch (error: any) {
      const isNetworkError = !error?.response;
      Alert.alert(
        isNetworkError ? 'No Internet Connection' : 'Login Failed',
        isNetworkError
          ? 'Please check your network connection and try again.'
          : (error?.response?.data?.message || 'Invalid email or password.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 5 || ageNum > 100) {
      Alert.alert('Invalid age', 'Please enter a valid age between 5 and 100.');
      return;
    }
    setIsLoading(true);
    try {
      await profileService.updateDemographics({ age: ageNum, gender, maritalStatus, employment });
      reconnect();
      navigation.replace('App');
    } catch (error: any) {
      const isNetworkError = !error?.response;
      Alert.alert(
        isNetworkError ? 'No Internet Connection' : 'Failed to Save',
        isNetworkError
          ? 'Could not save your details. Please check your connection.'
          : 'Failed to save profile details. Please try again.',
        [
          { text: 'Retry', onPress: handleCompleteRegistration },
          { text: 'Skip', style: 'cancel', onPress: () => { reconnect(); navigation.replace('App'); } }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid password', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'New password and confirm password must be the same.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authService.resetPassword(identifier.trim(), newPassword);
      if (res.success) {
        Alert.alert("Success", "Password reset successfully! You can now log in.");
        setPassword('');
        setNewPassword('');
        setStep('login');
      }
    } catch (error: any) {
      Alert.alert("Reset failed", error?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 'entry') {
      return (
        <View style={styles.stepContent}>
          <View>
            <Text style={styles.title}>Welcome 👋</Text>
            <Text style={styles.subtitle}>Enter your email address to get started</Text>
          </View>
          <InputField
            key="entry-email"
            placeholder="Email address"
            value={identifier}
            onChange={(t: string) => { setIdentifier(t); if (emailError) setEmailError(''); }}
            icon={<User size={18} color="#94a3b8" />}
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

          {/* Social Login Separator */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons Row */}
          <View style={styles.socialRow}>
            {/* Google */}
            <TouchableOpacity
              style={styles.socialIconBtnZomato}
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
            >
              <Svg width="26" height="26" viewBox="0 0 48 48">
                <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </Svg>
            </TouchableOpacity>

            {/* Apple */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.socialIconBtnZomato}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Coming soon', 'Apple login coming soon!')}
              >
                <Svg width="30" height="30" viewBox="0 0 384 512">
                  <Path fill="#000" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </Svg>
              </TouchableOpacity>
            )}

            {/* Facebook */}
            <TouchableOpacity
              style={styles.socialIconBtnZomato}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Coming soon', 'Facebook login coming soon!')}
            >
              <Svg width="26" height="26" viewBox="0 0 24 24">
                <Path fill="#1877F2" d="M24 12.073C24 5.449 18.627 0 12 0S0 5.449 0 12.073c0 5.986 4.388 10.942 10.125 11.905v-8.428H7.078v-3.477h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.477h-2.796v8.428C19.612 23.015 24 18.059 24 12.073z" />
                <Path fill="#FFF" d="M16.671 15.55l.532-3.477h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.514V5.006s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.477h3.047v8.428a12.04 12.04 0 003.75 0v-8.428h2.796z" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    if (step === 'checking') {
      return (
        <View style={[styles.stepContent, { alignItems: 'center', justifyContent: 'center', marginTop: 40 }]}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>Checking your account...</Text>
        </View>
    
      );
    }

    if (step === 'login') {
      return (
        <View style={styles.stepContent}>
          <View>
            <Text style={styles.title}>Welcome back 👋</Text>
            <Text style={styles.subtitle}>Account found. Enter your password to continue.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, borderWidth: 1, borderColor: '#bbf7d0' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <Text style={{ color: '#15803d', fontSize: 13, fontWeight: '700', flex: 1 }}>{identifier}</Text>
            </View>
          </View>
          <InputField
            placeholder="Password"
            value={password}
            onChange={setPassword}
            secureTextEntry
            showToggle
            icon={<Lock size={18} color="#94a3b8" />}
            autoFocus
          />
          <PrimaryButton onPress={handleLoginSubmit} disabled={!password || isLoading} loading={isLoading}>
            <Text style={styles.buttonText}>Login</Text>
            <ArrowRight size={18} color="#fff" />
          </PrimaryButton>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <TouchableOpacity onPress={() => { setStep('entry'); setIdentifier(''); }}>
               <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Change account</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setResetSubStep('send_otp'); setOtpValue(''); setNewPassword(''); setConfirmPassword(''); setStep('reset_password'); }}>
               <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>Forgot password?</Text>
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
              <Text style={styles.subtitle}>We'll send an OTP to verify your identity</Text>
            </View>
            {/* Read-only email display */}
            <View style={styles.readonlyEmailBox}>
              <Lock size={16} color="#64748b" />
              <Text style={styles.readonlyEmailText} numberOfLines={1}>{identifier}</Text>
            </View>
            <PrimaryButton onPress={async () => {
              setIsLoading(true);
              try {
                await authService.sendForgotPasswordOtp(identifier.trim());
                setResetSubStep('verify_otp');
              } catch (error: any) {
                const msg = error?.response?.data?.message;
                Alert.alert('Could not send OTP', msg || 'Please try again.');
              } finally {
                setIsLoading(false);
              }
            }} loading={isLoading}>
              <Text style={styles.buttonText}>Send OTP</Text>
              <ArrowRight size={18} color="#fff" />
            </PrimaryButton>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('login')}>
              <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Back to login</Text>
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
              <Text style={styles.subtitle}>OTP sent to {identifier}</Text>
            </View>
            <InputField
              placeholder="Enter 6-digit OTP"
              value={otpValue}
              onChange={(v: string) => setOtpValue(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              icon={<CheckCircle2 size={18} color="#94a3b8" />}
              autoFocus
            />
            <PrimaryButton onPress={async () => {
              if (otpValue.length < 6) {
                Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP sent to your email.');
                return;
              }
              setIsLoading(true);
              try {
                await authService.verifyForgotPasswordOtp(identifier.trim(), otpValue);
                setResetSubStep('new_password');
              } catch (error: any) {
                const msg = error?.response?.data?.message;
                Alert.alert('Verification failed', msg || 'Invalid or expired OTP. Please try again.');
              } finally {
                setIsLoading(false);
              }
            }} disabled={otpValue.length < 6} loading={isLoading}>
              <Text style={styles.buttonText}>Verify OTP</Text>
              <ArrowRight size={18} color="#fff" />
            </PrimaryButton>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setResetSubStep('send_otp')}>
              <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>Resend OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 8 }} onPress={() => setStep('login')}>
              <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Back to login</Text>
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
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={setNewPassword}
              secureTextEntry
              showToggle
              icon={<Lock size={18} color="#94a3b8" />}
              autoFocus
            />
            <InputField
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              secureTextEntry
              showToggle
              icon={<Lock size={18} color="#94a3b8" />}
            />
            <PrimaryButton onPress={handleResetPassword} disabled={!newPassword || !confirmPassword || isLoading} loading={isLoading}>
              <Text style={styles.buttonText}>Reset password</Text>
              <CheckCircle2 size={18} color="#fff" />
            </PrimaryButton>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('login')}>
              <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Back to login</Text>
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
            <View>
              <Text style={styles.title}>Create your account 🌱</Text>
              <Text style={styles.subtitle}>Join us and earn Karma Coins!</Text>
            </View>
            <InputField
              placeholder="Email address"
              value={email}
              onChange={setEmail}
              keyboardType="email-address"
              icon={<User size={18} color="#94a3b8" />}
            />
            <InputField
              placeholder="Full name"
              value={name}
              onChange={(v: string) => { setName(v.replace(/[^a-zA-Z\s]/g, '')); setSignupErrors(e => ({ ...e, name: undefined })); }}
              icon={<User size={18} color="#94a3b8" />}
            />
            {signupErrors.name ? <Text style={styles.fieldError}>{signupErrors.name}</Text> : null}
            <InputField
              placeholder="Phone number (10 digits)"
              value={phone}
              onChange={(v: string) => { setPhone(v.replace(/[^0-9]/g, '')); setSignupErrors(e => ({ ...e, phone: undefined })); }}
              keyboardType="number-pad"
              maxLength={10}
              icon={<User size={18} color="#94a3b8" />}
            />
            {signupErrors.phone ? <Text style={styles.fieldError}>{signupErrors.phone}</Text> : null}
            <InputField
              placeholder="Create password"
              value={password}
              onChange={(v: string) => { setPassword(v); setSignupErrors(e => ({ ...e, password: undefined })); }}
              secureTextEntry
              showToggle
              icon={<Lock size={18} color="#94a3b8" />}
            />
            {signupErrors.password ? <Text style={styles.fieldError}>{signupErrors.password}</Text> : null}
            {signupErrors.general ? <Text style={styles.fieldError}>{signupErrors.general}</Text> : null}
            <PrimaryButton onPress={handleSignupSubmit} disabled={!password || !name || !email || !phone || isLoading} loading={isLoading}>
              <Text style={styles.buttonText}>Sign up</Text>
              <ArrowRight size={18} color="#fff" />
            </PrimaryButton>
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setStep('entry')}>
              <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Already have an account? Login</Text>
            </TouchableOpacity>
          </ScrollView>
      );
    }

    if (step === 'verify_signup_otp') {
      return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.otpContainer}>
            <View style={styles.otpIconBg}>
              <Lock size={28} color="#15803d" />
            </View>
            <Text style={styles.otpTitle}>Verify your email</Text>
            <Text style={styles.otpSubtitle}>We've sent a 6-digit OTP to</Text>
            <Text style={styles.otpEmail}>{email}</Text>

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
            >
              <Text style={styles.buttonText}>Verify & create account</Text>
            </PrimaryButton>

            <TouchableOpacity
              style={styles.otpResendBtn}
              onPress={async () => {
                try {
                  setIsLoading(true);
                  await authService.sendSignupOtp(email);
                  Alert.alert('OTP resent', 'A new OTP has been sent to your email.');
                } catch { Alert.alert('Failed', 'Could not resend OTP.'); }
                finally { setIsLoading(false); }
              }}
            >
              <Text style={styles.otpResendText}>Didn't receive? Resend OTP</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('signup')} style={{ marginTop: 8 }}>
              <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 14, textAlign: 'center' }}>← Back to signup</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (step === 'demographics') {
      const isComplete = age && gender && maritalStatus && employment;

      return (
        <ScrollView style={{flex: 1, marginHorizontal: -24}} contentContainerStyle={styles.scrollStepContent} showsVerticalScrollIndicator={false}>
          <View style={styles.demoHeader}>
            <Text style={styles.demoTitle}>Personalize profile</Text>
            <Text style={styles.demoSubtitle}>Help us tailor the best eco-rewards directly for you.</Text>
          </View>

          <View style={styles.formCard}>
            
            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <CalendarDays size={18} color="#0f172a" />
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
                <User size={18} color="#0f172a" />
                <Text style={styles.fieldLabel}>Identity (gender)</Text>
              </View>
              <SelectionPills 
                options={['Male', 'Female', 'Other', 'Select Later']} 
                selected={gender} 
                onSelect={setGender} 
              />
            </View>

            <View style={styles.fieldDivider} />

            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <Heart size={18} color="#0f172a" />
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
                <Briefcase size={18} color="#0f172a" />
                <Text style={styles.fieldLabel}>Employment</Text>
              </View>
              <SelectionPills 
                options={['Student', 'Employed', 'Business', 'Unemployed']} 
                selected={employment} 
                onSelect={setEmployment} 
              />
            </View>

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
        </ScrollView>
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.rootContainer, { backgroundColor: step === 'demographics' ? '#f0fdf4' : '#ffffff' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, backgroundColor: '#064e3b' }} />

      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
          <KarmaCoin size={54} glow />
          <Text style={styles.headerTitle}>KarmaCoins XP</Text>
        </LinearGradient>

        <View style={[styles.body, step === 'demographics' && { paddingHorizontal: 0, paddingBottom: 0 }]}>
          {renderStep()}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#064e3b' },
  offlineBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12, marginBottom: 8 },
  offlineBannerText: { color: '#dc2626', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  fieldError: { color: '#dc2626', fontSize: 12, fontWeight: '600', marginTop: -16, paddingLeft: 4 },
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, backgroundColor: '#064e3b' },
  container: { flex: 1, backgroundColor: '#ffffff', maxWidth: 900, width: '100%', alignSelf: 'center' },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
  },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 12, letterSpacing: 0.5 },
  
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  
  stepContent: { gap: 24 },
  scrollStepContent: { paddingHorizontal: 24, paddingBottom: 50, gap: 16 },
  
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 20, fontWeight: '500' },
  successTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  successTagText: { fontSize: 12, color: '#16a34a', fontWeight: '800' },
  
  inputContainer: { position: 'relative', justifyContent: 'center' },
  iconWrapper: { position: 'absolute', left: 16, zIndex: 1 },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0f172a',
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
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
  dividerText: { marginHorizontal: 16, color: '#94a3b8', fontSize: 13, fontWeight: '700' },

  // Zomato Style Circular Social Login Buttons
  socialRow: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  socialIconBtnZomato: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  // Demographics Premium UI Redesign
  demoHeader: { alignItems: 'center', marginBottom: 12, marginTop: 10 },
  demoTitle: { fontSize: 28, fontWeight: '900', color: '#064e3b', textAlign: 'center' },
  demoSubtitle: { fontSize: 13, color: '#475569', textAlign: 'center', marginTop: 8, paddingHorizontal: 20, lineHeight: 20 },
  
  formCard: { 
    backgroundColor: 'white', 
    borderRadius: 24, 
    padding: 20, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    marginBottom: 20 
  },
  
  fieldSection: { marginVertical: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  fieldLabel: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  fieldDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 100, 
    backgroundColor: '#f8fafc', 
    borderWidth: 1.5, 
    borderColor: '#e2e8f0' 
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
  pillText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  pillTextActive: { color: 'white', fontWeight: '800' },
  readonlyEmailBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
  readonlyEmailText: { flex: 1, fontSize: 15, color: '#475569', fontWeight: '500' },

  // OTP Verification
  otpContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  otpIconBg: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: '#bbf7d0' },
  otpTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  otpSubtitle: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  otpEmail: { fontSize: 15, color: '#15803d', fontWeight: '800', marginBottom: 28 },
  otpBoxRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpBox: { width: 48, height: 56, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center', fontSize: 22, fontWeight: '900', color: '#0f172a' },
  otpBoxFilled: { borderColor: '#15803d', backgroundColor: '#f0fdf4' },
  otpResendBtn: { marginTop: 16 },
  otpResendText: { color: '#15803d', fontWeight: '700', fontSize: 14 },
});
