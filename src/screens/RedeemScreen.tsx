import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { ChevronLeft, User, Hash, Landmark, ShieldCheck, CheckCircle2, Coins } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { redeemService } from '../services/redeem';
import { profileService } from '../services/profile';
import { showAlert } from '../utils/alert';

const MIN_COINS = 10;
const QUICK_AMOUNTS = [10, 20, 50, 100];

const IFSC_REGEX = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

export function RedeemScreen({ navigation, route }: any) {
  const [balance, setBalance] = useState<number>(route?.params?.balance || 0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [coinsInput, setCoinsInput] = useState('');

  useEffect(() => {
    profileService.getProfile()
      .then((profile) => setBalance(profile.karmaCoins || profile.coins || 0))
      .catch(() => {})
      .finally(() => setIsBalanceLoading(false));
  }, []);

  const coinsToRedeem = parseInt(coinsInput, 10) || 0;
  const rupees = coinsToRedeem / 10;

  const isFormValid =
    accountHolderName.trim().length >= 2 &&
    ACCOUNT_NUMBER_REGEX.test(accountNumber.trim()) &&
    IFSC_REGEX.test(ifscCode.trim()) &&
    branchName.trim().length >= 2 &&
    coinsToRedeem >= MIN_COINS &&
    coinsToRedeem % 10 === 0 &&
    coinsToRedeem <= balance;

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await redeemService.create({
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        branchName: branchName.trim(),
        coinsToRedeem,
      });
      setBalance((prev) => prev - coinsToRedeem);
      setIsSuccess(true);
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      showAlert('Could not submit request', msg || 'Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
        <View style={styles.successScreen}>
          <View style={styles.successIconBg}>
            <CheckCircle2 size={48} color="#16a34a" />
          </View>
          <Text style={styles.successTitle}>Request submitted!</Text>
          <Text style={styles.successSub}>
            Your redeem request for ₹{rupees.toFixed(0)} is pending admin approval. We'll process the bank
            transfer soon.
          </Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.navigate('RedeemHistory')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionText}>View my requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryActionText}>Back to wallet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <View style={styles.topNotchFiller} />

      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtnInner} onPress={() => navigation.goBack()}>
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Redeem coins</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.balancePill}>
            <KarmaCoin size={22} />
            <Text style={styles.balanceText}>
              {isBalanceLoading ? '...' : balance.toLocaleString()} available
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Coins to redeem</Text>
            <View style={styles.inputWrapper}>
              <Coins size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={coinsInput}
                onChangeText={(t) => setCoinsInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="e.g. 50"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickChip, coinsToRedeem === amt && styles.quickChipActive]}
                  onPress={() => setCoinsInput(String(amt))}
                  disabled={amt > balance}
                >
                  <Text style={[styles.quickChipText, coinsToRedeem === amt && styles.quickChipTextActive]}>
                    {amt}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.quickChip, coinsToRedeem === balance - (balance % 10) && styles.quickChipActive]}
                onPress={() => setCoinsInput(String(balance - (balance % 10)))}
                disabled={balance < MIN_COINS}
              >
                <Text style={[styles.quickChipText, coinsToRedeem === balance - (balance % 10) && styles.quickChipTextActive]}>
                  Max
                </Text>
              </TouchableOpacity>
            </View>
            {coinsToRedeem > 0 && (
              <Text style={[styles.helperText, coinsToRedeem > balance && styles.helperTextError]}>
                {coinsToRedeem > balance
                  ? 'Not enough coins for this amount'
                  : coinsToRedeem % 10 !== 0
                  ? 'Enter a multiple of 10'
                  : `≈ ₹${rupees.toFixed(0)} will be sent to your bank account`}
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Bank details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account holder name</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                placeholder="Full name as per bank account"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank account number</Text>
            <View style={styles.inputWrapper}>
              <Hash size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="9-18 digit account number"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>IFSC code</Text>
            <View style={styles.inputWrapper}>
              <ShieldCheck size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={ifscCode}
                onChangeText={(t) => setIfscCode(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="e.g. SBIN0001234"
                placeholderTextColor="#94a3b8"
                maxLength={11}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Branch name</Text>
            <View style={styles.inputWrapper}>
              <Landmark size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={branchName}
                onChangeText={setBranchName}
                placeholder="e.g. MG Road Branch"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryActionBtn, (!isFormValid || isSubmitting) && styles.primaryActionBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryActionText}>Submit request</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.securityNote}>
            Coins are deducted immediately. An admin verifies your details and transfers the amount to your
            bank account — this usually isn't instant.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  topNotchFiller: { position: 'absolute', top: 0, left: 0, right: 0, height: 60, backgroundColor: '#064e3b' },
  scroll: { flex: 1 },

  header: { paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, maxWidth: 800, width: '100%', alignSelf: 'center' },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white', textAlign: 'center' },

  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16,
  },
  balanceText: { color: 'white', fontWeight: '800', fontSize: 13 },

  formContainer: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 8, marginBottom: 12 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#0f172a', fontWeight: '600', height: '100%' },

  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: 'white' },
  quickChipActive: { borderColor: '#15803d', backgroundColor: '#f0fdf4' },
  quickChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  quickChipTextActive: { color: '#15803d' },

  helperText: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginTop: 8, marginLeft: 4 },
  helperTextError: { color: '#dc2626' },

  primaryActionBtn: { backgroundColor: '#15803d', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryActionBtnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0, elevation: 0 },
  primaryActionText: { color: 'white', fontSize: 16, fontWeight: '900' },
  securityNote: { textAlign: 'center', color: '#94a3b8', fontSize: 11, fontWeight: '500', marginTop: 12, paddingHorizontal: 8 },

  secondaryActionBtn: { marginTop: 14, alignItems: 'center' },
  secondaryActionText: { color: '#64748b', fontWeight: '700', fontSize: 13 },

  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  successIconBg: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: '#bbf7d0' },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 10 },
  successSub: { fontSize: 14, color: '#64748b', textAlign: 'center', fontWeight: '500', lineHeight: 20, marginBottom: 28 },
});
