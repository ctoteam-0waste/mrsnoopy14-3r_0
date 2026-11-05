import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, Hash, Landmark, ShieldCheck, CheckCircle2, Coins } from 'lucide-react-native';
import { useTheme, makeStyles } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { KarmaCoin } from '../components/shared/KarmaCoin';
import { redeemService } from '../services/redeem';
import { profileService } from '../services/profile';
import { streakService } from '../services/streak';
import { showAlert } from '../utils/alert';
import { REDEEM_INFO_MESSAGE } from '../utils/redeemInfo';
import { trackEvent } from '../utils/analytics';
import { LedgerType, PICKUP_RATE, rupeesFor, formatRupees } from '../utils/streakTiers';
import { StatusBarFiller } from '../components/shared/StatusBarFiller';

const MIN_COINS = 10;
const QUICK_AMOUNTS = [10, 20, 50, 100];

const IFSC_REGEX = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;

export function RedeemScreen({ navigation, route }: any) {
  // Which wallet is being redeemed — 'pickup' (fixed 10:1) or 'reward' (streak tier rate).
  const ledger: LedgerType = route?.params?.ledger === 'reward' ? 'reward' : 'pickup';
  const isPickup = ledger === 'pickup';

  const styles = useStyles();
  const { colors } = useTheme();
  const [balance, setBalance] = useState<number>(route?.params?.balance || 0);
  // Rate = coins per ₹1. Pickup is always fixed; reward comes from the live streak tier.
  const [rate, setRate] = useState<number>(isPickup ? PICKUP_RATE : (route?.params?.rewardRate || 100));
  const [tier, setTier] = useState<string>(route?.params?.tier || '');
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [coinsInput, setCoinsInput] = useState('');

  useEffect(() => {
    trackEvent('reward_view', { reward_context: 'redeem', ledger });
  }, [ledger]);

  useEffect(() => {
    profileService.getProfile()
      .then((profile) => {
        const b = isPickup
          ? (profile.pickupCoins ?? 0)
          : (profile.rewardCoins ?? profile.coins ?? 0);
        setBalance(b);
      })
      .catch(() => {})
      .finally(() => setIsBalanceLoading(false));
    // Reward Wallet rate is live — always confirm it against /streak/status at submit time.
    if (!isPickup) {
      streakService.getStatus().then((s) => {
        if (s) { setRate(s.rewardRate); setTier(s.tier); }
      });
    }
  }, [isPickup]);

  const coinsToRedeem = parseInt(coinsInput, 10) || 0;
  const rupees = rupeesFor(coinsToRedeem, rate);

  const isFormValid =
    accountHolderName.trim().length >= 2 &&
    ACCOUNT_NUMBER_REGEX.test(accountNumber.trim()) &&
    IFSC_REGEX.test(ifscCode.trim()) &&
    branchName.trim().length >= 2 &&
    coinsToRedeem >= MIN_COINS &&
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
        ledger,
        coinsToRedeem,
      });
      // Amounts and wallet type only — never the account holder, account number, IFSC or branch.
      trackEvent('reward_redeemed', {
        redemption_type: 'bank_transfer',
        ledger,
        coins_redeemed: coinsToRedeem,
        value: Math.round(rupees * 100) / 100,
        currency: 'INR',
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
            <CheckCircle2 size={48} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Request submitted!</Text>
          <Text style={styles.successSub}>
            Your redeem request for {formatRupees(rupees)} is pending admin approval.
          </Text>
          <View style={styles.successInfoNote}>
            <Text style={styles.successInfoText}>{REDEEM_INFO_MESSAGE}</Text>
          </View>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.navigate('RedeemHistory')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionText}>View my requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
            <Text style={styles.secondaryActionText}>Back to wallet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#064e3b" />
      <StatusBarFiller color="#064e3b" />

      <LinearGradient colors={['#064e3b', '#15803d']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtnInner} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Redeem {isPickup ? 'pickup' : 'reward'} coins</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.balancePill}>
            <KarmaCoin size={22} />
            <Text style={styles.balanceText}>
              {isBalanceLoading ? '...' : balance.toLocaleString()} available
            </Text>
          </View>
          <Text style={styles.rateNote}>
            {isPickup
              ? `Fixed rate · ${PICKUP_RATE} coins = ₹1`
              : `${tier ? tier + ' tier · ' : ''}${rate} coins = ₹1`}
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Coins to redeem</Text>
            <View style={styles.inputWrapper}>
              <Coins size={18} color={colors.textFaint} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={coinsInput}
                onChangeText={(t) => setCoinsInput(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="e.g. 50"
                placeholderTextColor={colors.textFaint}
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
                style={[styles.quickChip, coinsToRedeem === balance && styles.quickChipActive]}
                onPress={() => setCoinsInput(String(balance))}
                disabled={balance < MIN_COINS}
              >
                <Text style={[styles.quickChipText, coinsToRedeem === balance && styles.quickChipTextActive]}>
                  Max
                </Text>
              </TouchableOpacity>
            </View>
            {coinsToRedeem > 0 && (
              <Text style={[styles.helperText, coinsToRedeem > balance && styles.helperTextError]}>
                {coinsToRedeem > balance
                  ? 'Not enough coins in this wallet'
                  : coinsToRedeem < MIN_COINS
                  ? `Minimum ${MIN_COINS} coins`
                  : `≈ ${formatRupees(rupees)} will be sent to your bank account`}
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Bank details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account holder name</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={colors.textFaint} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={accountHolderName}
                onChangeText={setAccountHolderName}
                placeholder="Full name as per bank account"
                placeholderTextColor={colors.textFaint}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank account number</Text>
            <View style={styles.inputWrapper}>
              <Hash size={18} color={colors.textFaint} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={accountNumber}
                onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="9-18 digit account number"
                placeholderTextColor={colors.textFaint}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>IFSC code</Text>
            <View style={styles.inputWrapper}>
              <ShieldCheck size={18} color={colors.textFaint} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={ifscCode}
                onChangeText={(t) => setIfscCode(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="e.g. SBIN0001234"
                placeholderTextColor={colors.textFaint}
                maxLength={11}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Branch name</Text>
            <View style={styles.inputWrapper}>
              <Landmark size={18} color={colors.textFaint} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={branchName}
                onChangeText={setBranchName}
                placeholder="e.g. MG Road Branch"
                placeholderTextColor={colors.textFaint}
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
              <ActivityIndicator color={colors.onPrimary} />
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

const useStyles = makeStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bg },
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
  rateNote: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 12, textAlign: 'center', marginTop: 8 },

  formContainer: { padding: 20, maxWidth: 800, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: c.text, marginTop: 8, marginBottom: 12 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 6, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: c.text, fontWeight: '600', height: '100%' },

  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface },
  quickChipActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
  quickChipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  quickChipTextActive: { color: c.primary },

  helperText: { fontSize: 12, color: c.primary, fontWeight: '600', marginTop: 8, marginLeft: 4 },
  helperTextError: { color: c.danger },

  primaryActionBtn: { backgroundColor: c.primary, paddingVertical: 15, paddingHorizontal: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', minWidth: 240, marginTop: 10, shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryActionBtnDisabled: { backgroundColor: c.textFaint, shadowOpacity: 0, elevation: 0 },
  primaryActionText: { color: c.onPrimary, fontSize: 16, fontWeight: '900' },
  securityNote: { textAlign: 'center', color: c.textFaint, fontSize: 11, fontWeight: '500', marginTop: 12, paddingHorizontal: 8 },

  secondaryActionBtn: { marginTop: 14, alignItems: 'center' },
  secondaryActionText: { color: c.textMuted, fontWeight: '700', fontSize: 13 },

  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  successIconBg: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: c.border },
  successTitle: { fontSize: 24, fontWeight: '900', color: c.text, marginBottom: 10 },
  successSub: { fontSize: 14, color: c.textMuted, textAlign: 'center', fontWeight: '500', lineHeight: 20, marginBottom: 16 },
  successInfoNote: { backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 28, maxWidth: 420 },
  successInfoText: { fontSize: 13, color: c.primary, textAlign: 'center', fontWeight: '700', lineHeight: 19 },
}));
